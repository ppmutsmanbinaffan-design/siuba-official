<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceService $attendanceService;
    protected AttendanceSession $session;
    protected Student $student;
    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->attendanceService = new AttendanceService(new AttendanceValidationService());

        $category = ActivityCategory::create([
            'code' => 'KBM',
            'name' => 'Kegiatan Belajar Mengajar',
        ]);

        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'KBM-01',
            'name' => 'KBM Diniyah',
            'location' => 'Kelas 10A',
            'allow_manual' => true,
        ]);

        $this->session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'ATT-KBM-001',
            'session_date' => Carbon::now('Asia/Jakarta')->toDateString(),
            'start_at' => Carbon::now('Asia/Jakarta')->subHours(1),
            'present_until' => Carbon::now('Asia/Jakarta')->addMinutes(30),
            'late_until' => Carbon::now('Asia/Jakarta')->addMinutes(60),
            'end_at' => Carbon::now('Asia/Jakarta')->addHours(2),
            'status' => SessionStatus::OPEN,
        ]);

        $this->student = Student::create([
            'student_number' => '2026001',
            'name' => 'Muhammad Rizqi',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $this->operator = User::create([
            'name' => 'Ustadz Pengajar',
            'username' => 'ustadz.kbm',
            'password' => bcrypt('secret'),
        ]);
    }

    /** @test */
    public function test_can_record_manual_attendance_with_permission_status()
    {
        $result = $this->attendanceService->record(
            session: $this->session,
            student: $this->student,
            method: AttendanceMethod::MANUAL,
            operator: $this->operator,
            overrideStatus: AttendanceStatus::PERMISSION,
            notes: 'Izin urusan keluarga di kampung'
        );

        $this->assertTrue($result->success);
        $this->assertEquals(AttendanceStatus::PERMISSION, $result->attendanceRecord->status);
        $this->assertEquals('Izin urusan keluarga di kampung', $result->attendanceRecord->notes);
        $this->assertDatabaseHas('attendance_records', [
            'student_id' => $this->student->id,
            'status' => 'permission',
        ]);
    }

    /** @test */
    public function test_bulk_manual_attendance_sheet()
    {
        $student2 = Student::create([
            'student_number' => '2026002',
            'name' => 'Zaid bin Tsabit',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $items = [
            [
                'student_id' => $this->student->id,
                'status' => 'present',
                'notes' => null,
            ],
            [
                'student_id' => $student2->id,
                'status' => 'sick',
                'notes' => 'Demam di klinik',
            ],
        ];

        $results = $this->attendanceService->bulkRecord(
            session: $this->session,
            items: $items,
            operator: $this->operator
        );

        $this->assertEquals(2, $results['success_count']);
        $this->assertEquals(0, $results['failed_count']);
        $this->assertEquals(2, AttendanceRecord::where('attendance_session_id', $this->session->id)->count());
    }
}
