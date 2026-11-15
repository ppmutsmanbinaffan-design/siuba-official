<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression test untuk perbaikan keamanan (security-hardening).
 * Memastikan endpoint sensitif tidak bisa diakses tanpa login / izin.
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private const IOT_KEY = 'test-iot-key-1234567890';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        config(['services.nexabsen.key' => self::IOT_KEY, 'services.nexabsen.master_admin_uid' => null]);
    }

    private function userWithRole(string $role, string $username): User
    {
        $u = User::create([
            'username' => $username,
            'name' => ucfirst($username),
            'email' => "{$username}@test.local",
            'password' => 'Rahasia123!',
            'is_active' => true,
        ]);
        $u->assignRole($role);
        return $u;
    }

    // ---------------------------------------------------------------- IoT

    public function test_iot_admin_endpoints_require_login(): void
    {
        $s = Student::factory()->create(['rfid_uid' => 'AABBCCDD']);

        $this->getJson('/api/v1/iot/students')->assertStatus(401);
        $this->getJson('/api/v1/iot/last-scan')->assertStatus(401);
        $this->postJson('/api/v1/iot/register-rfid', ['student_id' => $s->id, 'rfid_uid' => '11223344'])->assertStatus(401);
        $this->postJson('/api/v1/iot/unregister-rfid', ['student_id' => $s->id])->assertStatus(401);

        $this->assertSame('AABBCCDD', $s->fresh()->rfid_uid);
    }

    public function test_iot_admin_endpoints_work_for_admin(): void
    {
        Student::factory()->create(['rfid_uid' => 'AABBCCDD']);
        Sanctum::actingAs($this->userWithRole('admin', 'admin1'));

        $this->getJson('/api/v1/iot/students')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_rfid_tap_requires_device_key(): void
    {
        Student::factory()->create(['rfid_uid' => 'AABBCCDD', 'is_active' => true]);

        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABBCCDD'])->assertStatus(401);
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABBCCDD'], ['X-GLOBAL-KEY' => 'salah'])->assertStatus(401);
        $this->assertSame(0, AttendanceRecord::count());

        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABBCCDD'], ['X-GLOBAL-KEY' => self::IOT_KEY])
            ->assertOk()->assertJsonPath('code', 'SUCCESS');
        $this->assertSame(1, AttendanceRecord::count());
    }

    public function test_rfid_tap_rejected_when_key_not_configured(): void
    {
        config(['services.nexabsen.key' => null]);
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABBCCDD'], ['X-GLOBAL-KEY' => ''])->assertStatus(503);
    }

    public function test_rfid_tap_ignores_unrealistic_backdated_time_and_default_master_uid(): void
    {
        Student::factory()->create(['rfid_uid' => 'AABBCCDD', 'is_active' => true]);
        $h = ['X-GLOBAL-KEY' => self::IOT_KEY];

        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABBCCDD', 'tapped_at' => '2020-01-01 06:00:00'], $h)->assertOk();
        $record = AttendanceRecord::first();
        $this->assertTrue($record->check_in_at->isToday(), 'Waktu tap 2020 seharusnya diabaikan');

        // UID 99887766 tidak lagi otomatis jadi kartu admin
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => '99887766'], $h)->assertStatus(404);
    }

    public function test_inactive_student_tap_is_rejected(): void
    {
        Student::factory()->create(['rfid_uid' => 'DEADBEEF', 'is_active' => false]);
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'DEADBEEF'], ['X-GLOBAL-KEY' => self::IOT_KEY])
            ->assertStatus(403)->assertJsonPath('code', 'STUDENT_INACTIVE');
    }

    // ---------------------------------------------------------------- CMS & PSB

    public function test_cms_write_endpoints_require_login(): void
    {
        $this->postJson('/api/v1/cms/profile', ['hero_title' => 'Diretas'])->assertStatus(401);
        $this->postJson('/api/v1/cms/ppdb', ['total_quota' => '1'])->assertStatus(401);
        $this->postJson('/api/v1/cms/news', ['title' => 'x'])->assertStatus(401);
        $this->deleteJson('/api/v1/cms/news/1')->assertStatus(401);
        $this->getJson('/api/v1/cms/ppdb/registrations')->assertStatus(401);
        $this->patchJson('/api/v1/cms/ppdb/registrations/1/status', ['status' => 'Diterima'])->assertStatus(401);
        $this->deleteJson('/api/v1/cms/ppdb/registrations/1')->assertStatus(401);
    }

    public function test_guru_cannot_edit_cms(): void
    {
        Sanctum::actingAs($this->userWithRole('guru', 'guru1'));
        $this->postJson('/api/v1/cms/profile', ['hero_title' => 'x'])->assertStatus(403);
        $this->getJson('/api/v1/cms/ppdb/registrations')->assertStatus(403);
    }

    public function test_public_landing_does_not_leak_registrations(): void
    {
        $this->postJson('/api/v1/cms/ppdb/register', [
            'student_name' => 'Ahmad', 'whatsapp' => '081234567890', 'address' => 'Jl. Rahasia 1',
        ])->assertOk();

        $res = $this->getJson('/api/v1/cms/landing')->assertOk();
        $this->assertArrayNotHasKey('registrations', $res->json());
        $this->assertStringNotContainsString('Jl. Rahasia', $res->getContent());
    }

    public function test_public_registration_cannot_set_status_and_gets_unique_number(): void
    {
        $r1 = $this->postJson('/api/v1/cms/ppdb/register', [
            'student_name' => 'Calon A', 'whatsapp' => '081111111111', 'status' => 'Diterima', 'test_score_quran' => '100',
        ])->assertOk()->json('registration');
        $r2 = $this->postJson('/api/v1/cms/ppdb/register', [
            'student_name' => 'Calon B', 'whatsapp' => '082222222222',
        ])->assertOk()->json('registration');

        $this->assertSame('Baru', $r1['status']);
        $this->assertSame('-', $r1['test_score_quran']);
        $this->assertNotSame($r1['reg_number'], $r2['reg_number']);
        $this->assertArrayNotHasKey('whatsapp', $r1);
    }

    public function test_status_check_requires_exact_identifier_and_hides_private_fields(): void
    {
        $reg = $this->postJson('/api/v1/cms/ppdb/register', [
            'student_name' => 'Fatimah Zahra', 'whatsapp' => '0813-3333-4444', 'nisn' => '0012345678', 'address' => 'Alamat',
        ])->json('registration');

        // pencarian pakai sebagian nama tidak boleh lagi menemukan data
        $this->getJson('/api/v1/cms/psb/check?q=Fatimah')->assertStatus(404);
        $this->getJson('/api/v1/cms/psb/check?q=PSB')->assertStatus(404);

        $found = $this->getJson('/api/v1/cms/psb/check?q=' . $reg['reg_number'])->assertOk()->json('registration');
        $this->assertSame('Fatimah Zahra', $found['student_name']);
        $this->assertArrayNotHasKey('address', $found);
        $this->assertArrayNotHasKey('whatsapp', $found);

        $this->getJson('/api/v1/cms/psb/check?q=081333334444')->assertOk();
        $this->getJson('/api/v1/cms/psb/check?q=0012345678')->assertOk();
    }

    public function test_cms_input_is_sanitized_against_xss(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'admin2'));

        $this->postJson('/api/v1/cms/profile', [
            'hero_title' => '<img src=x onerror=alert(1)>Judul',
            'profile_image' => 'x" onerror="alert(1)',
            'mudir_photo' => 'javascript:alert(1)',
        ])->assertOk();

        $p = $this->getJson('/api/v1/cms/landing')->json('profile');
        $this->assertSame('Judul', $p['hero_title']);
        $this->assertStringNotContainsString('"', $p['profile_image']);
        $this->assertSame('', $p['mudir_photo']);
    }

    // ---------------------------------------------------------------- Users

    public function test_admin_cannot_change_super_admin_password_or_overwrite_account(): void
    {
        $super = $this->userWithRole('super-admin', 'superadmin');
        $admin = $this->userWithRole('admin', 'admin3');
        $admin->givePermissionTo(['users.update', 'users.create']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$super->id}/password", ['password' => 'Diambilalih123'])->assertStatus(403);
        $this->putJson("/api/v1/users/{$super->id}", ['password' => 'Diambilalih123'])->assertStatus(403);
        $this->postJson('/api/v1/users', ['username' => 'superadmin', 'name' => 'X', 'password' => 'Diambilalih123'])->assertStatus(422);

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('Rahasia123!', $super->fresh()->password));
    }

    public function test_role_assignment_is_super_admin_only(): void
    {
        $guru = $this->userWithRole('guru', 'guru2');
        $admin = $this->userWithRole('admin', 'admin4');
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/users/{$guru->id}/roles", ['roles' => ['super-admin']])->assertStatus(403);
        $this->assertFalse($guru->fresh()->hasRole('super-admin'));
    }

    public function test_create_user_requires_strong_password(): void
    {
        Sanctum::actingAs($this->userWithRole('super-admin', 'root'));
        $this->postJson('/api/v1/users', ['username' => 'baru', 'name' => 'Baru'])->assertStatus(422);
        $this->postJson('/api/v1/users', ['username' => 'baru', 'name' => 'Baru', 'password' => '123'])->assertStatus(422);
        $this->postJson('/api/v1/users', ['username' => 'baru', 'name' => 'Baru', 'password' => 'PasswordKuat1'])->assertStatus(201);
    }

    public function test_invalid_attendance_method_returns_422_not_500(): void
    {
        Sanctum::actingAs($this->userWithRole('super-admin', 'root2'));
        $student = Student::factory()->create();
        $this->seed(\Database\Seeders\ActivityCategorySeeder::class);
        $session = \App\Models\AttendanceSession::factory()->create();

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/record", [
            'student_id' => $student->id, 'method' => 'teleport',
        ])->assertStatus(422);
    }
}
