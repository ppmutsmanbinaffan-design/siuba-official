<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Services\Security\AuditService;
use App\Services\Security\DataIntegrityAuditService;
use App\Services\System\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Halaman Keamanan & Audit: kesehatan sistem, audit integritas data (dengan perbaikan otomatis yang aman)
 * dan catatan uji pemulihan bencana — semuanya dari server, bukan dari cache browser.
 */
class SystemStatusApiController extends Controller
{
    public const DR_PLANS = ['dr_server_hardware_failure', 'dr_database_corruption', 'dr_accidental_mass_deletion', 'dr_power_outage_blackout', 'dr_device_failure'];

    public function health(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => SystemHealthService::spaReport()]);
    }

    public function integrity(Request $request): JsonResponse
    {
        $r = DataIntegrityAuditService::runFullAudit();
        $categories = [
            'duplicate_attendance' => 'DUPLICATE_ATTENDANCE', 'duplicate_participant' => 'DUPLICATE_PARTICIPANT',
            'duplicate_qr_token' => 'DUPLICATE_QR', 'duplicate_rfid_uid' => 'DUPLICATE_RFID',
            'non_participant_attendance' => 'ORPHAN_RECORD', 'incomplete_closed_required_session' => 'INCOMPLETE_SESSION',
            'invalid_device_session_assignment' => 'DEVICE_ASSIGNMENT',
        ];
        $repairLabels = [
            'incomplete_closed_required_session' => 'Lengkapi Alpa / Izin',
            'invalid_device_session_assignment' => 'Lepas dari Sesi',
            'duplicate_participant' => 'Hapus Peserta Ganda',
        ];
        $now = now()->toIso8601String();
        $issues = [];
        foreach ($r['issues'] as $k => $i) {
            $ctx = $i['context'] ?? [];
            $issues[] = [
                'id' => 'ISS-' . ($k + 1),
                'type' => $i['type'],
                'context' => $ctx,
                'severity' => $i['severity'],
                'category' => $categories[$i['type']] ?? strtoupper($i['type']),
                'title' => self::title($i['type']),
                'description' => $i['description'],
                'affected_entity_type' => $i['entity_type'] ?? '-',
                'affected_entity_id' => (string) ($ctx['session_id'] ?? $ctx['record_id'] ?? $ctx['device_id'] ?? $ctx['student_id'] ?? '-'),
                'affected_entity_label' => (string) ($ctx['session_code'] ?? $ctx['rfid_uid'] ?? $ctx['qr_token'] ?? ''),
                'suggested_fix' => $i['action_needed'] ?? 'Periksa data terkait.',
                'can_auto_repair' => in_array($i['type'], DataIntegrityAuditService::REPAIRABLE, true),
                'repair_action_label' => $repairLabels[$i['type']] ?? null,
                'detected_at' => $now,
            ];
        }
        $count = fn (string $type) => count(array_filter($r['issues'], fn ($i) => $i['type'] === $type));

        $summary = [
            'total_issues' => count($issues),
            'critical_count' => $r['critical_count'],
            'warning_count' => $r['warning_count'],
            'info_count' => $r['info_count'],
            'last_audit_at' => $now,
            'status' => $r['critical_count'] > 0 ? 'CRITICAL' : ($r['warning_count'] > 0 ? 'WARNING' : 'HEALTHY'),
            'issues' => array_slice($issues, 0, 500),
            'metrics' => [
                'total_records_checked' => AttendanceRecord::count(),
                'total_sessions_checked' => AttendanceSession::count(),
                'total_students_checked' => Student::count(),
                'total_participants_checked' => AttendanceSessionParticipant::count(),
                'total_devices_checked' => AttendanceDevice::count(),
                'duplicate_attendance_count' => $count('duplicate_attendance'),
                'incomplete_closed_sessions_count' => $count('incomplete_closed_required_session'),
                'duplicate_rfid_count' => $count('duplicate_rfid_uid'),
                'duplicate_qr_count' => $count('duplicate_qr_token'),
                'orphan_device_assignments_count' => $count('invalid_device_session_assignment'),
            ],
        ];
        AppSetting::put('last_integrity_summary', $summary, $request->user()?->id);

        return response()->json(['success' => true, 'data' => $summary]);
    }

    public function repair(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(DataIntegrityAuditService::REPAIRABLE)],
            'context' => 'required|array',
        ], ['type.in' => 'Temuan ini tidak bisa diperbaiki otomatis; periksa dan perbaiki manual.']);

        $result = DataIntegrityAuditService::repair($data['type'], $data['context'], $request->user());
        if (!$result['success']) {
            return ApiResponse::error('REPAIR_NOT_APPLIED', $result['message'], null, 409);
        }
        AuditService::log(event: 'integrity_repair', newValues: ['type' => $data['type'], 'context' => $data['context'], 'affected' => $result['affected']],
            reason: $result['message'], userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => $result['message'], 'data' => ['affected' => $result['affected']]]);
    }

    public function drills(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => (object) (AppSetting::get('dr_drills') ?? [])]);
    }

    public function recordDrill(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', Rule::in(self::DR_PLANS)],
            'status' => 'required|in:PASS,FAIL',
            'notes' => 'nullable|string|max:1000',
        ]);
        $drills = (array) (AppSetting::get('dr_drills') ?? []);
        $drills[$data['plan_id']] = [
            'at' => now()->toIso8601String(),
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
            'by' => $request->user()?->name,
        ];
        AppSetting::put('dr_drills', $drills, $request->user()?->id);
        AuditService::log(event: 'dr_drill_recorded', newValues: ['plan_id' => $data['plan_id'], 'status' => $data['status']],
            reason: 'Uji pemulihan bencana dicatat', userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => 'Hasil uji pemulihan tersimpan.', 'data' => (object) $drills]);
    }

    private static function title(string $type): string
    {
        return [
            'duplicate_attendance' => 'Presensi ganda pada satu sesi',
            'duplicate_participant' => 'Peserta sesi tercatat ganda',
            'duplicate_qr_token' => 'Token QR kartu dipakai lebih dari satu santri',
            'duplicate_rfid_uid' => 'UID kartu RFID dipakai lebih dari satu santri',
            'non_participant_attendance' => 'Presensi dari santri di luar daftar peserta',
            'incomplete_closed_required_session' => 'Sesi ditutup tetapi presensi belum lengkap',
            'invalid_device_session_assignment' => 'Perangkat masih terikat ke sesi yang sudah selesai',
        ][$type] ?? ucfirst(str_replace('_', ' ', $type));
    }
}
