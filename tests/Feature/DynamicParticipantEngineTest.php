<?php

namespace Tests\Feature;

use App\Actions\Attendance\GenerateSessionParticipants;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivityParticipantRule;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Halaqah;
use App\Models\HalaqahMember;
use App\Models\Student;
use App\Services\Participant\ActivityParticipantResolver;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicParticipantEngineTest extends TestCase
{
    use RefreshDatabase;

    protected ActivityParticipantResolver $resolver;
    protected GenerateSessionParticipants $generator;
    protected Activity $activity;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new ActivityParticipantResolver();
        $this->generator = new GenerateSessionParticipants($this->resolver);

        $category = ActivityCategory::create([
            'code' => 'UMUM',
            'name' => 'Kegiatan Umum Pesantren',
        ]);

        $this->activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'MUHADHARAH-AKBAR',
            'name' => 'Muhadharah Akbar Santri',
            'allow_manual' => true,
            'allow_qr' => true,
        ]);
    }

    /** @test */
    public function test_all_students_with_gender_filter()
    {
        Student::create(['student_number' => 'STU-M1', 'name' => 'Ahmad', 'gender' => 'L', 'is_active' => true]);
        Student::create(['student_number' => 'STU-M2', 'name' => 'Ali', 'gender' => 'L', 'is_active' => true]);
        Student::create(['student_number' => 'STU-F1', 'name' => 'Aisyah', 'gender' => 'P', 'is_active' => true]);

        ActivityParticipantRule::create([
            'activity_id' => $this->activity->id,
            'rule_type' => 'all_students',
            'rule_operator' => 'include',
            'rule_value' => ['gender' => 'L'],
            'is_active' => true,
        ]);

        $resolved = $this->resolver->resolve($this->activity);
        $this->assertCount(2, $resolved);
        $studentNames = array_map(fn($item) => $item['student']->name, $resolved);
        $this->assertContains('Ahmad', $studentNames);
        $this->assertContains('Ali', $studentNames);
        $this->assertNotContains('Aisyah', $studentNames);
    }

    /** @test */
    public function test_multi_source_deduplication_and_exclude_rule()
    {
        $classA = Classroom::create(['name' => '10-A', 'code' => '10A', 'level' => '10']);
        $halaqah1 = Halaqah::create(['code' => 'HQ-1', 'name' => 'Halaqah Utsman']);

        $s1 = Student::create(['student_number' => 'S1', 'name' => 'Zaid', 'classroom_id' => $classA->id, 'gender' => 'L', 'is_active' => true]);
        $s2 = Student::create(['student_number' => 'S2', 'name' => 'Umar', 'classroom_id' => $classA->id, 'gender' => 'L', 'is_active' => true]);
        $s3 = Student::create(['student_number' => 'S3', 'name' => 'Khalid', 'gender' => 'L', 'is_active' => true]);

        HalaqahMember::create(['halaqah_id' => $halaqah1->id, 'student_id' => $s1->id, 'is_active' => true]);
        HalaqahMember::create(['halaqah_id' => $halaqah1->id, 'student_id' => $s3->id, 'is_active' => true]);

        // Rules: Include Class 10A, Include Halaqah 1, Exclude Umar
        ActivityParticipantRule::create([
            'activity_id' => $this->activity->id,
            'rule_type' => 'classroom',
            'rule_operator' => 'include',
            'source_id' => $classA->id,
            'is_active' => true,
        ]);

        ActivityParticipantRule::create([
            'activity_id' => $this->activity->id,
            'rule_type' => 'halaqah',
            'rule_operator' => 'include',
            'source_id' => $halaqah1->id,
            'is_active' => true,
        ]);

        ActivityParticipantRule::create([
            'activity_id' => $this->activity->id,
            'rule_type' => 'individual',
            'rule_operator' => 'exclude',
            'source_id' => $s2->id, // Umar excluded
            'is_active' => true,
        ]);

        $resolved = $this->resolver->resolve($this->activity);
        
        // Zaid is in ClassA + Halaqah1 (deduped to 1), Khalid is in Halaqah1, Umar is excluded. Total = 2
        $this->assertCount(2, $resolved);
        $resolvedIds = array_map(fn($i) => $i['student_id'], $resolved);
        $this->assertContains($s1->id, $resolvedIds);
        $this->assertContains($s3->id, $resolvedIds);
        $this->assertNotContains($s2->id, $resolvedIds);

        // Check sources trace on Zaid
        $zaidEntry = collect($resolved)->firstWhere('student_id', $s1->id);
        $this->assertCount(2, $zaidEntry['sources']);
    }

    /** @test */
    public function test_session_snapshot_generation_and_draft_lock()
    {
        $classA = Classroom::create(['name' => '11-A', 'code' => '11A', 'level' => '11']);
        $s1 = Student::create(['student_number' => 'S101', 'name' => 'Thalhah', 'classroom_id' => $classA->id, 'gender' => 'L', 'is_active' => true]);

        ActivityParticipantRule::create([
            'activity_id' => $this->activity->id,
            'rule_type' => 'classroom',
            'rule_operator' => 'include',
            'source_id' => $classA->id,
            'is_active' => true,
        ]);

        $session = AttendanceSession::create([
            'activity_id' => $this->activity->id,
            'session_code' => 'SESS-MUH-001',
            'session_date' => '2026-08-24',
            'start_at' => Carbon::parse('2026-08-24 08:00:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-24 08:15:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-24 08:30:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-24 09:30:00', 'Asia/Jakarta'),
            'status' => SessionStatus::DRAFT,
        ]);

        $res = $this->generator->execute($session);
        $this->assertEquals(1, $res['added']);
        $this->assertEquals(1, AttendanceSessionParticipant::where('attendance_session_id', $session->id)->count());

        // Open the session
        $session->update(['status' => SessionStatus::OPEN]);

        // Attempting to refresh on OPEN session should throw exception
        $this->expectException(\InvalidArgumentException::class);
        $this->generator->execute($session);
    }
}
