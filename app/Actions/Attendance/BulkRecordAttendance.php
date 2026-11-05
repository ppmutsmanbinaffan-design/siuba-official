<?php

namespace App\Actions\Attendance;

use App\Models\AttendanceSession;
use App\Models\User;
use App\Services\Attendance\AttendanceService;

class BulkRecordAttendance
{
    public function __construct(
        protected AttendanceService $attendanceService
    ) {}

    public function execute(
        AttendanceSession $session,
        array $items,
        ?User $operator = null
    ): array {
        return $this->attendanceService->bulkRecord(
            session: $session,
            items: $items,
            operator: $operator
        );
    }
}
