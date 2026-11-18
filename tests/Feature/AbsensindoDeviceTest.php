<?php

namespace Tests\Feature;

use App\Models\AttendanceDevice;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/** Mesin Absensindo: aktivasi SN+MAC → token Bearer; cek, heartbeat, tap {uid, scanned_at}; balasan {success, code, message, data.reason}. */
class AbsensindoDeviceTest extends TestCase
{
    use RefreshDatabase;

    private const SN = 'CA4111025121031';
    private const MAC = 'C8:8A:7B:8B:C3:4C';

    protected function setUp(): void
    {
        parent::setUp();
        \App\Models\AppSetting::put('attendance', array_merge(\App\Models\AppSetting::get('attendance'), ['rfid_debounce_seconds' => 0]));
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00')); // Senin
    }

    private function activate(string $mac = self::MAC, string $path = '/api/device/activate')
    {
        return $this->postJson($path, ['serial_number' => self::SN, 'mac_address' => $mac, 'firmware_version' => '1.5.4']);
    }

    private function token(): string
    {
        AttendanceDevice::create(['device_code' => self::SN, 'device_name' => 'Gerbang', 'device_type' => 'rfid_reader', 'is_active' => true]);

        return $this->activate()->assertOk()->json('data.token');
    }

    public function test_unregistered_machine_waits_for_admin_then_activates(): void
    {
        $this->activate()->assertStatus(403)->assertJsonPath('data.reason', 'device_inactive')->assertJsonPath('success', false);
        $device = AttendanceDevice::where('serial_number', self::SN)->firstOrFail();
        $this->assertFalse($device->is_active);
        $this->assertSame('absensindo', $device->protocol);

        $device->update(['is_active' => true]); // admin klik Aktifkan
        $res = $this->activate()->assertOk()->assertJsonPath('code', 200)->assertJsonPath('data.reason', 'device_activated')
            ->assertJsonPath('data.token_type', 'Bearer');
        $this->assertSame(80, strlen($res->json('data.token')));
        $this->assertSame(strtolower(self::MAC), $device->fresh()->mac_address);
        $this->assertNull($device->fresh()->getAttributes()['api_token_hash'] === $res->json('data.token') ? 'plain' : null); // hanya hash

        // unit lain dengan SN sama ditolak
        $this->activate('AA:BB:CC:DD:EE:FF')->assertStatus(401)->assertJsonPath('data.reason', 'mac_address_mismatch');
    }

    public function test_cek_heartbeat_and_auth(): void
    {
        $t = $this->token();
        $h = ['Authorization' => "Bearer {$t}"];
        $this->postJson('/api/device/cek', ['serial_number' => self::SN, 'mac_address' => self::MAC, 'firmware_version' => '1.5.5'], $h)
            ->assertOk()->assertJsonPath('data.reason', 'device_verified')->assertJsonPath('data.status', 'active');
        $this->assertSame('1.5.5', AttendanceDevice::first()->firmware_version);
        $this->postJson('/api/device/heartbeat', ['uptime' => 120], $h)->assertOk()
            ->assertJsonPath('data.server_time', '2026-11-16 09:00:00')->assertJsonPath('data.sync_interval', 60);
        $this->postJson('/api/device/heartbeat', ['uptime' => 1], ['Authorization' => 'Bearer salah'])->assertStatus(401)->assertJsonPath('data.reason', 'invalid_token');

        AttendanceDevice::first()->update(['is_active' => false]);
        $this->postJson('/api/device/heartbeat', ['uptime' => 1], $h)->assertStatus(401)->assertJsonPath('data.reason', 'device_inactive');
    }

    public function test_attendance_staff_offline_time_unknown_card_and_duplicate(): void
    {
        $t = $this->token();
        $h = ['Authorization' => "Bearer {$t}"];
        $staff = StaffProfile::create(['staff_number' => 'UBA00002', 'name' => 'Asep Tia', 'staff_type' => 'teacher', 'rfid_uid' => 'A1B2C3D4', 'is_active' => true]);

        // tap dari antrean offline mesin (jam lokal WIB)
        $this->postJson('/api/device/attendance', ['uid' => 'a1b2c3d4', 'scanned_at' => '2026-11-16 07:05:00'], $h)
            ->assertOk()->assertJsonPath('success', true)->assertJsonPath('data.reason', 'checkin_on_time')
            ->assertJsonPath('data.type', 'datang')->assertJsonPath('data.student_name', 'Asep Tia');
        $this->assertSame('07:05', StaffAttendanceRecord::where('staff_profile_id', $staff->id)->firstOrFail()->check_in_at->format('H:i'));

        $this->postJson('/api/device/attendance', ['uid' => 'A1B2C3D4', 'scanned_at' => '2026-11-16 07:06:00'], $h)
            ->assertStatus(422)->assertJsonPath('data.reason', 'already_checked_in');

        // kartu belum terdaftar → muncul di Registrasi Kartu RFID
        $this->postJson('/api/device/attendance', ['uid' => 'DEADBEEF', 'scanned_at' => '2026-11-16 09:00:00'], $h)
            ->assertStatus(409)->assertJsonPath('data.reason', 'new_card_detected');
        $this->assertSame('DEADBEEF', Cache::get('last_scanned_rfid')['uid'] ?? null);

        // jalur lain di bawah /api/device dikenali dari isi permintaan
        $this->postJson('/api/device/v1/scan-rfid', ['uid' => 'DEADBEEF', 'scanned_at' => '2026-11-16 09:00:00'], $h)->assertStatus(409);
        $this->postJson('/api/device/attendance', ['uid' => 'A1B2C3D4', 'scanned_at' => '2026-11-16 09:00:00'])
            ->assertStatus(401)->assertJsonPath('data.reason', 'missing_token');
    }
}
