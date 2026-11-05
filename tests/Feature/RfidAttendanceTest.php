<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\DeviceType;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfidAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceService $attendanceService;
    protected AttendanceSession $session;
    protected Student $student;
    protected AttendanceDevice $device;

    protected function setUp(): void
    {
        parent::setUp();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        $category = ActivityCategory::create([
            'code' => 'IBADAH',
            'name' => 'Ibadah Shalat',
        ]);

        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'SHALAT-ISYA',
            'name' => 'Shalat Isya Berjamaah',
            'allow_rfid' => true,
        ]);

        $this->session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'ATT-ISYA-001',
            'session_date' => '2026-08-23',
            'start_at' => Carbon::parse('2026-08-23 19:15:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-23 19:30:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-23 19:45:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-23 20:15:00', 'Asia/Jakarta'),
            'status' => SessionStatus::OPEN,
        ]);

        $this->student = Student::create([
            'student_number' => '2026020',
            'name' => 'Bilal bin Rabah',
            'gender' => 'L',
            'rfid_uid' => '04A87F12',
            'is_active' => true,
        ]);

        $this->device = AttendanceDevice::create([
            'device_code' => 'RFID-GATE-1',
            'device_name' => 'Gate Masjid Pintu Barat',
            'device_type' => DeviceType::RFID_READER,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function test_raw_rfid_tap_is_normalized_and_recorded()
    {
        // Unformatted tap " 04:a8:7f:12 " matches "04A87F12"
        $result = $this->attendanceService->recordByRfidUid(
            session: $this->session,
            rawRfidUid: ' 04:a8:7f:12 ',
            device: $this->device,
            checkInTime: Carbon::parse('2026-08-23 19:20:00', 'Asia/Jakarta')
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceMethod::RFID, $result->attendanceRecord->method);
        $this->assertEquals($this->device->id, $result->attendanceRecord->attendance_device_id);
    }

    /** @test */
    public function test_unregistered_rfid_returns_not_found()
    {
        $result = $this->attendanceService->recordByRfidUid(
            session: $this->session,
            rawRfidUid: 'UNKNOWN123',
            device: $this->device
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::STUDENT_NOT_FOUND, $result->code);
    }
}
