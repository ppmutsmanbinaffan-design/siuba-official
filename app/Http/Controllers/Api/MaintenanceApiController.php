<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use App\Models\AuditLog;
use App\Models\SystemBackup;
use App\Services\Security\AuditService;
use App\Services\Security\DataIntegrityAuditService;
use App\Services\System\BackupService;
use App\Services\System\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Maintenance Hub: status, integritas, log, dan reset database — semuanya dari/ke server.
 * Sebelumnya halaman ini menghitung & "mereset" data browser saja.
 */
class MaintenanceApiController extends Controller
{
    /** Data transaksi harian (Mode A). */
    private const OPERATIONAL_TABLES = [
        'attendance_record_histories', 'attendance_records', 'attendance_session_participants',
        'event_attendance_session_contexts', 'academic_substitutions', 'academic_session_contexts', 'attendance_sessions',
        'attendance_device_logs', 'staff_attendance_histories', 'staff_attendance_records', 'staff_absence_requests',
        'training_sessions', 'trainer_substitutions', 'student_excusals', 'duty_rosters', 'event_registrations',
        'offline_sync_batches', 'offline_sync_items', 'sync_conflicts',
    ];

    /** Data master (Mode B, ditambah data transaksi). Akun, hak akses, pengaturan, CMS tetap. */
    private const MASTER_TABLES = [
        'student_group_members', 'student_groups', 'halaqah_members', 'halaqahs', 'extracurricular_members',
        'extracurricular_staff_assignments', 'extracurricular_schedules', 'extracurriculars',
        'event_sessions', 'event_organizers', 'events', 'activity_participant_rules', 'activity_supervisors',
        'routine_schedule_overrides', 'activity_schedules', 'activities', 'academic_schedules', 'teaching_assignments',
        'students', 'dormitory_rooms', 'dormitories', 'classrooms', 'staff_profiles',
    ];

    private const LABELS = [
        'students' => 'Santri', 'staff_profiles' => 'SDM / Guru / Pelatih', 'users' => 'Akun pengguna',
        'attendance_records' => 'Presensi santri', 'attendance_sessions' => 'Sesi absensi',
        'staff_attendance_records' => 'Presensi SDM', 'academic_session_contexts' => 'Sesi KBM',
        'training_sessions' => 'Sesi latihan ekskul', 'student_excusals' => 'Izin santri', 'staff_absence_requests' => 'Izin SDM',
        'attendance_record_histories' => 'Riwayat koreksi presensi', 'attendance_device_logs' => 'Log perangkat',
        'classrooms' => 'Kelas', 'dormitories' => 'Gedung asrama', 'dormitory_rooms' => 'Kamar', 'activities' => 'Kegiatan',
        'activity_schedules' => 'Jadwal rutin', 'academic_schedules' => 'Jadwal pelajaran', 'extracurriculars' => 'Ekstrakurikuler',
        'halaqahs' => 'Halaqah', 'student_groups' => 'Kelompok santri', 'events' => 'Event', 'attendance_devices' => 'Perangkat',
        'duty_rosters' => 'Jadwal piket', 'event_registrations' => 'Pendaftaran event',
    ];

    private function count(string $t): int
    {
        return Schema::hasTable($t) ? (int) DB::table($t)->count() : 0;
    }

    private function allowReset(): bool
    {
        return (bool) config('siuba.allow_database_reset', true);
    }

    // ================================================================== Status

    public function overview(): JsonResponse
    {
        $counts = [];
        foreach (array_keys(self::LABELS) as $t) {
            $counts[$t] = $this->count($t);
        }
        $driver = DB::connection()->getDriverName();
        $size = null;
        try {
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                $size = (int) DB::selectOne('select sum(data_length + index_length) as s from information_schema.tables where table_schema = ?', [DB::connection()->getDatabaseName()])->s;
            } elseif ($driver === 'sqlite' && is_file(DB::connection()->getDatabaseName())) {
                $size = filesize(DB::connection()->getDatabaseName());
            }
        } catch (\Throwable) {
        }
        $last = SystemBackup::where('status', 'verified')->latest('created_at')->first();

        return response()->json(['success' => true, 'data' => [
            'counts' => $counts,
            'labels' => self::LABELS,
            'db_size_bytes' => $size,
            'health' => SystemHealthService::getHealthReport(),
            'config' => ['app_env' => config('app.env'), 'allow_database_reset' => $this->allowReset(), 'maintenance_mode' => app()->isDownForMaintenance()],
            'last_backup' => $last ? ['backup_id' => $last->backup_id, 'created_at' => $last->created_at?->toIso8601String(), 'size' => (int) $last->size, 'notes' => $last->notes] : null,
            'last_integrity' => AppSetting::get('last_integrity_result'),
        ]]);
    }

    // ================================================================== Integritas

    public function integrity(Request $request): JsonResponse
    {
        $t0 = microtime(true);
        $r = DataIntegrityAuditService::runFullAudit();
        $issues = array_map(fn ($i, $k) => [
            'id' => 'ISS-' . ($k + 1),
            'code' => strtoupper($i['type']),
            'severity' => $i['severity'],
            'domain' => $i['entity_type'] ?? 'umum',
            'title' => ucfirst(str_replace('_', ' ', $i['type'])),
            'description' => $i['description'],
            'affected_entity_type' => $i['entity_type'] ?? '-',
            'affected_entity_id' => (string) (collect($i['context'] ?? [])->first() ?? '-'),
            'affected_entity_label' => json_encode($i['context'] ?? [], JSON_UNESCAPED_UNICODE),
            'detected_at' => now()->toIso8601String(),
            'suggested_fix' => $i['action_needed'] ?? 'Periksa data terkait.',
            'can_auto_repair' => false,
        ], $r['issues'], array_keys($r['issues']));
        $checks = 7;
        $result = [
            'scan_id' => 'SCAN-' . now()->format('YmdHis'),
            'scanned_at' => now()->toIso8601String(),
            'duration_ms' => (int) round((microtime(true) - $t0) * 1000),
            'total_checks_run' => $checks,
            'passed_checks_count' => max(0, $checks - count(array_unique(array_column($r['issues'], 'type')))),
            'issues_count' => count($issues),
            'critical_count' => $r['critical_count'], 'warning_count' => $r['warning_count'], 'info_count' => $r['info_count'],
            'health_score_percent' => max(0, 100 - $r['critical_count'] * 15 - $r['warning_count'] * 5 - $r['info_count']),
            'issues' => array_slice($issues, 0, 500),
        ];
        AppSetting::put('last_integrity_result', $result, $request->user()?->id);
        AuditService::log(event: 'integrity_check', newValues: ['status' => $r['status'], 'issues' => count($issues)], reason: 'Pemeriksaan integritas data', userId: $request->user()?->id);

        return response()->json(['success' => true, 'data' => $result]);
    }

    // ================================================================== Log

    public function logs(): JsonResponse
    {
        $map = [
            'backup_created' => ['Backup database dibuat', 'SUCCESS'], 'backup_failed' => ['Backup database gagal', 'FAILED'],
            'restore_started' => ['Pemulihan database dimulai', 'INFO'], 'restore_completed' => ['Database dipulihkan', 'SUCCESS'],
            'restore_failed' => ['Pemulihan database gagal', 'FAILED'], 'database_reset' => ['Reset database', 'SUCCESS'],
            'database_reset_failed' => ['Reset database gagal', 'FAILED'], 'integrity_check' => ['Pemeriksaan integritas', 'INFO'],
        ];
        $rows = AuditLog::with('user')->orderByDesc('created_at')->orderByDesc('id')->limit(300)->get()->map(function ($l) use ($map) {
            [$title, $status] = $map[$l->event] ?? [ucfirst(str_replace('_', ' ', $l->event)), 'INFO'];

            return [
                'id' => 'LOG-' . $l->id,
                'event_type' => $l->event,
                'event_title' => $title,
                'actor_name' => $l->user?->name ?? 'Sistem',
                'actor_role' => $l->user?->getRoleNames()->first() ?? '-',
                'timestamp' => $l->created_at?->toIso8601String(),
                'status' => $status,
                'operation_id' => 'AUD-' . $l->id,
                'summary' => $l->reason ?: (is_array($l->new_values) ? json_encode($l->new_values, JSON_UNESCAPED_UNICODE) : ''),
                'details' => $l->new_values,
                'ip_address' => $l->ip_address,
            ];
        });

        return response()->json(['success' => true, 'data' => $rows]);
    }

    // ================================================================== Reset

    public function resetModes(): JsonResponse
    {
        $op = collect(self::OPERATIONAL_TABLES)->mapWithKeys(fn ($t) => [$t => $this->count($t)])->filter();
        $ms = collect(self::MASTER_TABLES)->mapWithKeys(fn ($t) => [$t => $this->count($t)])->filter();
        $label = fn ($t) => self::LABELS[$t] ?? str_replace('_', ' ', $t);

        return response()->json(['success' => true, 'data' => [
            'allow_database_reset' => $this->allowReset(),
            'MODE_A_OPERATIONAL' => $op->map(fn ($n, $t) => ['name' => $label($t), 'count' => $n, 'category' => 'Operasional'])->values(),
            'MODE_B_MASTERS_EXCEPT_CORE' => $op->merge($ms)->map(fn ($n, $t) => ['name' => $label($t), 'count' => $n, 'category' => isset($ms[$t]) ? 'Master' : 'Operasional'])->values(),
            'MODE_C_FACTORY_RESET' => [['name' => 'Seluruh tabel (termasuk akun & pengaturan)', 'count' => collect(BackupService::dataTables())->sum(fn ($t) => $this->count($t)), 'category' => 'Semua']],
        ]]);
    }

    public function reset(Request $request): JsonResponse
    {
        $mode = (string) $request->input('mode', 'MODE_A_OPERATIONAL');
        $phrase = trim((string) $request->input('confirmation_phrase', ''));

        if (!$this->allowReset()) {
            return ApiResponse::error('RESET_DISABLED', 'Reset database dinonaktifkan di server (SIUBA_ALLOW_DATABASE_RESET=false).', null, 403);
        }
        if (strtoupper($phrase) !== 'RESET DATABASE SIUBA') {
            return ApiResponse::error('CONFIRMATION_MISMATCH', 'Frasa konfirmasi tidak valid. Harap masukkan "RESET DATABASE SIUBA".', null, 422);
        }
        if (!Hash::check((string) $request->input('password', ''), (string) $request->user()?->password)) {
            return ApiResponse::error('INVALID_PASSWORD', 'Kata sandi Anda salah.', null, 422);
        }
        $allowedModes = ['MODE_A_OPERATIONAL', 'MODE_B_MASTERS_EXCEPT_CORE', 'MODE_C_FACTORY_RESET'];
        if (!in_array($mode, $allowedModes, true)) {
            return ApiResponse::error('UNKNOWN_MODE', 'Mode reset tidak dikenal.', null, 422);
        }

        @set_time_limit(900);
        try {
            $backup = BackupService::createBackup('database', 'Backup otomatis sebelum reset ' . $mode, $request->user()?->id);
        } catch (\Throwable $e) {
            return ApiResponse::error('BACKUP_FAILED', 'Reset dibatalkan karena backup otomatis gagal: ' . $e->getMessage(), null, 500);
        }

        $cleared = [];
        try {
            if ($mode === 'MODE_C_FACTORY_RESET') {
                $keep = $backup->only(['backup_id', 'filename', 'path', 'type', 'size', 'checksum', 'status', 'started_at', 'completed_at', 'notes']);
                Artisan::call('migrate:fresh', ['--force' => true, '--seed' => true]);
                SystemBackup::create($keep); // catatan backup ikut terhapus oleh migrate:fresh: daftarkan lagi agar bisa dipulihkan
                $cleared = ['SEMUA_TABEL' => 0];
            } else {
                $tables = $mode === 'MODE_A_OPERATIONAL' ? self::OPERATIONAL_TABLES : array_merge(self::OPERATIONAL_TABLES, self::MASTER_TABLES);
                Schema::disableForeignKeyConstraints();
                DB::beginTransaction();
                if (DB::connection()->getDriverName() === 'sqlite') {
                    DB::statement('PRAGMA defer_foreign_keys = ON');
                }
                try {
                    foreach ($tables as $t) {
                        if (Schema::hasTable($t)) {
                            $cleared[$t] = DB::table($t)->delete();
                        }
                    }
                    if ($mode === 'MODE_B_MASTERS_EXCEPT_CORE' && Schema::hasTable('attendance_devices')) {
                        DB::table('attendance_devices')->update(['current_session_id' => null]);
                    }
                    DB::commit();
                } catch (\Throwable $e) {
                    DB::rollBack();
                    throw $e;
                } finally {
                    Schema::enableForeignKeyConstraints();
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Reset database gagal', ['mode' => $mode, 'error' => $e->getMessage()]);
            AuditService::log(event: 'database_reset_failed', newValues: ['mode' => $mode], reason: $e->getMessage(), userId: $request->user()?->id);

            return ApiResponse::error('RESET_FAILED', 'Reset gagal dan dibatalkan. Backup ' . $backup->backup_id . ' tersedia untuk pemulihan.', null, 500);
        }
        \Illuminate\Support\Facades\Cache::flush();
        if ($mode !== 'MODE_C_FACTORY_RESET') {
            AuditService::log(event: 'database_reset', newValues: ['mode' => $mode, 'rows_deleted' => array_sum($cleared), 'backup_id' => $backup->backup_id],
                reason: 'Reset database ' . $mode, userId: $request->user()?->id);
        }

        return response()->json([
            'success' => true,
            'mode' => $mode,
            'tables_cleared' => $cleared,
            'total_rows_deleted' => array_sum($cleared),
            'backup_id' => $backup->backup_id,
            'message' => "Reset {$mode} selesai. Backup sebelum reset: {$backup->backup_id}.",
        ]);
    }
}
