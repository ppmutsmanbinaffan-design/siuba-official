<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceResultCode;
use App\Models\AttendanceRecord;
use App\Models\Student;

class AttendanceResult
{
    public function __construct(
        public readonly bool $success,
        public readonly AttendanceResultCode $code,
        public readonly string $message,
        public readonly ?AttendanceRecord $attendanceRecord = null,
        public readonly ?Student $student = null,
        public readonly array $meta = []
    ) {}

    public static function ok(AttendanceRecord $record, string $message = 'Absensi berhasil dicatat.'): self
    {
        return new self(
            success: true,
            code: AttendanceResultCode::SUCCESS,
            message: $message,
            attendanceRecord: $record,
            student: $record->student,
            meta: [
                'status' => $record->status->value,
                'method' => $record->method->value,
                'check_in_at' => $record->check_in_at?->toIso8601String(),
                'late_minutes' => $record->late_minutes,
            ]
        );
    }

    public static function fail(AttendanceResultCode $code, ?string $customMessage = null, ?Student $student = null, ?AttendanceRecord $existingRecord = null): self
    {
        return new self(
            success: false,
            code: $code,
            message: $customMessage ?? $code->message(),
            attendanceRecord: $existingRecord,
            student: $student ?? $existingRecord?->student,
            meta: $existingRecord ? [
                'status' => $existingRecord->status->value,
                'method' => $existingRecord->method->value,
                'check_in_at' => $existingRecord->check_in_at?->toIso8601String(),
            ] : []
        );
    }

    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'code' => $this->code->value,
            'message' => $this->message,
            'attendance_record' => $this->attendanceRecord?->toArray(),
            'student' => $this->student?->toArray(),
            'meta' => $this->meta,
        ];
    }
}
