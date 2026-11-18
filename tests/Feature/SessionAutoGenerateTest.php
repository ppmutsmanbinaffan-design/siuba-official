<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Tahap 30: sesi rutin dibuat otomatis (penjadwal tiap jam + saat start), aman diulang. */
class SessionAutoGenerateTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_today_and_tomorrow_once(): void
    {
        $this->travelTo(Carbon::parse('2026-11-18 09:00:00'));
        $cat = ActivityCategory::create(['code' => 'IBADAH', 'name' => 'Ibadah']);
        $act = Activity::create(['activity_category_id' => $cat->id, 'code' => 'SUBUH', 'name' => 'Shalat Subuh', 'allow_manual' => true]);
        ActivitySchedule::create(['activity_id' => $act->id, 'start_time' => '04:30:00', 'present_until' => '04:45:00',
            'late_until' => '05:00:00', 'end_time' => '05:30:00', 'is_active' => true]);

        $this->artisan('attendance:generate-sessions --days=2')->expectsOutputToContain('KBM dilewati')->assertSuccessful();
        $this->assertSame(2, AttendanceSession::count());
        $this->assertEqualsCanonicalizing(['2026-11-18', '2026-11-19'],
            AttendanceSession::pluck('session_date')->map(fn ($d) => Carbon::parse($d)->toDateString())->all());

        $this->artisan('attendance:generate-sessions --days=2')->assertSuccessful();
        $this->assertSame(2, AttendanceSession::count()); // tidak dobel
    }

    public function test_command_is_scheduled_hourly(): void
    {
        $events = collect(app(Schedule::class)->events())->filter(fn ($e) => str_contains($e->command ?? '', 'attendance:generate-sessions'));
        $this->assertCount(1, $events);
        $this->assertSame('3 * * * *', $events->first()->expression);
    }
}
