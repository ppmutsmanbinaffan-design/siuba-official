<?php

namespace App\Services\Security;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\AttendanceDevice;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class DataIntegrityAuditService
{
    /**
     * Run all integrity checks across the database.
     */
    public static function runFullAudit(): array
    {
        $issues = [];

        // 1. Check Attendance Duplicate (attendance_session_id + student_id)
        $duplicateRecords = DB::table('attendance_records')
            ->select('attendance_session_id', 'student_id', DB::raw('COUNT(*) as total'))
            ->groupBy('attendance_session_id', 'student_id')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateRecords as $dup) {
            $issues[] = [
                'type' => 'duplicate_attendance',
                'severity' => 'critical',
                'description' => "Duplikasi data presensi ditemukan untuk Santri ID {$dup->student_id} pada Sesi ID {$dup->attendance_session_id} ({$dup->total} records).",
                'entity_type' => 'attendance_records',
                'context' => ['session_id' => $dup->attendance_session_id, 'student_id' => $dup->student_id, 'count' => $dup->total],
                'action_needed' => 'Pertahankan record kehadiran valid terbaru dan arsipkan duplikat.',
            ];
        }

        // 2. Check Session Participant Duplicate (attendance_session_id + student_id)
        $duplicateParticipants = DB::table('attendance_session_participants')
            ->select('attendance_session_id', 'student_id', DB::raw('COUNT(*) as total'))
            ->groupBy('attendance_session_id', 'student_id')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateParticipants as $dup) {
            $issues[] = [
                'type' => 'duplicate_participant',
                'severity' => 'critical',
                'description' => "Duplikasi snapshot peserta sesi ID {$dup->attendance_session_id} untuk Santri ID {$dup->student_id} ({$dup->total} snapshots).",
                'entity_type' => 'attendance_session_participants',
                'context' => ['session_id' => $dup->attendance_session_id, 'student_id' => $dup->student_id, 'count' => $dup->total],
                'action_needed' => 'Hapus snapshot peserta duplikat dan validasi keunikan snapshot sesi.',
            ];
        }

        // 3. Check Duplicate QR Tokens (non-null)
        $duplicateQr = DB::table('students')
            ->whereNotNull('qr_token')
            ->where('qr_token', '!=', '')
            ->select('qr_token', DB::raw('COUNT(*) as total'))
            ->groupBy('qr_token')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateQr as $dup) {
            $issues[] = [
                'type' => 'duplicate_qr_token',
                'severity' => 'critical',
                'description' => "Token QR duplikat terdeteksi ('{$dup->qr_token}') dimiliki oleh {$dup->total} santri.",
                'entity_type' => 'students',
                'context' => ['qr_token' => $dup->qr_token, 'count' => $dup->total],
                'action_needed' => 'Regenerate token QR unik opaque untuk santri terdampak.',
            ];
        }

        // 4. Check Duplicate RFID UIDs (non-null)
        $duplicateRfid = DB::table('students')
            ->whereNotNull('rfid_uid')
            ->where('rfid_uid', '!=', '')
            ->select('rfid_uid', DB::raw('COUNT(*) as total'))
            ->groupBy('rfid_uid')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateRfid as $dup) {
            $issues[] = [
                'type' => 'duplicate_rfid_uid',
                'severity' => 'critical',
                'description' => "RFID UID duplikat terdeteksi ('{$dup->rfid_uid}') terdaftar pada {$dup->total} santri.",
                'entity_type' => 'students',
                'context' => ['rfid_uid' => $dup->rfid_uid, 'count' => $dup->total],
                'action_needed' => 'Unassign kartu RFID duplikat dan assign kartu fisik baru.',
            ];
        }

        // 5. Check Non-Participant Attendance (Records with students not present in session snapshot)
        $nonParticipantRecords = DB::table('attendance_records as r')
            ->leftJoin('attendance_session_participants as p', function ($join) {
                $join->on('r.attendance_session_id', '=', 'p.attendance_session_id')
                     ->on('r.student_id', '=', 'p.student_id');
            })
            ->whereNull('p.id')
            ->select('r.id', 'r.attendance_session_id', 'r.student_id')
            ->get();

        foreach ($nonParticipantRecords as $rec) {
            $issues[] = [
                'type' => 'non_participant_attendance',
                'severity' => 'warning',
                'description' => "Record presensi #{$rec->id} santri ID {$rec->student_id} tidak terdaftar di snapshot peserta sesi #{$rec->attendance_session_id}.",
                'entity_type' => 'attendance_records',
                'context' => ['record_id' => $rec->id, 'session_id' => $rec->attendance_session_id, 'student_id' => $rec->student_id],
                'action_needed' => 'Verifikasi apakah walk-in/dispensasi atau re-sinkronkan snapshot peserta.',
            ];
        }

        // 6. Check Incomplete Closed Required Sessions (eligible > recorded in closed session)
        $closedSessions = DB::table('attendance_sessions')
            ->where('status', 'closed')
            ->get();

        foreach ($closedSessions as $sess) {
            $eligibleCount = DB::table('attendance_session_participants')
                ->where('attendance_session_id', $sess->id)
                ->where('eligibility_status', '!=', 'ineligible')
                ->count();

            $recordedCount = DB::table('attendance_records')
                ->where('attendance_session_id', $sess->id)
                ->count();

            if ($eligibleCount > 0 && $recordedCount < $eligibleCount) {
                $missing = $eligibleCount - $recordedCount;
                $issues[] = [
                    'type' => 'incomplete_closed_required_session',
                    'severity' => 'warning',
                    'description' => "Sesi tertutup #{$sess->id} ({$sess->title}) memiliki {$missing} santri eligible belum terekam presensi.",
                    'entity_type' => 'attendance_sessions',
                    'context' => ['session_id' => $sess->id, 'eligible' => $eligibleCount, 'recorded' => $recordedCount, 'missing' => $missing],
                    'action_needed' => 'Jalankan auto-alpha finalizer untuk melengkapi santri yang tidak hadir.',
                ];
            }
        }

        // 7. Check Active Device Assignments to Inactive/Closed Sessions
        $invalidDeviceAssignments = DB::table('attendance_devices as d')
            ->join('attendance_sessions as s', 'd.current_session_id', '=', 's.id')
            ->whereIn('s.status', ['closed', 'cancelled'])
            ->select('d.id as device_id', 'd.name as device_name', 's.id as session_id', 's.status as session_status')
            ->get();

        foreach ($invalidDeviceAssignments as $inv) {
            $issues[] = [
                'type' => 'invalid_device_session_assignment',
                'severity' => 'info',
                'description' => "Perangkat #{$inv->device_id} ({$inv->device_name}) masih ter-assign ke sesi {$inv->session_status} #{$inv->session_id}.",
                'entity_type' => 'attendance_devices',
                'context' => ['device_id' => $inv->device_id, 'session_id' => $inv->session_id, 'status' => $inv->session_status],
                'action_needed' => 'Reset current_session_id perangkat ke null atau assign ke sesi terbuka.',
            ];
        }

        $criticalCount = count(array_filter($issues, fn($i) => $i['severity'] === 'critical'));
        $warningCount = count(array_filter($issues, fn($i) => $i['severity'] === 'warning'));
        $infoCount = count(array_filter($issues, fn($i) => $i['severity'] === 'info'));

        return [
            'status' => $criticalCount === 0 ? ($warningCount === 0 ? 'PASS' : 'WARNING') : 'FAIL',
            'critical_count' => $criticalCount,
            'warning_count' => $warningCount,
            'info_count' => $infoCount,
            'total_issues' => count($issues),
            'issues' => $issues,
            'checked_at' => now()->toISOString(),
        ];
    }
}
