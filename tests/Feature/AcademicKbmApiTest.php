<?php

namespace Tests\Feature;

use App\Models\AcademicSessionContext;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\StaffAttendanceRecord;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicKbmApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 06:00:00')); // Senin
        $admin = User::create(['username' => 'kurikulum', 'name' => 'Waka Kurikulum', 'email' => 'k@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
    }

    private function setupTimetable(): array
    {
        $class = Classroom::factory()->create(['name' => 'VII A']);
        Student::factory()->count(3)->create(['classroom_id' => $class->id, 'is_active' => true]);

        $subject = $this->postJson('/api/v1/academic/subjects', ['code' => 'fiq', 'name' => 'Fiqih', 'category' => 'DINYYAH'])->assertCreated()->json('data');
        $this->assertSame('FIQ', $subject['code']);

        $period = $this->postJson('/api/v1/academic/lesson-periods', ['name' => 'JP 1', 'start_time' => '07:00', 'end_time' => '07:40'])->assertCreated()->json('data');
        $this->assertSame('07:00', $period['start_time']);

        $teacher = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Hamzah', 'employee_number' => 'NIP-77', 'gender' => 'male'])->assertCreated()->json('data');
        $this->assertNotEmpty($teacher['initial_password']);
        $this->assertTrue(Hash::check($teacher['initial_password'], User::find($teacher['id'])->password));
        $this->assertNotNull($teacher['staff_id']);

        $schedule = $this->postJson('/api/v1/academic/schedules', [
            'day_of_week' => 'monday', 'classroom_id' => $class->id, 'subject_id' => $subject['id'],
            'teacher_id' => $teacher['id'], 'lesson_period_id' => $period['id'], 'room_location' => 'R. 7A',
        ])->assertCreated()->json('data');
        $this->assertSame('monday', $schedule['day_of_week']);

        return compact('class', 'subject', 'period', 'teacher', 'schedule');
    }

    public function test_master_crud_conflicts_and_generate_sessions(): void
    {
        $t = $this->setupTimetable();

        // Kelas yang sama di jam yang sama -> bentrok
        $this->postJson('/api/v1/academic/schedules', [
            'day_of_week' => 'monday', 'classroom_id' => $t['class']->id, 'subject_id' => $t['subject']['id'],
            'teacher_id' => $t['teacher']['id'], 'lesson_period_id' => $t['period']['id'],
        ])->assertStatus(409)->assertJsonPath('error.code', 'CLASSROOM_CONFLICT');

        $this->postJson('/api/v1/academic/assignments', ['classroom_id' => $t['class']->id, 'subject_id' => $t['subject']['id'], 'teacher_id' => $t['teacher']['id'], 'weekly_periods' => 3])
            ->assertCreated();

        $gen = $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-16'])->assertOk()->json('data');
        $this->assertSame(1, $gen['created']);
        $this->assertSame(1, $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-16'])->json('data.existing'), 'Generate aman diulang');

        $master = $this->getJson('/api/v1/academic/master')->assertOk()->json('data');
        $this->assertCount(1, $master['academic_schedules']);
        $this->assertCount(1, $master['session_contexts']);
        $this->assertCount(1, $master['teachers']);
        $this->assertSame('normal', $master['lesson_periods'][0]['day_type']);
        $this->assertTrue($master['academic_years'][0]['is_active'], 'Tahun ajaran aktif dibuat otomatis');

        // Libur di kalender -> tidak ada sesi
        $this->postJson('/api/v1/academic/calendar-events', ['name' => 'Libur Maulid', 'type' => 'holiday', 'date_start' => '2026-11-23', 'date_end' => '2026-11-23'])->assertCreated();
        $this->assertSame(['2026-11-23'], $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-23'])->json('data.holidays'));

        // Mapel yang dipakai jadwal hanya dinonaktifkan
        $this->deleteJson("/api/v1/academic/subjects/{$t['subject']['id']}")->assertOk()->assertJsonPath('data.is_active', false);
    }

    public function test_substitution_and_teaching_attendance_on_open_close(): void
    {
        $t = $this->setupTimetable();
        $sub = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Pengganti'])->json('data');
        $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-16'])->assertOk();
        $session = AttendanceSession::first();

        $this->postJson('/api/v1/academic/substitutions', ['academic_schedule_id' => $t['schedule']['id'], 'substitute_teacher_id' => $sub['id'], 'date' => '2026-11-16', 'reason' => 'Sakit'])
            ->assertCreated();
        $this->assertSame($sub['id'], AcademicSessionContext::first()->teaching_teacher_id);

        $this->travelTo(Carbon::parse('2026-11-16 07:20:00'));
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/open")->assertOk();
        $rec = StaffAttendanceRecord::where('attendance_type', 'teaching')->first();
        $this->assertNotNull($rec);
        $this->assertSame($sub['staff_id'], $rec->staff_profile_id, 'Presensi mengajar tercatat untuk guru pengganti');
        $this->assertSame('late', $rec->status);

        $this->travelTo(Carbon::parse('2026-11-16 07:40:00'));
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/close")->assertOk();
        $this->assertNotNull($rec->fresh()->check_out_at);

        $this->getJson('/api/v1/staff-attendance/daily?date=2026-11-16&type=teaching')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_guru_cannot_change_master_data(): void
    {
        $guru = User::create(['username' => 'g', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);

        $this->postJson('/api/v1/academic/subjects', ['code' => 'X', 'name' => 'X'])->assertStatus(403);
        $this->postJson('/api/v1/academic/teachers', ['name' => 'Penyusup'])->assertStatus(403);
    }
}
