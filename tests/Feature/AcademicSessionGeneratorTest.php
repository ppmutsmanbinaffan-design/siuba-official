<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\AcademicCalendarEvent;
use App\Models\AcademicSchedule;
use App\Models\AcademicYear;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\LessonPeriod;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\Academic\AcademicSessionGenerator;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicSessionGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicSessionGenerator $generator;
    protected AttendanceService $attendanceService;
    protected AcademicYear $year;
    protected Semester $semester;
    protected Classroom $classroom;
    protected Subject $subject;
    protected User $teacher;
    protected LessonPeriod $period1;
    protected LessonPeriod $period2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->generator = new AcademicSessionGenerator();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        ActivityCategory::create(['code' => 'KBM', 'name' => 'Kegiatan Belajar Mengajar']);

        $this->year = AcademicYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
        ]);

        $this->semester = Semester::create([
            'academic_year_id' => $this->year->id,
            'code' => 'GANJIL',
            'name' => 'Semester Ganjil',
            'start_date' => '2026-07-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ]);

        $this->classroom = Classroom::create(['name' => '10-IPA', 'code' => '10IPA', 'level' => '10']);
        $this->subject = Subject::create(['code' => 'FIQIH-10', 'name' => 'Fiqih Syafi\'i', 'category' => 'DINIYAH']);
        $this->teacher = User::create(['name' => 'Ustadz Fiqih', 'username' => 'ustadz.fiqih', 'password' => bcrypt('secret')]);

        $this->period1 = LessonPeriod::create([
            'code' => 'JP-1',
            'name' => 'Jam Pelajaran 1',
            'period_number' => 1,
            'start_time' => '07:30:00',
            'end_time' => '08:15:00',
            'is_break' => false,
            'is_active' => true,
        ]);

        $this->period2 = LessonPeriod::create([
            'code' => 'JP-2',
            'name' => 'Jam Pelajaran 2',
            'period_number' => 2,
            'start_time' => '08:15:00',
            'end_time' => '09:00:00',
            'is_break' => false,
            'is_active' => true,
        ]);

        // Students
        Student::create(['student_number' => 'S201', 'name' => 'Santri 1', 'classroom_id' => $this->classroom->id, 'gender' => 'L', 'is_active' => true]);
        Student::create(['student_number' => 'S202', 'name' => 'Santri 2', 'classroom_id' => $this->classroom->id, 'gender' => 'L', 'is_active' => true]);
    }

    /** @test */
    public function test_academic_session_generation_and_idempotency()
    {
        // Monday = 1. Let date be Monday 2026-08-24
        $date = Carbon::parse('2026-08-24', 'Asia/Jakarta');

        AcademicSchedule::create([
            'academic_year_id' => $this->year->id,
            'semester_id' => $this->semester->id,
            'day_of_week' => 1, // Monday
            'classroom_id' => $this->classroom->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'lesson_period_id' => $this->period1->id,
            'is_active' => true,
        ]);

        // Run 1: generate sessions
        $res1 = $this->generator->generateForDate($date);
        $this->assertTrue($res1['success']);
        $this->assertEquals(1, $res1['sessions_created']);
        $this->assertEquals(1, AttendanceSession::count());

        // Verify participant snapshot
        $session = AttendanceSession::first();
        $this->assertCount(2, $session->participants);

        // Run 2: idempotent check
        $res2 = $this->generator->generateForDate($date);
        $this->assertEquals(0, $res2['sessions_created']);
        $this->assertEquals(1, $res2['sessions_existing']);
        $this->assertEquals(1, AttendanceSession::count()); // Still 1 session
    }

    /** @test */
    public function test_holiday_skips_academic_generation()
    {
        $date = Carbon::parse('2026-08-24', 'Asia/Jakarta');

        AcademicCalendarEvent::create([
            'academic_year_id' => $this->year->id,
            'name' => 'Hari Kemerdekaan / Libur Nasional',
            'type' => 'holiday',
            'start_date' => '2026-08-24',
            'end_date' => '2026-08-24',
            'affects_academic_schedule' => true,
        ]);

        AcademicSchedule::create([
            'academic_year_id' => $this->year->id,
            'semester_id' => $this->semester->id,
            'day_of_week' => 1,
            'classroom_id' => $this->classroom->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'lesson_period_id' => $this->period1->id,
            'is_active' => true,
        ]);

        $res = $this->generator->generateForDate($date);
        $this->assertTrue($res['is_holiday']);
        $this->assertEquals(0, $res['sessions_created']);
        $this->assertEquals(0, AttendanceSession::count());
    }

    /** @test */
    public function test_attendance_recording_on_generated_academic_session()
    {
        $date = Carbon::parse('2026-08-24', 'Asia/Jakarta');

        AcademicSchedule::create([
            'academic_year_id' => $this->year->id,
            'semester_id' => $this->semester->id,
            'day_of_week' => 1,
            'classroom_id' => $this->classroom->id,
            'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id,
            'lesson_period_id' => $this->period1->id,
            'is_active' => true,
        ]);

        $this->generator->generateForDate($date);
        $session = AttendanceSession::first();
        $session->update([
            'status' => SessionStatus::OPEN,
            'end_at' => Carbon::now('Asia/Jakarta')->addHours(2),
        ]);

        $student = Student::first();
        $recordResult = $this->attendanceService->record(
            session: $session,
            student: $student,
            method: AttendanceMethod::MANUAL,
            operator: $this->teacher,
            checkInTime: Carbon::now('Asia/Jakarta'),
            overrideStatus: AttendanceStatus::PRESENT
        );

        $this->assertTrue($recordResult->success);
        $this->assertEquals(1, AttendanceRecord::where('attendance_session_id', $session->id)->count());
    }
}
