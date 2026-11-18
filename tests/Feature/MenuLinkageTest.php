<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Halaqah;
use App\Models\HalaqahMember;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use App\Services\Routine\RoutineSessionGenerator;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Keterhubungan antar-menu: Master Kegiatan ↔ Jadwal Rutin ↔ Sesi; Halaqah → peserta; Master SDM → Guru KBM. */
class MenuLinkageTest extends TestCase
{
    use RefreshDatabase;

    private int $catId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $u = User::create(['username' => 'sa', 'name' => 'SA', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->assignRole('super-admin');
        Sanctum::actingAs($u);
        $this->travelTo(Carbon::parse('2026-11-18 08:00:00', 'Asia/Jakarta'));
        $this->catId = ActivityCategory::create(['code' => 'KEGIATAN_RUTIN', 'name' => 'Kegiatan Rutin'])->id;
    }

    private function activity(array $extra): int
    {
        return $this->postJson('/api/v1/activities', array_merge([
            'code' => 'K' . random_int(100, 999), 'name' => 'Kegiatan Uji', 'activity_category_id' => $this->catId,
            'default_start_time' => '19:00', 'default_present_until' => '19:15', 'default_late_until' => '19:30', 'default_end_time' => '20:00',
        ], $extra))->assertSuccessful()->json('data.id');
    }

    private function participantsOf(int $activityId): array
    {
        $s = AttendanceSession::where('activity_id', $activityId)->firstOrFail();

        return $s->participants()->pluck('student_id')->sort()->values()->all();
    }

    public function test_jadwal_rutin_without_target_follows_master_kegiatan_classroom(): void
    {
        $a = Classroom::create(['name' => '10-A', 'code' => '10A', 'level' => '10']);
        $b = Classroom::create(['name' => '10-B', 'code' => '10B', 'level' => '10']);
        $s1 = Student::create(['student_number' => 'S1', 'name' => 'Ahmad', 'gender' => 'L', 'is_active' => true, 'classroom_id' => $a->id]);
        Student::create(['student_number' => 'S2', 'name' => 'Ali', 'gender' => 'L', 'is_active' => true, 'classroom_id' => $b->id]);
        $id = $this->activity(['participant_type' => 'classroom', 'classroom_id' => $a->id]);

        // Jadwal Rutin versi lama menyalin jenis peserta tanpa kelasnya
        $this->putJson('/api/v1/routine-schedules/sync', ['schedules' => [[
            'id' => 'tmp-1', 'activity_id' => $id, 'frequency' => 'daily', 'start_time' => '19:00', 'present_until' => '19:15',
            'late_until' => '19:30', 'end_time' => '20:00', 'participant_type' => 'classroom', 'is_active' => true,
        ]], 'overrides' => []])->assertOk();
        app(RoutineSessionGenerator::class)->generateForDate(Carbon::parse('2026-11-18', 'Asia/Jakarta'));

        $this->assertSame([$s1->id], $this->participantsOf($id), 'hanya santri kelas 10-A, bukan semua santri');
    }

    public function test_halaqah_participant_type_uses_halaqah_members(): void
    {
        $h = Halaqah::create(['code' => 'HQ-1', 'name' => 'Halaqah Utsman']);
        $s1 = Student::create(['student_number' => 'S1', 'name' => 'Ahmad', 'gender' => 'L', 'is_active' => true]);
        Student::create(['student_number' => 'S2', 'name' => 'Ali', 'gender' => 'L', 'is_active' => true]);
        HalaqahMember::create(['halaqah_id' => $h->id, 'student_id' => $s1->id, 'is_active' => true]);

        $id = $this->activity(['participant_type' => 'halaqah', 'halaqah_id' => $h->id]);
        $this->getJson('/api/v1/routine-master')->assertOk()
            ->assertJsonFragment(['id' => $id, 'participant_type' => 'halaqah', 'halaqah_id' => $h->id]);
        $this->postJson("/api/v1/activities/{$id}/quick-schedule", ['frequency' => 'daily'])->assertCreated();

        $this->assertSame([$s1->id], $this->participantsOf($id));
    }

    public function test_staff_teacher_without_account_can_get_guru_account_and_appear_in_kbm(): void
    {
        $staff = StaffProfile::create(['staff_number' => 'NIP-20', 'name' => 'Ustadz Ridwan', 'staff_type' => 'teacher', 'gender' => 'L', 'is_active' => true]);
        $names = fn () => collect($this->getJson('/api/v1/academic/master')->assertOk()->json('data.teachers'))->pluck('name')->all();
        $this->assertNotContains('Ustadz Ridwan', $names());

        $this->patchJson("/api/v1/staff/{$staff->id}", ['create_account' => true, 'account_role' => 'guru'])->assertOk()
            ->assertJsonPath('data.new_account.username', 'nip-20');
        $this->assertContains('Ustadz Ridwan', $names());
    }
}
