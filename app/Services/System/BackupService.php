<?php

namespace App\Services\System;

use App\Models\SystemBackup;
use App\Services\Security\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Backup SELURUH tabel data aplikasi ke satu berkas .ndjson.gz (satu baris JSON per record, dibaca/ditulis bertahap
 * agar hemat memori). Sebelumnya hanya ±29 tabel tertentu yang dicadangkan (data SDM, hak akses, CMS, pengaturan,
 * ekskul/pembina baru, dll. tidak ikut) dan seluruh tabel dimuat ke memori sekaligus.
 */
class BackupService
{
    public const FORMAT = 'siuba-ndjson-v2';

    /** Tabel sistem yang tidak dicadangkan / tidak dipulihkan. */
    public const EXCLUDED_TABLES = [
        'migrations', 'cache', 'cache_locks', 'sessions', 'jobs', 'job_batches', 'failed_jobs',
        'personal_access_tokens', 'password_reset_tokens', 'system_backups',
    ];

    public static function getBackupDirectory(): string
    {
        $path = storage_path('app/backups');
        if (!File::exists($path)) {
            File::makeDirectory($path, 0750, true);
        }

        return $path;
    }

    /** Lokasi berkas berdasarkan nama berkas (aman bila folder aplikasi dipindah). */
    public static function pathFor(SystemBackup $backup): string
    {
        return self::getBackupDirectory() . DIRECTORY_SEPARATOR . basename($backup->filename);
    }

    /** @return string[] */
    public static function dataTables(): array
    {
        // Di MySQL/MariaDB getTables() juga mengembalikan tabel database LAIN di server yang sama: batasi ke database aplikasi
        $driver = DB::connection()->getDriverName();
        $schema = in_array($driver, ['mysql', 'mariadb'], true) ? DB::connection()->getDatabaseName() : null;
        $tables = [];
        foreach (Schema::getTables() as $t) {
            if (is_array($t) && $schema !== null && isset($t['schema']) && $t['schema'] !== $schema) {
                continue;
            }
            $tables[] = is_array($t) ? $t['name'] : $t;
        }
        $tables = array_unique($tables);
        $tables = array_values(array_filter($tables, fn ($t) => !in_array($t, self::EXCLUDED_TABLES, true) && !str_starts_with($t, 'sqlite_')));
        sort($tables);

        return $tables;
    }

    public static function createBackup(string $type = 'database', ?string $notes = null, ?int $userId = null): SystemBackup
    {
        $backupId = 'BKP-' . date('Ymd-His') . '-' . strtoupper(Str::random(4));
        $filename = "siuba_backup_{$backupId}.ndjson.gz";
        $fullPath = self::getBackupDirectory() . DIRECTORY_SEPARATOR . $filename;

        $record = SystemBackup::create([
            'backup_id' => $backupId, 'filename' => $filename, 'path' => $fullPath, 'type' => 'database',
            'size' => 0, 'checksum' => null, 'status' => 'running', 'started_at' => now(),
            'created_by' => $userId ?? auth()->id(), 'notes' => $notes,
        ]);

        try {
            $gz = gzopen($fullPath, 'wb6');
            if ($gz === false) {
                throw new \RuntimeException('Tidak bisa menulis berkas backup di ' . $fullPath);
            }
            $tables = self::dataTables();
            $counts = [];
            gzwrite($gz, json_encode(['manifest' => [
                'format' => self::FORMAT, 'backup_id' => $backupId, 'app_name' => config('app.name', 'SIUBA'),
                'created_at' => now()->toIso8601String(), 'db_driver' => DB::connection()->getDriverName(),
                'last_migration' => DB::table('migrations')->max('migration'), 'tables' => $tables,
            ]], JSON_UNESCAPED_UNICODE) . "\n");

            foreach ($tables as $table) {
                $counts[$table] = 0;
                $write = function ($row) use ($gz, $table, &$counts) {
                    gzwrite($gz, json_encode(['t' => $table, 'r' => (array) $row], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) . "\n");
                    $counts[$table]++;
                };
                if (Schema::hasColumn($table, 'id')) {
                    DB::table($table)->orderBy('id')->chunk(1000, fn ($rows) => $rows->each($write));
                } else {
                    DB::table($table)->get()->each($write); // tabel penghubung (kecil)
                }
            }
            gzwrite($gz, json_encode(['end' => ['rows' => array_sum($counts), 'counts' => $counts]]) . "\n");
            gzclose($gz);

            $size = File::size($fullPath);
            $checksum = hash_file('sha256', $fullPath);
            $record->update([
                'size' => $size, 'checksum' => $checksum, 'status' => 'verified', 'completed_at' => now(),
                'notes' => trim(($notes ? $notes . ' • ' : '') . count($tables) . ' tabel, ' . array_sum($counts) . ' baris'),
            ]);
            AuditService::log(
                event: 'backup_created', auditableType: SystemBackup::class, auditableId: $record->id,
                newValues: ['backup_id' => $backupId, 'size' => $size, 'tables' => count($tables), 'rows' => array_sum($counts)],
                reason: $notes ?? 'Backup sistem', userId: $userId
            );
            self::enforceRetention();

            return $record;
        } catch (\Throwable $e) {
            if (File::exists($fullPath)) {
                File::delete($fullPath);
            }
            $record->update(['status' => 'failed', 'notes' => ($notes ? $notes . ' | ' : '') . 'Error: ' . $e->getMessage(), 'completed_at' => now()]);
            AuditService::log(event: 'backup_failed', auditableType: SystemBackup::class, auditableId: $record->id, reason: $e->getMessage(), userId: $userId);

            throw $e;
        }
    }

    public static function verifyBackup(SystemBackup $backup): bool
    {
        $path = self::pathFor($backup);

        return File::exists($path) && hash_equals($backup->checksum ?? '', hash_file('sha256', $path));
    }

    /** Simpan backup terverifikasi terbaru sebanyak $keepCount (bawaan 14 ≈ dua minggu backup harian). */
    public static function enforceRetention(int $keepCount = 14): void
    {
        SystemBackup::where('status', 'verified')->orderByDesc('created_at')->orderByDesc('id')->skip($keepCount)->take(100)->get()
            ->each(function (SystemBackup $old) {
                File::delete(self::pathFor($old));
                $old->delete();
            });
        // Catatan backup gagal yang lama dibersihkan
        SystemBackup::where('status', 'failed')->where('created_at', '<', now()->subDays(30))->delete();
    }

    /**
     * Uji kelayakan pulih tanpa mengubah database: checksum, berkas bisa dibaca utuh, jumlah baris sesuai
     * catatan akhir, dan kecocokan tabel/migrasi dengan aplikasi sekarang.
     *
     * @return array<string, mixed>
     */
    public static function inspectBackup(SystemBackup $backup): array
    {
        $path = self::pathFor($backup);
        $r = [
            'backup_id' => $backup->backup_id, 'file_exists' => File::exists($path), 'checksum_ok' => false,
            'format_ok' => false, 'complete' => false, 'rows' => 0, 'tables' => 0, 'counts' => [],
            'created_at' => null, 'last_migration' => null, 'current_migration' => DB::table('migrations')->max('migration'),
            'missing_tables' => [], 'new_tables' => [], 'problems' => [], 'warnings' => [], 'ok' => false,
        ];
        if (!$r['file_exists']) {
            $r['problems'][] = 'Berkas backup tidak ada di folder storage/app/backups.';
            return $r;
        }
        $r['checksum_ok'] = self::verifyBackup($backup);
        if (!$r['checksum_ok']) {
            $r['problems'][] = 'Checksum SHA-256 tidak cocok: berkas rusak atau telah diubah.';
        }

        $gz = @gzopen($path, 'rb');
        if ($gz === false) {
            $r['problems'][] = 'Berkas tidak bisa dibuka sebagai arsip gzip.';
            return $r;
        }
        $first = json_decode((string) gzgets($gz, 1 << 20), true);
        $manifest = $first['manifest'] ?? null;
        $r['format_ok'] = ($manifest['format'] ?? null) === self::FORMAT;
        if (!$r['format_ok']) {
            gzclose($gz);
            $r['problems'][] = 'Format backup tidak dikenali (backup versi lama tidak bisa dipulihkan otomatis).';
            return $r;
        }
        $r['created_at'] = $manifest['created_at'] ?? null;
        $r['last_migration'] = $manifest['last_migration'] ?? null;

        $counts = [];
        $end = null;
        $bad = 0;
        while (!gzeof($gz)) {
            $line = gzgets($gz, 1 << 24);
            if ($line === false || trim($line) === '') {
                continue;
            }
            $row = json_decode($line, true);
            if (!is_array($row)) {
                $bad++;
                continue;
            }
            if (isset($row['end'])) {
                $end = $row['end'];
                continue;
            }
            if (isset($row['t'])) {
                $counts[$row['t']] = ($counts[$row['t']] ?? 0) + 1;
            }
        }
        gzclose($gz);

        $r['rows'] = array_sum($counts);
        $r['tables'] = count($manifest['tables'] ?? []);
        arsort($counts);
        $r['counts'] = array_slice($counts, 0, 8, true);
        $r['complete'] = $end !== null && (int) ($end['rows'] ?? -1) === $r['rows'] && $bad === 0;
        if (!$r['complete']) {
            $r['problems'][] = $end === null
                ? 'Berkas terpotong: penanda akhir backup tidak ditemukan.'
                : "Jumlah baris tidak sesuai catatan backup ({$r['rows']} dibaca, " . (int) ($end['rows'] ?? 0) . " tercatat" . ($bad ? ", {$bad} baris rusak" : '') . ').';
        }

        $current = self::dataTables();
        $r['missing_tables'] = array_values(array_diff($manifest['tables'] ?? [], $current));
        $r['new_tables'] = array_values(array_diff($current, $manifest['tables'] ?? []));
        if ($r['new_tables']) {
            $r['warnings'][] = count($r['new_tables']) . ' tabel baru belum ada saat backup dibuat; tabel itu tidak disentuh saat pemulihan.';
        }
        if ($r['missing_tables']) {
            $r['warnings'][] = count($r['missing_tables']) . ' tabel di backup sudah tidak dipakai aplikasi dan akan dilewati.';
        }
        if ($r['last_migration'] && $r['current_migration'] && $r['last_migration'] !== $r['current_migration']) {
            $r['warnings'][] = $r['last_migration'] < $r['current_migration']
                ? 'Backup dibuat sebelum update terakhir; setelah dipulihkan jalankan "php artisan migrate --force".'
                : 'Backup berasal dari versi aplikasi yang lebih baru dari yang terpasang sekarang.';
        }
        $r['ok'] = $r['checksum_ok'] && $r['format_ok'] && $r['complete'];

        return $r;
    }
}
