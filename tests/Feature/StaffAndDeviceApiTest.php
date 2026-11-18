<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;
use App\Models\AttendanceSession;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffAndDeviceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $admin = User::create(['username' => 'admin', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
    }

    public function test_staff_crud_and_filters(): void
    {
        $created = $this->postJson('/api/v1/staff', [
            'staff_number' => 'NIP-001', 'name' => 'Ustadz Ridwan', 'gender' => 'male', 'staff_type' => 'teacher',
            'employment_status' => 'permanent', 'phone' => '0812', 'department' => 'Akademik', 'rfid_uid' => 'de:ad:be:ef',
        ])->assertCreated()->json('data');

        $this->assertSame('male', $created['gender']);
        $this->assertSame('DEADBEEF', $created['rfid_uid']);
        $this->assertStringStartsWith('STF-', $created['qr_token']);

        $this->postJson('/api/v1/staff', ['staff_number' => 'NIP-001', 'name' => 'X', 'gender' => 'L', 'staff_type' => 'teacher', 'employment_status' => 'contract'])
            ->assertStatus(422);

        $this->getJson('/api/v1/staff?staff_type=teacher&search=Ridwan')->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/staff?staff_type=trainer')->assertOk()->assertJsonPath('meta.total', 0);

        $this->putJson("/api/v1/staff/{$created['id']}", ['is_active' => false])->assertOk()
            ->assertJsonPath('data.is_active', false)->assertJsonPath('data.leave_date', today()->toDateString());
    }

    public function test_rfid_cannot_be_shared_between_student_and_staff(): void
    {
        Student::factory()->create(['rfid_uid' => 'CAFE0001']);
        $this->postJson('/api/v1/staff', [
            'staff_number' => 'NIP-2', 'name' => 'Pelatih', 'gender' => 'L', 'staff_type' => 'trainer',
            'employment_status' => 'honorary', 'rfid_uid' => 'CAFE0001',
        ])->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['fields' => ['rfid_uid']]]]);

        StaffProfile::create(['staff_number' => 'NIP-3', 'name' => 'Musyrif', 'rfid_uid' => 'CAFE0002']);
        $this->postJson('/api/v1/students', ['student_number' => 'S-1', 'name' => 'Santri', 'gender' => 'L', 'rfid_uid' => 'CAFE0002'])
            ->assertStatus(422);
    }

    public function test_staff_import_saves_profile_and_uses_random_password(): void
    {
        $root = User::create(['username' => 'root', 'name' => 'Root', 'email' => 'r@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $root->assignRole('super-admin');
        Sanctum::actingAs($root);

        $csv = "username,name,email,role,phone,gender,department,position,employment_status\n"
            . "guru.ali,Ustadz Ali,ali@t.l,guru,0813111,L,Tahfidz,Muhaffizh,honorer\n";
        $res = $this->postJson('/api/v1/import/staff', ['csv_content' => $csv])->assertOk()->json();

        $user = User::where('username', 'guru.ali')->first();
        $this->assertNotNull($user);
        $this->assertFalse(Hash::check('password', $user->password), 'Password awal tidak boleh lagi "password"');
        $this->assertTrue(Hash::check($res['records'][0]['initial_password'], $user->password));

        $profile = StaffProfile::where('user_id', $user->id)->first();
        $this->assertSame('0813111', $profile->phone);
        $this->assertSame('Tahfidz', $profile->department);
        $this->assertSame('teacher', $profile->staff_type);
        $this->assertSame('honorary', $profile->employment_status);
    }

    public function test_devices_list_logs_and_snapshot(): void
    {
        config(['services.nexabsen.key' => 'k', 'services.nexabsen.auto_register_device' => false]);
        $this->travelTo(Carbon::today()->setTime(7, 0));
        AttendanceDevice::create(['device_code' => 'MSJ-01', 'device_name' => 'Masjid', 'device_type' => 'rfid_reader', 'is_active' => true]);
        $cat = ActivityCategory::create(['code' => 'IB', 'name' => 'Ibadah']);
        $act = Activity::create(['activity_category_id' => $cat->id, 'code' => 'SUBUH', 'name' => 'Subuh', 'allow_rfid' => true, 'allow_manual' => true, 'allow_qr' => true]);
        AttendanceSession::create(['session_code' => 'S1', 'activity_id' => $act->id, 'session_date' => today(),
            'start_at' => today()->setTime(6, 30), 'present_until' => today()->setTime(7, 15), 'late_until' => today()->setTime(7, 45),
            'end_at' => today()->setTime(8, 0), 'status' => SessionStatus::OPEN]);
        Student::factory()->create(['rfid_uid' => 'AABB0001', 'is_active' => true]);

        $h = ['X-GLOBAL-KEY' => 'k'];
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABB0001', 'device_id' => 'MSJ-01'], $h)->assertOk();
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'FFFF0000', 'device_id' => 'MSJ-01'], $h)->assertStatus(404);
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABB0001', 'device_id' => 'ALAT-ASING'], $h)->assertStatus(403);
        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'AABB0001'], ['X-GLOBAL-KEY' => 'salah'])->assertStatus(401);

        $this->assertSame(
            ['AUTH_FAILED', 'CARD_SCANNED', 'DEVICE_DISABLED', 'RFID_NOT_REGISTERED'],
            AttendanceDeviceLog::pluck('event_type')->sort()->values()->all()
        );

        $devices = $this->getJson('/api/v1/attendance/devices')->assertOk()->json('data');
        $msj = collect($devices)->firstWhere('device_code', 'MSJ-01');
        $this->assertSame(1, $msj['tap_count_today']);
        $this->assertSame('online', $msj['status']);

        $this->getJson('/api/v1/attendance/devices/logs')->assertOk()->assertJsonCount(4, 'data');
        $this->getJson("/api/v1/attendance/devices/{$msj['id']}/logs")->assertOk()->assertJsonCount(2, 'data');

        $snap = $this->getJson('/api/v1/attendance/snapshot')->assertOk()->json('data');
        $this->assertCount(1, $snap['sessions']);
        $this->assertCount(1, $snap['records']);
        $this->assertSame('rfid', $snap['records'][0]['method']);
    }

    public function test_guru_cannot_manage_staff(): void
    {
        $guru = User::create(['username' => 'g', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);

        $this->postJson('/api/v1/staff', ['staff_number' => 'X', 'name' => 'X', 'gender' => 'L', 'staff_type' => 'teacher', 'employment_status' => 'permanent'])
            ->assertStatus(403);
    }
}
