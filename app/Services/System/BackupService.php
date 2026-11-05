<?php

namespace App\Services\System;

use App\Models\SystemBackup;
use App\Services\Security\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class BackupService
{
    /**
     * Get the private backup directory path (strictly outside public web root).
     */
    public static function getBackupDirectory(): string
    {
        $path = storage_path('app/backups');
        if (!File::exists($path)) {
            File::makeDirectory($path, 0750, true);
        }
        return $path;
    }

    /**
     * Create a verified database and metadata backup.
     */
    public static function createBackup(string $type = 'database', ?string $notes = null, ?int $userId = null): SystemBackup
    {
        $backupId = 'BKP-' . date('Ymd-His') . '-' . strtoupper(Str::random(6));
        $filename = "siuba_backup_{$backupId}.json";
        $dir = self::getBackupDirectory();
        $fullPath = $dir . DIRECTORY_SEPARATOR . $filename;

        $backupRecord = SystemBackup::create([
            'backup_id' => $backupId,
            'filename' => $filename,
            'path' => $fullPath,
            'type' => $type,
            'size' => 0,
            'checksum' => null,
            'status' => 'running',
            'started_at' => now(),
            'created_by' => $userId ?? auth()->id(),
            'notes' => $notes,
        ]);

        try {
            // Collect core SIUBA table states
            $tables = [
                'users',
                'classrooms',
                'dormitories',
                'dormitory_rooms',
                'students',
                'activity_categories',
                'activities',
                'activity_schedules',
                'attendance_devices',
                'attendance_sessions',
                'attendance_session_participants',
                'attendance_records',
                'attendance_record_histories',
                'academic_years',
                'semesters',
                'subjects',
                'lesson_periods',
                'academic_schedules',
                'academic_session_contexts',
                'academic_substitutions',
                'halaqahs',
                'halaqah_members',
                'extracurriculars',
                'extracurricular_members',
                'events',
                'event_sessions',
                'event_registrations',
                'duty_rosters',
                'audit_logs',
            ];

            $dumpData = [
                'manifest' => [
                    'backup_id' => $backupId,
                    'app_name' => config('app.name', 'SIUBA'),
                    'app_version' => '1.4.0',
                    'created_at' => now()->toISOString(),
                    'type' => $type,
                    'environment' => config('app.env'),
                ],
                'tables' => [],
            ];

            foreach ($tables as $table) {
                if (SchemaHasTable($table)) {
                    $dumpData['tables'][$table] = DB::table($table)->get()->toArray();
                }
            }

            $jsonContent = json_encode($dumpData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            File::put($fullPath, $jsonContent);

            $size = File::size($fullPath);
            $checksum = hash_file('sha256', $fullPath);

            // Verification check
            if ($size > 0 && !empty($checksum)) {
                $backupRecord->update([
                    'size' => $size,
                    'checksum' => $checksum,
                    'status' => 'verified',
                    'completed_at' => now(),
                ]);

                AuditService::log(
                    event: 'backup_created',
                    auditableType: SystemBackup::class,
                    auditableId: $backupRecord->id,
                    newValues: ['backup_id' => $backupId, 'size' => $size, 'checksum' => $checksum, 'type' => $type],
                    reason: $notes ?? 'Automated / Manual System Backup',
                    userId: $userId
                );
            } else {
                throw new \Exception('Backup file generated is empty or checksum verification failed.');
            }

            // Enforce retention policy
            self::enforceRetention();

            return $backupRecord;
        } catch (\Throwable $e) {
            $backupRecord->update([
                'status' => 'failed',
                'notes' => ($notes ? $notes . ' | Error: ' : 'Error: ') . $e->getMessage(),
                'completed_at' => now(),
            ]);

            AuditService::log(
                event: 'backup_failed',
                auditableType: SystemBackup::class,
                auditableId: $backupRecord->id,
                reason: $e->getMessage(),
                userId: $userId
            );

            throw $e;
        }
    }

    /**
     * Verify the physical backup file on disk against database checksum.
     */
    public static function verifyBackup(SystemBackup $backup): bool
    {
        if (!File::exists($backup->path)) {
            return false;
        }
        $actualChecksum = hash_file('sha256', $backup->path);
        return hash_equals($backup->checksum ?? '', $actualChecksum);
    }

    /**
     * Enforce maximum retention (keep 10 latest successful backups, purge older disk files).
     */
    public static function enforceRetention(int $keepCount = 10): void
    {
        $oldBackups = SystemBackup::where('status', 'verified')
            ->orderByDesc('created_at')
            ->skip($keepCount)
            ->take(50)
            ->get();

        foreach ($oldBackups as $old) {
            if (File::exists($old->path)) {
                File::delete($old->path);
            }
            $old->delete();
        }
    }
}

function SchemaHasTable(string $table): bool {
    try {
        return \Illuminate\Support\Facades\Schema::hasTable($table);
    } catch (\Throwable) {
        return false;
    }
}
