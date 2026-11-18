<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MasterDataAndDeviceApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 07:05:00'));
        $this->admin = User::create(['username' => 'admin8', 'name' => 'Admin', 'email' => 'a8@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
        config(['services.nexabsen.key' => str_repeat('k', 40)]);
    }

    public function test_classroom_dormitory_room_crud(): void
    {
        $wali = User::create(['username' => 'wali', 'name' => 'Ustadz Wali', 'email' => 'w@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $cid = $this->postJson('/api/v1/classrooms', ['name' => 'VIII C', 'grade_level' => 8, 'homeroom_teacher' => 'Ustadz Wali', 'capacity' => 28])->assertCreated()->json('data.id');
        $this->assertSame($wali->id, Classroom::find($cid)->homeroom_teacher_id);
        $this->postJson('/api/v1/classrooms', ['name' => 'VIII C', 'grade_level' => 8])->assertStatus(409);
        $this->putJson("/api/v1/classrooms/{$cid}", ['name' => 'VIII C Putra'])->assertOk();
        $row = collect($this->getJson('/api/v1/classrooms')->json('data'))->firstWhere('id', $cid);
        $this->assertSame('VIII C Putra', $row['name']);
        $this->assertSame('Ustadz Wali', $row['homeroom_teacher']);

        $did = $this->postJson('/api/v1/dormitories', ['name' => 'Asrama Umar', 'gender' => 'L'])->assertCreated()->json('data.id');
        $rid = $this->postJson('/api/v1/dormitory-rooms', ['dormitory_id' => $did, 'name' => 'Kamar 1', 'capacity' => 12])->assertCreated()->json('data.id');
        $s = Student::factory()->create(['classroom_id' => $cid, 'dormitory_room_id' => $rid]);
        $this->deleteJson("/api/v1/dormitories/{$did}")->assertStatus(409); // masih dihuni
        $this->deleteJson("/api/v1/dormitory-rooms/{$rid}")->assertOk();
        $this->assertNull($s->fresh()->dormitory_room_id);
        $this->deleteJson("/api/v1/dormitories/{$did}")->assertOk();

        // Kelas yang dipakai jadwal KBM hanya dinonaktifkan
        $subject = $this->postJson('/api/v1/academic/subjects', ['code' => 'FIQ', 'name' => 'Fiqih'])->assertCreated()->json('data');
        $period = $this->postJson('/api/v1/academic/lesson-periods', ['name' => 'JP 1', 'start_time' => '07:00', 'end_time' => '07:40'])->assertCreated()->json('data');
        $teacher = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Fiqih'])->assertCreated()->json('data');
        $this->postJson('/api/v1/academic/schedules', ['day_of_week' => 'monday', 'classroom_id' => $cid, 'subject_id' => $subject['id'],
            'teacher_id' => $teacher['id'], 'lesson_period_id' => $period['id']])->assertCreated();
        $this->deleteJson("/api/v1/classrooms/{$cid}")->assertOk();
        $this->assertFalse((bool) Classroom::find($cid)->is_active);

        $guru = User::create(['username' => 'g8', 'name' => 'G', 'email' => 'g8@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);
        $this->postJson('/api/v1/classrooms', ['name' => 'IX', 'grade_level' => 9])->assertForbidden();
        $this->postJson('/api/v1/dormitories', ['name' => 'X', 'gender' => 'L'])->assertForbidden();
    }

    public function test_device_registration_token_mode_and_locked_session(): void
    {
        $token = 'sec_live_' . str_repeat('ab', 24);
        $dev = $this->postJson('/api/v1/devices', ['device_code' => 'gerbang-1', 'device_name' => 'Gerbang', 'device_token' => $token])
            ->assertCreated()->json('data');
        $this->assertSame('GERBANG-1', $dev['device_code']);
        $this->assertTrue($dev['is_active']);
        $this->assertTrue($dev['has_device_token']);

        $student = Student::factory()->create(['rfid_uid' => 'CAFE01', 'is_active' => true]);
        $s1 = AttendanceSession::factory()->create(['session_date' => '2026-11-16', 'status' => SessionStatus::OPEN,
            'start_at' => '2026-11-16 06:00', 'present_until' => '2026-11-16 09:00', 'late_until' => '2026-11-16 10:00', 'end_at' => '2026-11-16 11:00']);
        $s2 = AttendanceSession::factory()->create(['session_date' => '2026-11-16', 'status' => SessionStatus::OPEN,
            'start_at' => '2026-11-16 06:30', 'present_until' => '2026-11-16 09:00', 'late_until' => '2026-11-16 10:00', 'end_at' => '2026-11-16 11:00']);

        // Token salah & tanpa kunci -> ditolak
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-DEVICE-TOKEN' => 'salah-salah-salah-salah-salah'])->assertStatus(401);

        // Mode pendaftaran kartu: tidak mencatat absensi, UID disimpan untuk halaman registrasi
        $this->patchJson("/api/v1/devices/{$dev['id']}", ['mode' => 'enrollment'])->assertOk();
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-DEVICE-TOKEN' => $token])
            ->assertOk()->assertJsonPath('code', 'ENROLLMENT_SCAN');
        $this->assertSame('CAFE01', Cache::get('last_scanned_rfid')['uid']);
        $this->assertSame(0, \App\Models\AttendanceRecord::count());

        // Mode perawatan: ditolak
        $this->patchJson("/api/v1/devices/{$dev['id']}", ['mode' => 'maintenance'])->assertOk();
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-DEVICE-TOKEN' => $token])->assertStatus(423);

        // Dikunci ke sesi s1 (bukan sesi terbaru s2) -> tercatat di s1, memakai kunci global (firmware lama)
        $this->patchJson("/api/v1/devices/{$dev['id']}", ['mode' => 'attendance', 'current_session_id' => $s1->id])->assertOk();
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-GLOBAL-KEY' => str_repeat('k', 40)])->assertOk();
        $this->assertSame($s1->id, \App\Models\AttendanceRecord::first()->attendance_session_id);

        // Ganti token: token lama tidak berlaku
        $new = 'dev_' . str_repeat('cd', 24);
        $this->postJson("/api/v1/devices/{$dev['id']}/token", ['device_token' => $new])->assertOk();
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-DEVICE-TOKEN' => $token])->assertStatus(401);
        $this->postJson('/api/tap.php', ['uid' => 'CAFE01', 'device_id' => 'GERBANG-1'], ['X-DEVICE-TOKEN' => $new])->assertSuccessful();
    }

    public function test_admin_seeder_does_not_reset_existing_passwords(): void
    {
        putenv('ADMIN_DEFAULT_PASSWORD=AwalAwal123');
        $_ENV['ADMIN_DEFAULT_PASSWORD'] = $_SERVER['ADMIN_DEFAULT_PASSWORD'] = 'AwalAwal123';
        $this->seed(AdminUserSeeder::class);
        $sa = User::firstWhere('username', 'superadmin');
        $this->assertTrue(Hash::check('AwalAwal123', $sa->password));
        $sa->update(['password' => 'SudahDiganti123', 'name' => 'Nama Baru']);

        $this->seed(AdminUserSeeder::class);
        $sa->refresh();
        $this->assertTrue(Hash::check('SudahDiganti123', $sa->password));
        $this->assertSame('Nama Baru', $sa->name);
        $this->assertTrue($sa->hasRole('super-admin'));
        // akun contoh berisi nama orang tidak lagi dibuat
        $this->assertNull(User::firstWhere('username', 'pimpinan.pondok'));
        putenv('ADMIN_DEFAULT_PASSWORD');
        unset($_ENV['ADMIN_DEFAULT_PASSWORD'], $_SERVER['ADMIN_DEFAULT_PASSWORD']);
    }
}
