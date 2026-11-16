<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportDatasetApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_dataset_contains_teaching_sessions_records_and_respects_scope(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 06:00:00'));
        $admin = User::create(['username' => 'adm9', 'name' => 'Admin', 'email' => 'a9@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $class = Classroom::factory()->create(['name' => 'VII A']);
        Student::factory()->count(2)->create(['classroom_id' => $class->id, 'is_active' => true]);
        $subject = $this->postJson('/api/v1/academic/subjects', ['code' => 'NHW', 'name' => 'Nahwu'])->json('data');
        $period = $this->postJson('/api/v1/academic/lesson-periods', ['name' => 'JP 1', 'start_time' => '07:00', 'end_time' => '07:40'])->json('data');
        $teacher = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Nahwu'])->json('data');
        $this->postJson('/api/v1/academic/schedules', ['day_of_week' => 'monday', 'classroom_id' => $class->id, 'subject_id' => $subject['id'],
            'teacher_id' => $teacher['id'], 'lesson_period_id' => $period['id']])->assertCreated();
        $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-16'])->assertOk();
        $session = AttendanceSession::latest('id')->first();

        $this->travelTo(Carbon::parse('2026-11-16 07:15:00'));
        $guru = User::find($teacher['id']);
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/open")->assertOk();

        $other = StaffProfile::create(['staff_number' => 'X-1', 'name' => 'Staf Lain', 'staff_type' => 'employee', 'is_active' => true]);
        StaffAttendanceRecord::create(['staff_profile_id' => $other->id, 'attendance_date' => '2026-11-16', 'attendance_type' => 'daily',
            'context_key' => 'daily', 'status' => 'present', 'check_in_at' => '2026-11-16 06:50:00']);

        $d = $this->getJson('/api/v1/reports/staff-dataset?from=2026-11-01&to=2026-11-30')->assertOk()->json('data');
        $this->assertCount(1, $d['teaching_sessions']);
        $ts = $d['teaching_sessions'][0];
        $this->assertSame($session->id, $ts['id']);
        $this->assertSame('Nahwu', $ts['subject_name']);
        $this->assertSame('07:00', $ts['scheduled_start_at']);
        $teachRec = collect($d['records'])->firstWhere('attendance_type', 'teaching');
        $this->assertSame($session->id, $teachRec['context_id']); // laporan mencocokkan presensi ke sesi lewat context_id
        $this->assertSame($ts['scheduled_teacher_staff_id'], $teachRec['staff_id']);
        $this->assertCount(2, $d['records']);

        // Rentang terlalu panjang dipotong 93 hari
        $this->assertTrue($this->getJson('/api/v1/reports/staff-dataset?from=2026-01-01&to=2026-11-30')->json('data.clipped'));

        // Guru hanya melihat datanya sendiri
        Sanctum::actingAs($guru);
        $own = $this->getJson('/api/v1/reports/staff-dataset?from=2026-11-01&to=2026-11-30')->assertOk()->json('data');
        $this->assertCount(1, $own['records']);
        $this->assertCount(1, $own['staff']);
        $this->assertSame('Ustadz Nahwu', $own['staff'][0]['name']);
        $this->assertCount(1, $own['teaching_sessions']);
    }
}
