<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\Extracurricular;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\StudentGroup;
use App\Models\TrainingSession;
use App\Models\User;
use App\Services\Participant\ActivityParticipantResolver;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TrainerApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 15:50:00')); // Senin
        $this->admin = User::create(['username' => 'admin7', 'name' => 'Admin', 'email' => 'a7@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    private function staff(string $no, string $name): StaffProfile
    {
        return StaffProfile::create(['staff_number' => $no, 'name' => $name, 'staff_type' => 'trainer', 'qr_token' => 'STF-' . $no, 'rfid_uid' => 'AA' . $no, 'is_active' => true]);
    }

    public function test_full_trainer_flow(): void
    {
        $coach = $this->staff('101', 'Ust. Panah');
        $sub = $this->staff('102', 'Ust. Pengganti');
        $eks = Extracurricular::create(['code' => 'PNH', 'name' => 'Panahan', 'is_active' => true]);

        $this->postJson('/api/v1/trainer/schedules', ['extracurricular_id' => $eks->id, 'day_of_week' => 1, 'start_time' => '16:00', 'end_time' => '17:30', 'location' => 'Lapangan'])->assertCreated();
        $this->postJson('/api/v1/trainer/assignments', ['extracurricular_id' => $eks->id, 'staff_id' => $coach->id, 'role' => 'coach', 'is_primary' => true])->assertCreated();

        $g = $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-16'])->assertOk()->json('data');
        $this->assertSame(1, $g['sessions_created']);
        $this->assertSame(0, $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-16'])->json('data.sessions_created'));
        $this->assertSame(0, $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-17'])->json('data.sessions_created'));

        // Pengganti hari ini
        $this->postJson('/api/v1/trainer/substitutions', ['extracurricular_id' => $eks->id, 'original_staff_id' => $coach->id, 'substitute_staff_id' => $sub->id, 'date' => '2026-11-16', 'reason' => 'Dinas'])->assertCreated();
        $session = TrainingSession::first();
        $this->assertSame($sub->id, $session->actual_staff_profile_id);

        // Tap kartu pengganti 16:20 -> terlambat 20 menit (toleransi 15)
        $this->travelTo(Carbon::parse('2026-11-16 16:20:00'));
        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'aa:102', 'method' => 'rfid'])->assertOk()->assertJsonPath('data.mode', 'check_in');
        $this->travelTo(Carbon::parse('2026-11-16 17:31:00'));
        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'STF-102'])->assertOk()->assertJsonPath('data.mode', 'check_out');
        $rec = StaffAttendanceRecord::where('attendance_type', 'training')->first();
        $this->assertSame('late', $rec->status);
        $this->assertSame(20, $rec->late_minutes);

        $this->postJson("/api/v1/trainer/sessions/{$session->id}/journal", ['topic' => 'Stance & anchor', 'student_present_count' => 12])->assertOk();

        $ov = $this->getJson('/api/v1/trainer/overview?date=2026-11-16')->assertOk()->json('data');
        $this->assertSame('Ust. Pengganti', $ov['sessions'][0]['actual_primary_staff_name']);
        $this->assertSame('late', $ov['sessions'][0]['trainer_attendance_status']);
        $this->assertSame(1, $ov['summary']['realized_sessions']);
        $this->assertSame(1, $ov['summary']['substituted_count']);
        $this->assertSame($session->id, $ov['records'][0]['context_id']);
        $this->assertFalse($ov['reconciliation'][0]['needs_review']);

        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'TIDAK-ADA'])->assertNotFound();
    }

    public function test_finalize_marks_absent_and_permissions(): void
    {
        $coach = $this->staff('201', 'Ust. Hadroh');
        $eks = Extracurricular::create(['code' => 'HDR', 'name' => 'Hadroh', 'is_active' => true]);
        $this->postJson('/api/v1/trainer/schedules', ['extracurricular_id' => $eks->id, 'day_of_week' => 1, 'start_time' => '16:00', 'end_time' => '17:00'])->assertCreated();
        $this->postJson('/api/v1/trainer/assignments', ['extracurricular_id' => $eks->id, 'staff_id' => $coach->id])->assertCreated();
        $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-16'])->assertOk();
        // Latihan belum selesai → belum boleh ditandai alpa
        $this->postJson('/api/v1/trainer/finalize', ['date' => '2026-11-16'])->assertOk()->assertJsonPath('data.absent_created', 0);
        $this->travelTo(Carbon::parse('2026-11-16 17:30:00'));
        $this->postJson('/api/v1/trainer/finalize', ['date' => '2026-11-16'])->assertOk()->assertJsonPath('data.absent_created', 1);
        $this->assertSame('absent', StaffAttendanceRecord::first()->status);

        $pelatih = User::create(['username' => 'pelatih1', 'name' => 'Pelatih', 'email' => 'p@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $pelatih->assignRole('pelatih');
        Sanctum::actingAs($pelatih);
        $this->getJson('/api/v1/trainer/overview')->assertOk();
        $this->postJson('/api/v1/trainer/schedules', ['extracurricular_id' => $eks->id, 'day_of_week' => 2, 'start_time' => '16:00', 'end_time' => '17:00'])->assertForbidden();
    }

    public function test_student_groups_and_custom_group_participants(): void
    {
        [$a, $b] = Student::factory()->count(2)->create(['is_active' => true]);
        Student::factory()->create(['is_active' => true]);
        $gid = $this->postJson('/api/v1/community/student-groups', ['name' => 'Tim Olimpiade'])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/community/student-groups/{$gid}/members", ['student_id' => $a->id])->assertCreated();
        $this->postJson("/api/v1/community/student-groups/{$gid}/members", ['student_id' => $b->id])->assertCreated();
        $master = $this->getJson('/api/v1/community/master')->json('data');
        $this->assertSame(2, $master['student_groups'][0]['member_count']);

        $act = $this->postJson('/api/v1/activities', ['name' => 'Pembinaan Olimpiade', 'participant_type' => 'custom_group', 'student_group_id' => $gid])->assertCreated()->json('data');
        $resolved = app(ActivityParticipantResolver::class)->resolve(Activity::find($act['id']));
        $this->assertCount(2, $resolved);

        $memberId = collect($master['student_group_members'])->firstWhere('student_id', $b->id)['id'];
        $this->deleteJson("/api/v1/community/student-group-members/{$memberId}")->assertOk();
        $this->assertCount(1, app(ActivityParticipantResolver::class)->resolve(Activity::find($act['id'])));
    }
}
