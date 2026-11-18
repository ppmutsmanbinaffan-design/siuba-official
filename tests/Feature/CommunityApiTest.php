<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceSessionParticipant;
use App\Models\DutyRoster;
use App\Models\EventAttendanceSessionContext;
use App\Models\Halaqah;
use App\Models\HalaqahMember;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommunityApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 07:00:00'));
        $this->admin = User::create(['username' => 'admin2', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    public function test_extracurricular_with_capacity_and_waitlist(): void
    {
        [$s1, $s2] = Student::factory()->count(2)->create(['is_active' => true]);
        $eks = $this->postJson('/api/v1/community/extracurriculars', ['name' => 'Pramuka', 'capacity' => 1, 'coach_id' => $this->admin->id])
            ->assertCreated()->json('data');
        $this->assertStringStartsWith('EKS-', $eks['code']);

        $this->postJson("/api/v1/community/extracurriculars/{$eks['id']}/members", ['student_id' => $s1->id])->assertCreated()
            ->assertJsonPath('data.membership_status', 'active');
        $m2 = $this->postJson("/api/v1/community/extracurriculars/{$eks['id']}/members", ['student_id' => $s2->id])->assertCreated()
            ->assertJsonPath('data.membership_status', 'waitlisted')->json('data');

        $this->deleteJson("/api/v1/community/extracurricular-members/{$m2['id']}")->assertOk();
        $master = $this->getJson('/api/v1/community/master')->assertOk()->json('data');
        $this->assertCount(1, $master['extracurriculars']);
        $this->assertSame('Admin', $master['extracurriculars'][0]['coach_name']);
        $this->assertSame('removed', collect($master['extracurricular_members'])->firstWhere('id', $m2['id'])['membership_status']);
    }

    public function test_halaqah_and_duty_roster_sync(): void
    {
        [$s1, $s2] = Student::factory()->count(2)->create(['is_active' => true]);
        $tmpId = 1763270000000; // id sementara dari browser

        $this->putJson('/api/v1/community/halaqahs', [
            'halaqahs' => [['id' => $tmpId, 'code' => 'hlq-a', 'name' => 'Halaqah Abu Bakar', 'supervisor_id' => $this->admin->id, 'is_active' => true]],
            'members' => [['halaqah_id' => $tmpId, 'student_id' => $s1->id, 'is_active' => true], ['halaqah_id' => $tmpId, 'student_id' => $s2->id, 'is_active' => true]],
        ])->assertOk();
        $h = Halaqah::firstWhere('code', 'HLQ-A');
        $this->assertSame(2, HalaqahMember::where('halaqah_id', $h->id)->where('is_active', true)->count());

        // Ubah nama (pakai id server) + keluarkan s2
        $this->putJson('/api/v1/community/halaqahs', [
            'halaqahs' => [['id' => $h->id, 'code' => 'HLQ-A', 'name' => 'Halaqah Umar', 'is_active' => true]],
            'members' => [['halaqah_id' => $h->id, 'student_id' => $s1->id, 'is_active' => true]],
        ])->assertOk();
        $this->assertSame('Halaqah Umar', $h->fresh()->name);
        $this->assertSame(1, Halaqah::count());
        $this->assertFalse((bool) HalaqahMember::where('student_id', $s2->id)->first()->is_active);

        // Piket
        $cat = ActivityCategory::firstOrCreate(['code' => 'RUTIN'], ['name' => 'Rutin']);
        $act = Activity::create(['activity_category_id' => $cat->id, 'code' => 'PIKET-PAGI', 'name' => 'Piket Pagi']);
        $this->putJson('/api/v1/community/duty-rosters', ['rosters' => [
            ['activity_id' => $act->id, 'date' => '2026-11-17', 'student_id' => $s1->id, 'role' => 'Kebersihan'],
            ['activity_id' => $act->id, 'date' => '2026-11-17', 'student_id' => $s2->id, 'role' => 'Muadzin'],
        ]])->assertOk();
        $this->assertSame(2, DutyRoster::count());
        $this->putJson('/api/v1/community/duty-rosters', ['rosters' => [
            ['activity_id' => $act->id, 'date' => '2026-11-17', 'student_id' => $s1->id, 'role' => 'Imam'],
        ]])->assertOk();
        $this->assertSame(1, DutyRoster::count());
        $this->assertSame('Imam', DutyRoster::first()->role);

        $this->putJson('/api/v1/community/duty-rosters', ['rosters' => [['activity_id' => 99999, 'date' => '2026-11-17', 'student_id' => $s1->id]]])
            ->assertStatus(422);
    }

    public function test_event_flow_creates_attendance_session_with_registered_students(): void
    {
        [$s1, $s2] = Student::factory()->count(2)->create(['is_active' => true]);
        $ev = $this->postJson('/api/v1/community/events', [
            'name' => 'Seminar Parenting', 'start_at' => '2026-11-20 08:00', 'end_at' => '2026-11-20 12:00', 'location' => 'Aula', 'capacity' => 1,
        ])->assertCreated()->json('data');
        $this->assertNotNull($ev['activity_id']);

        $this->postJson("/api/v1/community/events/{$ev['id']}/registrations", ['student_id' => $s1->id])->assertCreated()->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/v1/community/events/{$ev['id']}/registrations", ['student_id' => $s2->id])->assertCreated()->assertJsonPath('data.status', 'waitlisted');

        $es = $this->postJson("/api/v1/community/events/{$ev['id']}/sessions", [
            'name' => 'Sesi 1', 'start_at' => '2026-11-20 08:00', 'end_at' => '2026-11-20 10:00', 'present_until' => '08:15', 'late_until' => '08:30',
        ])->assertCreated()->json('data');
        $this->assertNotNull($es['attendance_session_id']);
        $this->assertSame('08:15', $es['present_until']);
        $this->assertSame(1, AttendanceSessionParticipant::where('attendance_session_id', $es['attendance_session_id'])->count());

        // Peserta tunggu disetujui -> ikut masuk sesi absensi yang belum ditutup
        $reg2 = collect($this->getJson('/api/v1/community/master')->json('data.event_registrations'))->firstWhere('student_id', $s2->id);
        $this->postJson("/api/v1/community/event-registrations/{$reg2['id']}/status", ['status' => 'approved'])->assertOk();
        $this->assertSame(2, AttendanceSessionParticipant::where('attendance_session_id', $es['attendance_session_id'])->count());
        $this->assertSame(1, EventAttendanceSessionContext::count());

        $rule = $this->postJson("/api/v1/community/events/{$ev['id']}/rules", ['rule_type' => 'classroom', 'rule_value' => 'VII A'])->assertCreated()->json('data');
        $this->assertSame('VII A', $rule['rule_value']);
        $this->assertCount(1, $this->getJson('/api/v1/community/master')->json('data.participant_rules'));
        $this->deleteJson("/api/v1/community/event-rules/{$rule['id']}")->assertOk();

        $this->postJson("/api/v1/community/events/{$ev['id']}/status", ['status' => 'ongoing'])->assertOk()->assertJsonPath('data.status', 'ongoing');
    }

    public function test_permissions_and_settings_access(): void
    {
        $guru = User::create(['username' => 'guru1', 'name' => 'Guru', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        $this->assertFalse($guru->can('system.settings'));
        Sanctum::actingAs($guru);
        $this->postJson('/api/v1/community/extracurriculars', ['name' => 'X'])->assertForbidden();
        $this->postJson('/api/v1/community/events', ['name' => 'X', 'start_at' => '2026-11-20 08:00', 'end_at' => '2026-11-20 09:00'])->assertForbidden();

        $musyrif = User::create(['username' => 'musyrif1', 'name' => 'Musyrif', 'email' => 'm@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $musyrif->assignRole('musyrif');
        Sanctum::actingAs($musyrif);
        $this->putJson('/api/v1/community/duty-rosters', ['rosters' => []])->assertOk();
        $this->putJson('/api/v1/community/halaqahs', ['halaqahs' => []])->assertForbidden();
        $this->getJson('/api/v1/community/master')->assertOk();

        $this->assertTrue($this->admin->fresh()->can('system.settings'));
    }
}
