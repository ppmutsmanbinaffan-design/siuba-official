<?php

namespace Database\Factories;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\AttendanceSession;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceSessionFactory extends Factory
{
    protected $model = AttendanceSession::class;

    public function definition(): array
    {
        $today = Carbon::today('Asia/Jakarta');
        return [
            'activity_id' => Activity::factory(),
            'activity_schedule_id' => null,
            'session_code' => 'ATT-' . $today->format('Ymd') . '-TEST-' . $this->faker->unique()->numberBetween(100, 999),
            'session_date' => $today->toDateString(),
            'start_at' => $today->copy()->setTime(4, 15),
            'present_until' => $today->copy()->setTime(4, 30),
            'late_until' => $today->copy()->setTime(4, 45),
            'end_at' => $today->copy()->setTime(5, 0),
            'status' => SessionStatus::OPEN,
            'location' => 'Masjid Utama',
            'notes' => 'Sesi tes otomatis',
        ];
    }
}
