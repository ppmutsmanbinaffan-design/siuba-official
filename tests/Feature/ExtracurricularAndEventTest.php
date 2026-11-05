<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\EventSession;
use App\Models\Extracurricular;
use App\Models\ExtracurricularMember;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use App\Services\Event\EventSessionGenerator;
use App\Services\Extracurricular\ExtracurricularEligibilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExtracurricularAndEventTest extends TestCase
{
    use RefreshDatabase;

    protected ExtracurricularEligibilityService $extraService;
    protected EventSessionGenerator $eventGenerator;
    protected AttendanceService $attendanceService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->extraService = new ExtracurricularEligibilityService();
        $this->eventGenerator = new EventSessionGenerator();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        ActivityCategory::create(['code' => 'EXTRA', 'name' => 'Ekstrakurikuler']);
        ActivityCategory::create(['code' => 'EVENT', 'name' => 'Event Khusus']);
    }

    /** @test */
    public function test_extracurricular_capacity_and_waitlist()
    {
        $extra = Extracurricular::create([
            'code' => 'PANAHAN',
            'name' => 'Klub Panahan',
            'capacity' => 2,
            'waitlist_enabled' => true,
            'approval_required' => false,
            'is_active' => true,
        ]);

        $s1 = Student::create(['student_number' => 'E1', 'name' => 'Santri 1', 'gender' => 'L', 'is_active' => true]);
        $s2 = Student::create(['student_number' => 'E2', 'name' => 'Santri 2', 'gender' => 'L', 'is_active' => true]);
        $s3 = Student::create(['student_number' => 'E3', 'name' => 'Santri 3', 'gender' => 'L', 'is_active' => true]);

        // Reg 1 -> Active
        $m1 = $this->extraService->register($extra, $s1);
        $this->assertEquals('active', $m1->membership_status);

        // Reg 2 -> Active (Cap reached = 2)
        $m2 = $this->extraService->register($extra, $s2);
        $this->assertEquals('active', $m2->membership_status);

        // Reg 3 -> Waitlisted
        $m3 = $this->extraService->register($extra, $s3);
        $this->assertEquals('waitlisted', $m3->membership_status);

        // Resign member 1
        $m1->update(['membership_status' => 'resigned']);

        // Promote waitlisted
        $promoted = $this->extraService->promoteNextWaitlisted($extra);
        $this->assertNotNull($promoted);
        $this->assertEquals($s3->id, $promoted->student_id);
        $this->assertEquals('active', $promoted->fresh()->membership_status);
    }

    /** @test */
    public function test_event_session_generator_and_attendance()
    {
        $event = Event::create([
            'code' => 'SEMINAR-TI',
            'name' => 'Seminar Teknologi Pesantren',
            'start_at' => Carbon::parse('2026-08-25 08:00:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-25 12:00:00', 'Asia/Jakarta'),
            'status' => 'published',
        ]);

        $es1 = EventSession::create([
            'event_id' => $event->id,
            'name' => 'Sesi Pleno Pembukaan',
            'start_at' => Carbon::parse('2026-08-25 08:00:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-25 08:20:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-25 08:40:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-25 10:00:00', 'Asia/Jakarta'),
            'finalization_policy' => 'required',
            'sort_order' => 1,
        ]);

        $student = Student::create(['student_number' => 'EV1', 'name' => 'Peserta Event', 'gender' => 'L', 'is_active' => true]);
        EventRegistration::create([
            'event_id' => $event->id,
            'student_id' => $student->id,
            'status' => 'approved',
        ]);

        // Generate sessions
        $res = $this->eventGenerator->generateForEvent($event);
        $this->assertEquals(1, $res['sessions_created']);

        $attendanceSession = AttendanceSession::where('session_code', "EVT-{$event->id}-SES{$es1->id}")->first();
        $this->assertNotNull($attendanceSession);
        $this->assertCount(1, $attendanceSession->participants);

        // Open session and record attendance
        $attendanceSession->update([
            'status' => SessionStatus::OPEN,
            'end_at' => Carbon::now('Asia/Jakarta')->addHours(2),
        ]);
        $recResult = $this->attendanceService->record(
            session: $attendanceSession,
            student: $student,
            method: AttendanceMethod::QR,
            checkInTime: Carbon::now('Asia/Jakarta')
        );

        $this->assertTrue($recResult->success);
        $this->assertEquals(1, AttendanceRecord::where('attendance_session_id', $attendanceSession->id)->count());
    }
}
