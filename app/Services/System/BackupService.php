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
}
