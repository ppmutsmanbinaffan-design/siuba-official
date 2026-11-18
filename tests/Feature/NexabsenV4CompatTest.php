<?php

namespace Tests\Feature;

use App\Models\AttendanceDevice;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Mesin jadi Nexabsen V.4: hanya X-GLOBAL-KEY, ID alat dari portal (NX-MAC), payload {device_id, uid, tapped_at?}
 * dengan tapped_at "Y-m-d H:i:s" tanpa zona waktu. Dokumen pabrik hanya mengenal 200 / 401 / 404.
 */
class NexabsenV4CompatTest extends TestCase
{
    use RefreshDatabase;

    private const KEY = 'kunci-global-pesantren-uji-0123456789';
    private const DEVICE = 'NX-C88A7B8BCB4C';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.nexabsen.key' => self::KEY,
            'services.nexabsen.master_admin_uid' => 'FF112233',
            'services.nexabsen.auto_register_device' => false,
            'services.nexabsen.auto_daily_session' => false,
        ]);
        \App\Models\AppSetting::put('attendance', array_merge(\App\Models\AppSetting::get('attendance'), ['rfid_debounce_seconds' => 0]));
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00')); // Senin
    }

    private function tap(array $body, string $key = self::KEY)
    {
        // persis seperti mesin: raw JSON + X-GLOBAL-KEY + Content-Type
        return $this->call('POST', '/api/tap.php', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_X_GLOBAL_KEY' => $key,
        ], json_encode($body));
    }

    public function test_new_machine_must_be_activated_then_staff_tap_with_offline_time(): void
    {
        $staff = StaffProfile::create(['staff_number' => '701', 'name' => 'Ust. Rahmat', 'staff_type' => 'teacher', 'rfid_uid' => 'A1B2C3D4', 'is_active' => true]);

        $this->tap(['device_id' => self::DEVICE, 'uid' => 'A1B2C3D4'])->assertStatus(403)->assertJsonPath('message', 'Alat Blm Aktif!');
        $device = AttendanceDevice::where('device_code', self::DEVICE)->firstOrFail(); // muncul di Device Management
        $this->assertFalse($device->is_active);
        $device->update(['is_active' => true]);

        // tap dari antrean offline mesin: jam asli 07:05 tanpa zona waktu = WIB
        $this->tap(['device_id' => self::DEVICE, 'uid' => 'A1B2C3D4', 'tapped_at' => '2026-11-16 07:05:00'])
            ->assertOk()->assertJsonPath('message', 'Masuk Sukses')->assertJsonPath('data.name', 'Ust. Rahmat');
        $this->assertSame('07:05', StaffAttendanceRecord::where('staff_profile_id', $staff->id)->firstOrFail()->check_in_at->format('H:i'));
    }

    public function test_responses_follow_vendor_status_codes(): void
    {
        AttendanceDevice::create(['device_code' => self::DEVICE, 'device_name' => 'Gerbang', 'device_type' => 'rfid_reader', 'is_active' => true]);
        Student::factory()->create(['rfid_uid' => 'B1B2B3B4', 'is_active' => true]);

        $this->tap(['device_id' => self::DEVICE, 'uid' => 'A1B2C3D4'], 'salah')->assertStatus(401)->assertJsonPath('message', 'API Key Salah!');
        $this->tap(['device_id' => self::DEVICE, 'uid' => 'DEADBEEF'])->assertStatus(404)->assertJsonPath('message', 'Kartu Ditolak!');
        // tidak ada sesi: penolakan final → 200 + success=false (mesin tidak mengirim ulang)
        $this->tap(['device_id' => self::DEVICE, 'uid' => 'B1B2B3B4'])->assertOk()
            ->assertJsonPath('success', false)->assertJsonPath('message', 'Tdk Ada Sesi!');
        // kartu master admin → perintah reset konfigurasi (v4.1)
        $this->tap(['device_id' => self::DEVICE, 'uid' => 'FF112233'])->assertOk()->assertJsonPath('action', 'RESET_CONFIG');
        // alamat API SIUBA sendiri tetap memakai kode semantik
        $this->postJson('/api/v1/iot/rfid-tap', ['device_id' => self::DEVICE, 'uid' => 'B1B2B3B4'], ['X-GLOBAL-KEY' => self::KEY])->assertStatus(409);
    }
}
