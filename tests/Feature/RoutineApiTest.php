<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\PrayerTimeCalendar;
use App\Models\RoutineScheduleOverride;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\ActivityCategorySeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoutineApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([RolePermissionSeeder::class, ActivityCategorySeeder::class]);
        $this->travelTo(Carbon::parse('2026-11-16 05:00:00')); // Senin
        $this->admin = User::create(['username' => 'admin3', 'name' => 'Admin', 'email' => 'a3@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    public function test_activity_crud_with_participant_target(): void
    {
        $classA = Classroom::factory()->create(['name' => 'VII A']);
        $classB = Classroom::factory()->create(['name' => 'VII B']);
        Student::factory()->count(2)->create(['classroom_id' => $classA->id, 'is_active' => true, 'gender' => 'L']);
        Student::factory()->create(['classroom_id' => $classA->id, 'is_active' => true, 'gender' => 'P']);
        Student::factory()->create(['classroom_id' => $classB->id, 'is_active' => true, 'gender' => 'L']);

        $act = $this->postJson('/api/v1/activities', [
            'name' => 'Muhadharah VII A', 'category_name' => 'Ibadah', 'participant_type' => 'classroom', 'classroom_id' => $classA->id,
            'participant_gender' => 'male', 'default_start_time' => '19:30', 'default_present_until' => '19:40',
            'default_late_until' => '19:50', 'default_end_time' => '21:00', 'allow_qr' => false,
        ])->assertCreated()->json('data');
        $this->assertSame('classroom', $act['participant_type']);
        $this->assertSame($classA->id, $act['classroom_id']);
        $this->assertSame('19:30', $act['default_start_time']);
        $this->assertFalse($act['allow_qr']);

        // Sesi manual memakai jam bawaan + peserta (VII A, putra) = 2 santri
        $ses = $this->postJson('/api/v1/attendance/sessions', ['activity_id' => $act['id'], 'session_date' => '2026-11-16'])
            ->assertCreated()->json('data');
        $this->assertSame(2, AttendanceSessionParticipant::where('attendance_session_id', $ses['id'])->count());
        $this->assertStringContainsString('19:30', AttendanceSession::find($ses['id'])->start_at->format('H:i'));

        // Ubah ke semua santri -> rule dikelola kegiatan dihapus
        $this->putJson("/api/v1/activities/{$act['id']}", ['participant_type' => 'all_students', 'participant_gender' => 'all'])->assertOk();
        $ses2 = $this->postJson('/api/v1/attendance/sessions', ['activity_id' => $act['id']])->assertCreated()->json('data');
        $this->assertSame(4, AttendanceSessionParticipant::where('attendance_session_id', $ses2['id'])->count());

        // Hapus: punya riwayat sesi -> hanya dinonaktifkan
        $this->deleteJson("/api/v1/activities/{$act['id']}")->assertOk();
        $this->assertFalse((bool) Activity::find($act['id'])->is_active);
    }

    public function test_routine_sync_and_server_generation(): void
    {
        $dorm = Dormitory::create(['code' => 'ASR-1', 'name' => 'Asrama Abu Bakar', 'gender' => 'L', 'is_active' => true]);
        $room = DormitoryRoom::create(['dormitory_id' => $dorm->id, 'code' => 'K-1', 'name' => 'Kamar 1', 'capacity' => 10, 'is_active' => true]);
        Student::factory()->count(2)->create(['dormitory_room_id' => $room->id, 'is_active' => true]);
        Student::factory()->create(['dormitory_room_id' => null, 'is_active' => true]);

        $subuh = $this->postJson('/api/v1/activities', ['name' => 'Shalat Subuh', 'code' => 'SUBUH'])->assertCreated()->json('data');
        $malam = $this->postJson('/api/v1/activities', ['name' => 'Absen Malam Asrama', 'code' => 'MALAM', 'participant_type' => 'dormitory', 'dormitory_id' => $dorm->id])
            ->assertCreated()->json('data');

        $tmpDaily = 1763300000001;
        $tmpFri = 1763300000002;
        $this->putJson('/api/v1/routine-schedules/sync', [
            'schedules' => [
                ['id' => $tmpDaily, 'activity_id' => $subuh['id'], 'frequency' => 'daily', 'start_time' => '04:20', 'present_until' => '04:30', 'late_until' => '04:45', 'end_time' => '05:00', 'auto_generate_session' => true, 'is_active' => true],
                ['id' => $tmpFri, 'activity_id' => $malam['id'], 'frequency' => 'selected_days', 'days_of_week' => ['monday', 'friday'], 'start_time' => '21:30', 'present_until' => '21:40', 'late_until' => '21:50', 'end_time' => '00:30', 'location' => 'Asrama', 'auto_generate_session' => true, 'is_active' => true],
            ],
            'overrides' => [['routine_schedule_id' => $tmpDaily, 'override_date' => '2026-11-17', 'override_type' => 'cancelled', 'reason' => 'Libur']],
            'prayer_calendars' => [['date' => '2026-11-16', 'subuh' => '04:15', 'dzuhur' => '11:45', 'ashar' => '15:05', 'maghrib' => '17:50', 'isya' => '19:02']],
            'supervisors' => [['activity_id' => $subuh['id'], 'user_id' => $this->admin->id, 'role_type' => 'Petugas Masjid']],
        ])->assertOk();
        $this->assertSame(2, ActivitySchedule::count());
        $this->assertSame(1, RoutineScheduleOverride::count());
        $this->assertSame(1, PrayerTimeCalendar::count());

        $master = $this->getJson('/api/v1/routine-master')->assertOk()->json('data');
        $sch = collect($master['routine_schedules'])->firstWhere('activity_id', $malam['id']);
        $this->assertSame(['monday', 'friday'], $sch['days_of_week']);
        $this->assertSame('selected_days', $sch['frequency']);
        $this->assertSame('04:15', $master['prayer_calendars'][0]['subuh']);
        $this->assertSame('Petugas Masjid', $master['supervisors'][0]['role_type']);

        // Senin: subuh (3 santri) + malam asrama (2 santri), lewat tengah malam
        $g = $this->postJson('/api/v1/routine-schedules/generate', ['date' => '2026-11-16'])->assertOk()->json('data');
        $this->assertSame(2, $g['created']);
        $malamSes = AttendanceSession::where('activity_id', $malam['id'])->first();
        $this->assertSame(2, $malamSes->participants()->count());
        $this->assertSame('2026-11-17 00:30', $malamSes->end_at->format('Y-m-d H:i'));
        $this->assertSame('Asrama', $malamSes->location);
        $this->assertSame(0, $this->postJson('/api/v1/routine-schedules/generate', ['date' => '2026-11-16'])->json('data.created'));

        // Selasa: subuh dibatalkan, malam bukan harinya
        $this->assertSame(0, $this->postJson('/api/v1/routine-schedules/generate', ['date' => '2026-11-17'])->json('data.created'));

        // Jadwal yang dihapus dari aplikasi ikut terhapus
        $keepId = ActivitySchedule::where('activity_id', $subuh['id'])->value('id');
        $this->putJson('/api/v1/routine-schedules/sync', ['schedules' => [
            ['id' => $keepId, 'activity_id' => $subuh['id'], 'frequency' => 'daily', 'start_time' => '04:20', 'present_until' => '04:30', 'late_until' => '04:45', 'end_time' => '05:00'],
        ]])->assertOk();
        $this->assertSame(1, ActivitySchedule::count());
        $this->assertNull($malamSes->fresh()->activity_schedule_id);
    }

    public function test_permissions(): void
    {
        $guru = User::create(['username' => 'guru9', 'name' => 'Guru', 'email' => 'g9@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);
        $this->postJson('/api/v1/activities', ['name' => 'X'])->assertForbidden();
        $this->putJson('/api/v1/routine-schedules/sync', ['schedules' => []])->assertForbidden();
        $this->postJson('/api/v1/routine/generate-sessions', ['date' => '2026-11-16'])->assertForbidden();
    }
}
