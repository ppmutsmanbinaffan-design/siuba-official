<?php

namespace App\Events;

use App\Enums\AttendanceMethod;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;

class AttendanceRecorded
{
    public function __construct(
        public readonly AttendanceRecord $attendanceRecord,
        public readonly Student $student,
        public readonly AttendanceSession $session,
        public readonly AttendanceMethod $method,
        public readonly ?AttendanceDevice $device = null
    ) {}
}
