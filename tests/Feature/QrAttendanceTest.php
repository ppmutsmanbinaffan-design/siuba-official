<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceService $attendanceService;
    protected AttendanceSession $session;
    protected Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        $category = ActivityCategory::create([
            'code' => 'HALAQAH',
            'name' => 'Halaqah Quran',
        ]);

        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'HQ-SUBUH',
            'name' => 'Halaqah Tahfidz Subuh',
            'allow_qr' => true,
        ]);

        $this->session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'ATT-HQ-001',
            'session_date' => '2026-08-23',
            'start_at' => Carbon::parse('2026-08-23 05:15:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-23 05:30:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-23 05:45:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-23 06:15:00', 'Asia/Jakarta'),
            'status' => SessionStatus::OPEN,
        ]);

        $this->student = Student::create([
            'student_number' => '2026010',
            'name' => 'Abdullah Bin Umar',
            'gender' => 'L',
            'qr_token' => 'STU-QR-XYZ999',
            'is_active' => true,
        ]);
    }

    /** @test */
    public function test_valid_qr_token_records_attendance_instantly()
    {
        $result = $this->attendanceService->recordByQrToken(
            session: $this->session,
            qrToken: 'STU-QR-XYZ999',
            checkInTime: Carbon::parse('2026-08-23 05:20:00', 'Asia/Jakarta')
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceMethod::QR, $result->attendanceRecord->method);
        $this->assertEquals(AttendanceStatus::PRESENT, $result->attendanceRecord->status);
    }

    /** @test */
    public function test_unregistered_qr_token_returns_not_found()
    {
        $result = $this->attendanceService->recordByQrToken(
            session: $this->session,
            qrToken: 'STU-INVALID-TOKEN',
            checkInTime: Carbon::parse('2026-08-23 05:20:00', 'Asia/Jakarta')
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::STUDENT_NOT_FOUND, $result->code);
    }
}
