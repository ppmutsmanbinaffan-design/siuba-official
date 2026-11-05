<?php

namespace Tests\Unit;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\DeviceType;
use App\Enums\SessionStatus;
use App\Events\AttendanceRecorded;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use App\Services\Attendance\SessionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AttendanceEngineTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceService $attendanceService;
    protected SessionService $sessionService;
    protected Activity $shalatSubuh;
    protected Activity $kbm;
    protected AttendanceSession $openSession;
    protected Student $activeStudent;
    protected Student $inactiveStudent;
    protected AttendanceDevice $rfidDevice;
    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();

        $validator = new AttendanceValidationService();
        $this->attendanceService = new AttendanceService($validator);
        $this->sessionService = new SessionService();

        // 1. Create categories
        $category = ActivityCategory::create([
            'code' => 'IBADAH',
            'name' => 'Ibadah',
            'icon' => 'moon-star',
            'is_active' => true,
        ]);

        // 2. Activity allowing all methods
        $this->shalatSubuh = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'SHALAT-SUBUH',
            'name' => 'Shalat Subuh Berjamaah',
            'location' => 'Masjid Utama',
            'attendance_enabled' => true,
            'allow_manual' => true,
            'allow_qr' => true,
            'allow_rfid' => true,
            'late_tolerance_minutes' => 15,
            'is_active' => true,
        ]);

        // 3. Activity disallowing RFID
        $this->kbm = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'KBM-PAGI',
            'name' => 'KBM Kelas Pagi',
            'location' => 'Gedung Kelas',
            'attendance_enabled' => true,
            'allow_manual' => true,
            'allow_qr' => true,
            'allow_rfid' => false, // Disallow RFID
            'late_tolerance_minutes' => 10,
            'is_active' => true,
        ]);

        // 4. Create Open Session (2026-08-23, 04:15 - 05:00, present_until 04:30, late_until 04:45)
        $today = Carbon::parse('2026-08-23', 'Asia/Jakarta');
        $this->openSession = AttendanceSession::create([
            'activity_id' => $this->shalatSubuh->id,
            'session_code' => 'ATT-20260823-SUBUH-001',
            'session_date' => $today->toDateString(),
            'start_at' => Carbon::parse('2026-08-23 04:15:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-23 04:30:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-23 04:45:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-23 05:00:00', 'Asia/Jakarta'),
            'status' => SessionStatus::OPEN,
            'location' => 'Masjid Utama',
        ]);

        // 5. Active & Inactive Students
        $this->activeStudent = Student::create([
            'student_number' => '202607001',
            'nisn' => '0089123451',
            'name' => 'Ahmad Fauzan',
            'gender' => 'L',
            'qr_token' => 'STU-X7AK29PQ',
            'rfid_uid' => '04A87F12',
            'is_active' => true,
        ]);

        $this->inactiveStudent = Student::create([
            'student_number' => '202607099',
            'name' => 'Santri Non Aktif',
            'gender' => 'L',
            'qr_token' => 'STU-INACTIVE99',
            'rfid_uid' => '04A87F99',
            'is_active' => false,
        ]);

        // 6. Device & Operator
        $this->rfidDevice = AttendanceDevice::create([
            'device_code' => 'MSJ-RFID-01',
            'device_name' => 'RFID Gate Masjid Pintu 1',
            'device_type' => DeviceType::RFID_READER,
            'is_active' => true,
        ]);

        $this->operator = User::create([
            'name' => 'Ustadz Operator',
            'username' => 'operator.masjid',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);
    }

    /** @test */
    public function test_student_can_attend_open_session_on_time()
    {
        Event::fake([AttendanceRecorded::class]);

        $checkInTime = Carbon::parse('2026-08-23 04:25:00', 'Asia/Jakarta');

        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::MANUAL,
            device: null,
            operator: $this->operator,
            checkInTime: $checkInTime
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceResultCode::SUCCESS, $result->code);
        $this->assertEquals(AttendanceStatus::PRESENT, $result->attendanceRecord->status);
        $this->assertEquals(0, $result->attendanceRecord->late_minutes);
        $this->assertEquals($this->operator->id, $result->attendanceRecord->recorded_by);

        Event::assertDispatched(AttendanceRecorded::class);
    }

    /** @test */
    public function test_inactive_student_cannot_attend()
    {
        $checkInTime = Carbon::parse('2026-08-23 04:25:00', 'Asia/Jakarta');

        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->inactiveStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: $checkInTime
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::STUDENT_INACTIVE, $result->code);
        $this->assertDatabaseMissing('attendance_records', [
            'student_id' => $this->inactiveStudent->id,
        ]);
    }

    /** @test */
    public function test_attendance_cannot_be_recorded_twice_duplicate_protection()
    {
        // First check-in: 04:25 manual
        $firstTime = Carbon::parse('2026-08-23 04:25:00', 'Asia/Jakarta');
        $firstResult = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: $firstTime
        );
        $this->assertTrue($firstResult->success);

        // Second check-in: 04:26 QR on same session
        $secondTime = Carbon::parse('2026-08-23 04:26:00', 'Asia/Jakarta');
        $secondResult = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::QR,
            checkInTime: $secondTime
        );

        $this->assertFalse($secondResult->success);
        $this->assertEquals(AttendanceResultCode::ALREADY_RECORDED, $secondResult->code);
        $this->assertEquals(1, AttendanceRecord::where('attendance_session_id', $this->openSession->id)->count());
    }

    /** @test */
    public function test_attendance_with_disallowed_method_is_rejected()
    {
        // Create session on KBM activity (where allow_rfid = false)
        $kbmSession = AttendanceSession::create([
            'activity_id' => $this->kbm->id,
            'session_code' => 'ATT-20260823-KBM-001',
            'session_date' => '2026-08-23',
            'start_at' => Carbon::parse('2026-08-23 07:30:00', 'Asia/Jakarta'),
            'present_until' => Carbon::parse('2026-08-23 07:45:00', 'Asia/Jakarta'),
            'late_until' => Carbon::parse('2026-08-23 08:00:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-23 11:45:00', 'Asia/Jakarta'),
            'status' => SessionStatus::OPEN,
        ]);

        $result = $this->attendanceService->record(
            session: $kbmSession,
            student: $this->activeStudent,
            method: AttendanceMethod::RFID,
            checkInTime: Carbon::parse('2026-08-23 07:35:00', 'Asia/Jakarta')
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::INVALID_METHOD, $result->code);
    }

    /** @test */
    public function test_automatic_late_determination_and_minutes_calculation()
    {
        // Check-in at 04:38 (present_until is 04:30) -> 8 minutes late
        $checkInTime = Carbon::parse('2026-08-23 04:38:00', 'Asia/Jakarta');

        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::RFID,
            device: $this->rfidDevice,
            checkInTime: $checkInTime
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceStatus::LATE, $result->attendanceRecord->status);
        $this->assertEquals(8, $result->attendanceRecord->late_minutes);
        $this->assertEquals($this->rfidDevice->id, $result->attendanceRecord->attendance_device_id);
    }

    /** @test */
    public function test_attendance_after_session_end_time_is_rejected()
    {
        // Session ends at 05:00, check-in at 05:10
        $checkInTime = Carbon::parse('2026-08-23 05:10:00', 'Asia/Jakarta');

        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: $checkInTime
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::OUTSIDE_ATTENDANCE_TIME, $result->code);
    }

    /** @test */
    public function test_closed_session_rejects_attendance()
    {
        $this->openSession->update(['status' => SessionStatus::CLOSED]);

        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: Carbon::parse('2026-08-23 04:20:00', 'Asia/Jakarta')
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::SESSION_CLOSED, $result->code);
    }

    /** @test */
    public function test_qr_token_resolution_and_attendance()
    {
        $result = $this->attendanceService->recordByQrToken(
            session: $this->openSession,
            qrToken: 'STU-X7AK29PQ',
            checkInTime: Carbon::parse('2026-08-23 04:20:00', 'Asia/Jakarta')
        );

        $this->assertTrue($result->success);
        $this->assertEquals($this->activeStudent->id, $result->attendanceRecord->student_id);
        $this->assertEquals(AttendanceMethod::QR, $result->attendanceRecord->method);
    }

    /** @test */
    public function test_rfid_uid_normalization_and_resolution()
    {
        // Input with lowercase and spaces "04 a8 7f 12" -> matches "04A87F12"
        $result = $this->attendanceService->recordByRfidUid(
            session: $this->openSession,
            rawRfidUid: '04 a8 7f 12',
            checkInTime: Carbon::parse('2026-08-23 04:22:00', 'Asia/Jakarta')
        );

        $this->assertTrue($result->success);
        $this->assertEquals($this->activeStudent->id, $result->attendanceRecord->student_id);
        $this->assertEquals(AttendanceMethod::RFID, $result->attendanceRecord->method);
    }

    /** @test */
    public function test_student_not_in_participant_snapshot_is_rejected()
    {
        // Add another student to snapshot
        $otherStudent = Student::create([
            'student_number' => '202607002',
            'name' => 'Usman Harun',
            'gender' => 'L',
            'is_active' => true,
        ]);

        \App\Models\AttendanceSessionParticipant::create([
            'attendance_session_id' => $this->openSession->id,
            'student_id' => $otherStudent->id,
            'eligibility_status' => 'ELIGIBLE',
        ]);

        // Attempt recording with $this->activeStudent who is NOT in the snapshot
        $result = $this->attendanceService->record(
            session: $this->openSession,
            student: $this->activeStudent,
            method: AttendanceMethod::MANUAL,
            checkInTime: Carbon::parse('2026-08-23 04:20:00', 'Asia/Jakarta')
        );

        $this->assertFalse($result->success);
        $this->assertEquals(AttendanceResultCode::STUDENT_NOT_PARTICIPANT, $result->code);
    }
}
