<?php

namespace App\Actions\Attendance;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use App\Services\Attendance\AttendanceResult;
use App\Services\Attendance\AttendanceService;
use Carbon\Carbon;

class RecordAttendance
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function execute(
        AttendanceSession $session,
        Student $student,
        AttendanceMethod $method,
        ?AttendanceDevice $device = null,
        ?User $operator = null,
        ?Carbon $checkInTime = null,
        ?AttendanceStatus $overrideStatus = null,
        ?string $notes = null
    ): AttendanceResult {
        return $this->attendanceService->record(
            session: $session,
            student: $student,
            method: $method,
            device: $device,
            operator: $operator,
            checkInTime: $checkInTime,
            overrideStatus: $overrideStatus,
            notes: $notes
        );
    }
}
