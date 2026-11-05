<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivityParticipantRule;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\DutyRoster;
use App\Models\Halaqah;
use App\Models\HalaqahMember;
use App\Models\Student;
use App\Services\Participant\ActivityParticipantResolver;
use App\Services\Routine\RoutineSessionGenerator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoutineBoardingEngineTest extends TestCase
{
    use RefreshDatabase;

    protected RoutineSessionGenerator $generator;
    protected ActivityParticipantResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new ActivityParticipantResolver();
        $this->generator = new RoutineSessionGenerator($this->resolver);
    }

    /** @test */
    public function test_routine_generator_handles_cross_midnight_schedule()
    {
        $category = ActivityCategory::create(['code' => 'BOARDING', 'name' => 'Kedisiplinan Asrama']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'APEL-MALAM',
            'name' => 'Apel & Patroli Malam',
            'allow_manual' => true,
        ]);

        ActivitySchedule::create([
            'activity_id' => $activity->id,
            'start_time' => '23:30:00',
            'present_until' => '23:45:00',
            'late_until' => '00:00:00',
            'end_time' => '00:30:00',
            'is_active' => true,
        ]);

        $date = Carbon::parse('2026-08-24', 'Asia/Jakarta');
        $res = $this->generator->generateForDate($date);

        $this->assertTrue($res['success']);
        $this->assertEquals(1, $res['sessions_created']);

        $session = AttendanceSession::first();
        $this->assertEquals('2026-08-24 23:30:00', $session->start_at->toDateTimeString());
        $this->assertEquals('2026-08-25 00:30:00', $session->end_at->toDateTimeString());
    }

    /** @test */
    public function test_halaqah_and_duty_roster_resolution()
    {
        $category = ActivityCategory::create(['code' => 'IBADAH', 'name' => 'Ibadah & Quran']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'TAHFIDZ-SUBUH',
            'name' => 'Tahfidz Subuh',
            'allow_manual' => true,
        ]);

        $halaqah = Halaqah::create(['code' => 'HQ-01', 'name' => 'Halaqah 1']);
        $s1 = Student::create(['student_number' => 'S301', 'name' => 'Santri HQ 1', 'gender' => 'L', 'is_active' => true]);
        $s2 = Student::create(['student_number' => 'S302', 'name' => 'Santri HQ 2', 'gender' => 'L', 'is_active' => true]);
        $s3 = Student::create(['student_number' => 'S303', 'name' => 'Santri Piket', 'gender' => 'L', 'is_active' => true]);

        HalaqahMember::create(['halaqah_id' => $halaqah->id, 'student_id' => $s1->id, 'is_active' => true]);
        HalaqahMember::create(['halaqah_id' => $halaqah->id, 'student_id' => $s2->id, 'is_active' => true]);

        // Duty roster for today
        DutyRoster::create([
            'activity_id' => $activity->id,
            'date' => '2026-08-24',
            'student_id' => $s3->id,
            'role' => 'Imam & Muadzin',
            'is_active' => true,
        ]);

        ActivityParticipantRule::create([
            'activity_id' => $activity->id,
            'rule_type' => 'halaqah',
            'rule_operator' => 'include',
            'source_id' => $halaqah->id,
            'is_active' => true,
        ]);

        ActivityParticipantRule::create([
            'activity_id' => $activity->id,
            'rule_type' => 'duty_roster',
            'rule_operator' => 'include',
            'is_active' => true,
        ]);

        $resolved = $this->resolver->resolve($activity, Carbon::parse('2026-08-24', 'Asia/Jakarta'));
        $this->assertCount(3, $resolved); // 2 halaqah members + 1 duty roster student
    }
}
