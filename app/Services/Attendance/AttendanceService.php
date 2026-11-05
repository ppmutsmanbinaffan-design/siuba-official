<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Events\AttendanceRecorded;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceService
{
    public function __construct(
        protected AttendanceValidationService $validator
    ) {}

    /**
     * Record attendance for a single student.
     */
    public function record(
        AttendanceSession $session,
        Student $student,
        AttendanceMethod $method,
        ?AttendanceDevice $device = null,
        ?User $operator = null,
        ?Carbon $checkInTime = null,
        ?AttendanceStatus $overrideStatus = null,
        ?string $notes = null,
        array $metadata = []
    ): AttendanceResult {
        $now = $checkInTime ?? Carbon::now('Asia/Jakarta');

        // Step 1 - 6: Pre-condition Validation
        $validationError = $this->validator->validate($session, $student, $method, $now);
        if ($validationError !== null) {
            return $validationError;
        }

        // Step 7: Automatic Status & Late Determination
        $status = $overrideStatus ?? $this->determineStatus($session, $now);
        $lateMinutes = $this->calculateLateMinutes($session, $now, $status);

        // Step 8 & 9: Save record in DB Transaction with constraint safety
        try {
            return DB::transaction(function () use (
                $session,
                $student,
                $method,
                $device,
                $operator,
                $now,
                $status,
                $lateMinutes,
                $notes,
                $metadata
            ) {
                // Secondary lock check for race conditions
                $existing = AttendanceRecord::where('attendance_session_id', $session->id)
                    ->where('student_id', $student->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    return AttendanceResult::fail(
                        AttendanceResultCode::ALREADY_RECORDED,
                        "Santri {$student->name} sudah tercatat sebelumnya.",
                        $student,
                        $existing
                    );
                }

                $record = AttendanceRecord::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $student->id,
                    'status' => $status,
                    'method' => $method,
                    'check_in_at' => $now,
                    'late_minutes' => $lateMinutes,
                    'attendance_device_id' => $device?->id,
                    'recorded_by' => $operator?->id,
                    'notes' => $notes,
                    'metadata' => $metadata,
                ]);

                // Step 10: Dispatch Event
                event(new AttendanceRecorded($record, $student, $session, $method, $device));

                return AttendanceResult::ok(
                    $record,
                    "Absensi {$student->name} ({$status->label()}) berhasil dicatat."
                );
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // Database-level unique constraint guard
            $existing = AttendanceRecord::where('attendance_session_id', $session->id)
                ->where('student_id', $student->id)
                ->first();

            return AttendanceResult::fail(
                AttendanceResultCode::ALREADY_RECORDED,
                "Santri sudah memiliki catatan kehadiran pada sesi ini.",
                $student,
                $existing
            );
        } catch (\Throwable $e) {
            Log::error("Attendance recording failed: " . $e->getMessage(), [
                'session_id' => $session->id,
                'student_id' => $student->id,
                'exception' => $e,
            ]);

            return AttendanceResult::fail(
                AttendanceResultCode::OUTSIDE_ATTENDANCE_TIME,
                "Terjadi kesalahan sistem saat menyimpan absensi: " . $e->getMessage(),
                $student
            );
        }
    }

    /**
     * Record attendance via QR Token resolution.
     */
    public function recordByQrToken(
        AttendanceSession $session,
        string $qrToken,
        ?AttendanceDevice $device = null,
        ?User $operator = null,
        ?Carbon $checkInTime = null
    ): AttendanceResult {
        $cleanToken = trim($qrToken);
        $student = Student::where('qr_token', $cleanToken)->first();

        if (!$student) {
            return AttendanceResult::fail(
                AttendanceResultCode::STUDENT_NOT_FOUND,
                "Token QR '{$cleanToken}' tidak terdaftar pada sistem."
            );
        }

        return $this->record(
            session: $session,
            student: $student,
            method: AttendanceMethod::QR,
            device: $device,
            operator: $operator,
            checkInTime: $checkInTime
        );
    }

    /**
     * Record attendance via RFID UID resolution.
     */
    public function recordByRfidUid(
        AttendanceSession $session,
        string $rawRfidUid,
        ?AttendanceDevice $device = null,
        ?User $operator = null,
        ?Carbon $checkInTime = null
    ): AttendanceResult {
        $normalizedUid = Student::normalizeRfidUid($rawRfidUid);

        if (!$normalizedUid) {
            return AttendanceResult::fail(
                AttendanceResultCode::STUDENT_NOT_FOUND,
                "UID RFID kosong atau tidak valid."
            );
        }

        $student = Student::where('rfid_uid', $normalizedUid)->first();

        if (!$student) {
            return AttendanceResult::fail(
                AttendanceResultCode::STUDENT_NOT_FOUND,
                "Kartu RFID UID '{$normalizedUid}' belum didaftarkan ke santri manapun."
            );
        }

        return $this->record(
            session: $session,
            student: $student,
            method: AttendanceMethod::RFID,
            device: $device,
            operator: $operator,
            checkInTime: $checkInTime
        );
    }

    /**
     * Bulk record attendance for multiple students (e.g. classroom manual attendance).
     */
    public function bulkRecord(
        AttendanceSession $session,
        array $items, // array of ['student_id' => int, 'status' => AttendanceStatus|string, 'notes' => ?string]
        ?User $operator = null
    ): array {
        $results = [
            'success_count' => 0,
            'skipped_count' => 0,
            'failed_count' => 0,
            'details' => [],
        ];

        $studentIds = array_column($items, 'student_id');
        $students = Student::whereIn('id', $studentIds)->get()->keyBy('id');
        $existingRecords = AttendanceRecord::where('attendance_session_id', $session->id)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy('student_id');

        $now = Carbon::now('Asia/Jakarta');

        DB::transaction(function () use (
            $session,
            $items,
            $students,
            $existingRecords,
            $operator,
            $now,
            &$results
        ) {
            foreach ($items as $item) {
                $studentId = $item['student_id'];
                $student = $students->get($studentId);

                if (!$student) {
                    $results['failed_count']++;
                    $results['details'][] = [
                        'student_id' => $studentId,
                        'success' => false,
                        'message' => 'Santri tidak ditemukan',
                    ];
                    continue;
                }

                $statusInput = is_string($item['status']) 
                    ? AttendanceStatus::from($item['status']) 
                    : $item['status'];

                $notes = $item['notes'] ?? null;

                if ($existingRecords->has($studentId)) {
                    // Update existing record
                    $record = $existingRecords->get($studentId);
                    $record->update([
                        'status' => $statusInput,
                        'notes' => $notes,
                        'recorded_by' => $operator?->id,
                    ]);
                    $results['success_count']++;
                    $results['details'][] = [
                        'student_id' => $studentId,
                        'student_name' => $student->name,
                        'success' => true,
                        'action' => 'updated',
                    ];
                } else {
                    // Create new
                    $record = AttendanceRecord::create([
                        'attendance_session_id' => $session->id,
                        'student_id' => $studentId,
                        'status' => $statusInput,
                        'method' => AttendanceMethod::MANUAL,
                        'check_in_at' => $now,
                        'late_minutes' => ($statusInput === AttendanceStatus::LATE) ? 1 : 0,
                        'recorded_by' => $operator?->id,
                        'notes' => $notes,
                    ]);
                    $results['success_count']++;
                    $results['details'][] = [
                        'student_id' => $studentId,
                        'student_name' => $student->name,
                        'success' => true,
                        'action' => 'created',
                    ];
                }
            }
        });

        return $results;
    }

    /**
     * Determine automatic attendance status based on session time window.
     */
    public function determineStatus(AttendanceSession $session, Carbon $checkInTime): AttendanceStatus
    {
        if ($session->present_until && $checkInTime->lessThanOrEqualTo($session->present_until)) {
            return AttendanceStatus::PRESENT;
        }

        if ($session->late_until && $checkInTime->lessThanOrEqualTo($session->late_until)) {
            return AttendanceStatus::LATE;
        }

        if ($session->end_at && $checkInTime->lessThanOrEqualTo($session->end_at)) {
            return AttendanceStatus::LATE;
        }

        return AttendanceStatus::ABSENT;
    }

    /**
     * Calculate late minutes between present_until and check_in_at.
     */
    public function calculateLateMinutes(AttendanceSession $session, Carbon $checkInTime, AttendanceStatus $status): int
    {
        if ($status !== AttendanceStatus::LATE || !$session->present_until) {
            return 0;
        }

        if ($checkInTime->greaterThan($session->present_until)) {
            return (int) ceil($session->present_until->diffInMinutes($checkInTime));
        }

        return 0;
    }
}
