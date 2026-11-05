<?php

namespace App\Services\System;

use App\Models\SystemBackup;
use App\Services\Security\AuditService;
use App\Services\Security\DataIntegrityAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class RestoreService
{
    /**
     * Restore database from a verified SystemBackup instance.
     */
    public static function restoreFromBackup(SystemBackup $backup, ?string $reason = null, ?int $userId = null): array
    {
        // 1. Verify backup existence & checksum
        if (!File::exists($backup->path)) {
            throw new \Exception("File backup tidak ditemukan pada lokasi disk: {$backup->path}");
        }

        $currentChecksum = hash_file('sha256', $backup->path);
        if (!hash_equals($backup->checksum ?? '', $currentChecksum)) {
            throw new \Exception("Checksum mismatch! File backup corrupt atau telah dimodifikasi.");
        }

        $content = File::get($backup->path);
        $data = json_decode($content, true);

        if (!$data || !isset($data['manifest']) || !isset($data['tables'])) {
            throw new \Exception("Format file backup tidak valid atau rusak.");
        }

        // 2. Create safety pre-restore backup
        $safetyBackup = BackupService::createBackup(
            type: 'database',
            notes: 'Pre-Restore Safety Snapshot sebelum me-restore ' . $backup->backup_id,
            userId: $userId
        );

        AuditService::log(
            event: 'restore_started',
            auditableType: SystemBackup::class,
            auditableId: $backup->id,
            newValues: ['target_backup_id' => $backup->backup_id, 'safety_backup_id' => $safetyBackup->backup_id],
            reason: $reason ?? 'System Disaster Recovery / Database Restoration',
            userId: $userId
        );

        // 3. Execute DB Restoration inside Transaction
        DB::beginTransaction();
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            foreach ($data['tables'] as $tableName => $rows) {
                if (SchemaHasTable($tableName)) {
                    DB::table($tableName)->truncate();
                    if (!empty($rows)) {
                        // Chunk inserts to prevent memory overflow
                        $chunks = array_chunk($rows, 200);
                        foreach ($chunks as $chunk) {
                            $insertData = array_map(function ($item) {
                                return (array) $item;
                            }, $chunk);
                            DB::table($tableName)->insert($insertData);
                        }
                    }
                }
            }

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            DB::commit();

            // 4. Run Post-Restore Integrity Audit
            $integrityResult = DataIntegrityAuditService::runFullAudit();

            AuditService::log(
                event: 'restore_completed',
                auditableType: SystemBackup::class,
                auditableId: $backup->id,
                newValues: [
                    'target_backup_id' => $backup->backup_id,
                    'integrity_status' => $integrityResult['status'],
                    'critical_issues' => $integrityResult['critical_count'],
                ],
                reason: 'Database restore executed and verified successfully.',
                userId: $userId
            );

            return [
                'success' => true,
                'backup_id' => $backup->backup_id,
                'safety_backup_id' => $safetyBackup->backup_id,
                'integrity_result' => $integrityResult,
                'restored_at' => now()->toISOString(),
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            AuditService::log(
                event: 'restore_failed',
                auditableType: SystemBackup::class,
                auditableId: $backup->id,
                reason: $e->getMessage(),
                userId: $userId
            );

            throw $e;
        }
    }
}
