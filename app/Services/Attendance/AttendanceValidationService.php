<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\SessionStatus;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use Carbon\Carbon;

class AttendanceValidationService
{
    /**
     * Validate all pre-conditions before recording attendance.
     * Returns null if valid, or AttendanceResult on validation failure.
     */
    public function validate(
        AttendanceSession $session,
        Student $student,
        AttendanceMethod $method,
        ?Carbon $checkInTime = null
    ): ?AttendanceResult {
        $now = $checkInTime ?? Carbon::now('Asia/Jakarta');

        // 1. Validate student is active
        if (!$student->is_active) {
            return AttendanceResult::fail(
                AttendanceResultCode::STUDENT_INACTIVE,
                "Santri {$student->name} (NIS: {$student->student_number}) berstatus tidak aktif.",
                $student
            );
        }

        // 2. Validate session status
        if ($session->status === SessionStatus::DRAFT) {
            return AttendanceResult::fail(
                AttendanceResultCode::SESSION_NOT_OPEN,
                "Sesi {$session->session_code} belum dibuka (status: Draf).",
                $student
            );
        }

        if ($session->status === SessionStatus::CLOSED) {
            return AttendanceResult::fail(
                AttendanceResultCode::SESSION_CLOSED,
                "Sesi {$session->session_code} telah ditutup.",
                $student
            );
        }

        if ($session->status === SessionStatus::CANCELLED) {
            return AttendanceResult::fail(
                AttendanceResultCode::SESSION_CLOSED,
                "Sesi {$session->session_code} telah dibatalkan.",
                $student
            );
        }

        // 3. Validate attendance time window
        if ($session->end_at && $now->greaterThan($session->end_at)) {
            return AttendanceResult::fail(
                AttendanceResultCode::OUTSIDE_ATTENDANCE_TIME,
                "Waktu absensi untuk sesi {$session->session_code} telah berakhir pada {$session->end_at->format('H:i')}.",
                $student
            );
        }

        // 4. Validate method allowed on activity
        $activity = $session->activity;
        if ($activity && !$activity->allowsMethod($method)) {
            return AttendanceResult::fail(
                AttendanceResultCode::INVALID_METHOD,
                "Metode '{$method->label()}' tidak diperbolehkan untuk kegiatan '{$activity->name}'.",
                $student
            );
        }

        // 5. Validate participant membership if session has registered participant snapshot
        if ($session->participants()->exists()) {
            $isParticipant = $session->participants()
                ->where('student_id', $student->id)
                ->exists();

            if (!$isParticipant) {
                return AttendanceResult::fail(
                    AttendanceResultCode::STUDENT_NOT_PARTICIPANT,
                    "Santri {$student->name} bukan merupakan peserta terdaftar pada sesi {$session->session_code}.",
                    $student
                );
            }
        }

        // 6. Prevent duplicate attendance
        $existing = AttendanceRecord::where('attendance_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            return AttendanceResult::fail(
                AttendanceResultCode::ALREADY_RECORDED,
                "Santri {$student->name} sudah tercatat {$existing->status->label()} pada {$existing->check_in_at?->format('H:i')}.",
                $student,
                $existing
            );
        }

        return null; // All validations passed
    }
}
