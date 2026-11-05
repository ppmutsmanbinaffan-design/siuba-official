<?php

namespace Database\Factories;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    public function definition(): array
    {
        return [
            'attendance_session_id' => AttendanceSession::factory(),
            'student_id' => Student::factory(),
            'status' => AttendanceStatus::PRESENT,
            'method' => AttendanceMethod::MANUAL,
            'check_in_at' => Carbon::now('Asia/Jakarta'),
            'late_minutes' => 0,
            'attendance_device_id' => null,
            'recorded_by' => null,
            'notes' => null,
        ];
    }
}
