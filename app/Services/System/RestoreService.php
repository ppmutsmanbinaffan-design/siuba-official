<?php

namespace App\Services\System;

use App\Models\SystemBackup;
use App\Services\Security\AuditService;
use App\Services\Security\DataIntegrityAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Pulihkan database dari backup BackupService.
 * - Backup pengaman dibuat dulu.
 * - Semua tabel data dikosongkan dengan DELETE (bisa di-rollback; TRUNCATE di MySQL langsung commit sehingga
 *   versi lama tidak benar-benar bisa dibatalkan bila restore gagal di tengah jalan).
 * - Hanya kolom yang masih ada di skema sekarang yang diisi (backup lama tetap bisa dipulihkan setelah update).
 */
class RestoreService
{
    public static function restoreFromBackup(SystemBackup $backup, ?string $reason = null, ?int $userId = null): array
    {
        $path = BackupService::pathFor($backup);
        if (!File::exists($path)) {
            throw new \RuntimeException('Berkas backup tidak ditemukan di folder storage/app/backups.');
        }
        if (!BackupService::verifyBackup($backup)) {
            throw new \RuntimeException('Checksum tidak cocok: berkas backup rusak atau telah diubah.');
        }

        $gz = gzopen($path, 'rb');
        $first = json_decode((string) gzgets($gz, 1 << 20), true);
        if (($first['manifest']['format'] ?? null) !== BackupService::FORMAT) {
            gzclose($gz);
            throw new \RuntimeException('Format backup tidak dikenali (backup versi lama berformat JSON tidak bisa dipulihkan otomatis).');
        }

        $safety = BackupService::createBackup('database', 'Backup pengaman otomatis sebelum restore ' . $backup->backup_id, $userId);
        AuditService::log(
            event: 'restore_started', auditableType: SystemBackup::class, auditableId: $backup->id,
            newValues: ['target_backup_id' => $backup->backup_id, 'safety_backup_id' => $safety->backup_id],
            reason: $reason ?? 'Pemulihan database', userId: $userId
        );

        $current = BackupService::dataTables();
        $backupTables = array_values(array_intersect($first['manifest']['tables'] ?? [], $current));
        $columns = [];
        foreach ($backupTables as $t) {
            $columns[$t] = array_flip(Schema::getColumnListing($t));
        }
        $restored = [];

        Schema::disableForeignKeyConstraints(); // harus di luar transaksi (SQLite)
        DB::beginTransaction();
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement('PRAGMA defer_foreign_keys = ON'); // berlaku juga bila sudah di dalam transaksi
        }
        try {
            foreach ($backupTables as $t) {
                DB::table($t)->delete();
            }
            $buffer = [];
            $flush = function () use (&$buffer, &$restored) {
                foreach ($buffer as $t => $rows) {
                    foreach (array_chunk($rows, 200) as $chunk) {
                        DB::table($t)->insert($chunk);
                    }
                    $restored[$t] = ($restored[$t] ?? 0) + count($rows);
                }
                $buffer = [];
            };
            $n = 0;
            while (!gzeof($gz)) {
                $line = gzgets($gz, 16 << 20);
                if ($line === false || trim($line) === '') continue;
                $item = json_decode($line, true);
                if (!isset($item['t'], $item['r']) || !isset($columns[$item['t']])) continue;
                $buffer[$item['t']][] = array_intersect_key($item['r'], $columns[$item['t']]);
                if (++$n % 1000 === 0) $flush();
            }
            $flush();
            gzclose($gz);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            @gzclose($gz);
            Schema::enableForeignKeyConstraints();
            AuditService::log(event: 'restore_failed', auditableType: SystemBackup::class, auditableId: $backup->id, reason: $e->getMessage(), userId: $userId);

            throw $e;
        }
        Schema::enableForeignKeyConstraints();
        \Illuminate\Support\Facades\Cache::flush();

        try {
            $integrity = DataIntegrityAuditService::runFullAudit();
        } catch (\Throwable $e) {
            $integrity = ['status' => 'UNKNOWN', 'critical_count' => 0, 'error' => $e->getMessage()];
        }
        AuditService::log(
            event: 'restore_completed', auditableType: SystemBackup::class, auditableId: $backup->id,
            newValues: ['target_backup_id' => $backup->backup_id, 'rows' => array_sum($restored), 'integrity_status' => $integrity['status']],
            reason: 'Database berhasil dipulihkan.', userId: $userId
        );

        return [
            'success' => true, 'backup_id' => $backup->backup_id, 'safety_backup_id' => $safety->backup_id,
            'tables' => count($restored), 'rows' => array_sum($restored), 'integrity_result' => $integrity,
            'restored_at' => now()->toIso8601String(),
        ];
    }
}
