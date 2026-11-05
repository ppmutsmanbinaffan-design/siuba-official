<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParticipantSnapshotTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceService $attendanceService;
    protected AttendanceSession $session;
    protected Student $registeredStudent;
    protected Student $unregisteredStudent;

    protected function setUp(): void
    {
        parent::setUp();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        $category = ActivityCategory::create([
            'code' => 'EXTRA',
            'name' => 'Ekstrakurikuler',
        ]);

        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'EXTRA-PANAHAN',
            'name' => 'Klub Panahan Santri',
            'allow_manual' => true,
            'allow_qr' => true,
        ]);

        $this->session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'ATT-PANAHAN-001',
            'session_date' => '2026-08-23',
            'start_at' => Carbon::parse('2026-08-23 16:00:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-23 16:15:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-23 16:30:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-23 17:30:00', 'Asia/Jakarta'),
            'status' => SessionStatus::OPEN,
        ]);

        $this->registeredStudent = Student::create([
            'student_number' => '2026101',
            'name' => 'Saad bin Abi Waqqash',
            'gender' => 'L',
            'qr_token' => 'STU-PANAH-01',
            'is_active' => true,
        ]);

        $this->unregisteredStudent = Student::create([
            'student_number' => '2026999',
            'name' => 'Santri Luar Klub',
            'gender' => 'L',
            'qr_token' => 'STU-LUAR-99',
            'is_active' => true,
        ]);

        // Register participant snapshot
        AttendanceSessionParticipant::create([
            'attendance_session_id' => $this->session->id,
            'student_id' => $this->registeredStudent->id,
            'participant_source' => 'extracurricular_group',
            'eligibility_status' => 'ELIGIBLE',
        ]);
    }

    /** @test */
    public function test_registered_participant_can_attend()
    {
        $result = $this->attendanceService->record(
            session: $this->session,
            student: $this->registeredStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: Carbon::parse('2026-08-23 16:05:00', 'Asia/Jakarta')
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceStatus::PRESENT, $result->attendanceRecord->status);
    }

    /** @test */
    public function test_unregistered_student_is_rejected_with_student_not_participant()
    {
        $result = $this->attendanceService->record(
            session: $this->session,
            student: $this->unregisteredStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: Carbon::parse('2026-08-23 16:05:00', 'Asia/Jakarta')
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::STUDENT_NOT_PARTICIPANT, $result->code);
    }
}
