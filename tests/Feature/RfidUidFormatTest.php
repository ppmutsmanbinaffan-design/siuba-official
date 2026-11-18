<?php

namespace Tests\Feature;

use App\Models\AttendanceDevice;
use App\Models\StaffProfile;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Kartu yang sama: Nexabsen "AA38A284" (hex), Absensindo "2225223850" (desimal, byte terbalik). */
class RfidUidFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_decimal_little_endian_uid_maps_to_hex(): void
    {
        $this->assertSame('AA38A284', Student::normalizeRfidUid('2225223850'));
        $this->assertSame('AA38A284', Student::normalizeRfidUid('aa:38:a2:84'));
        $this->assertSame('12345678', Student::normalizeRfidUid('12345678'));          // 8 digit = heksadesimal 4 byte
        $this->assertSame('04A1B2C3D4E5F6', Student::normalizeRfidUid('04A1B2C3D4E5F6')); // 7 byte heksadesimal
        $this->assertSame('ABCDEF', Student::normalizeRfidUid('abcdef'));
    }

    public function test_same_card_recognised_on_both_machines(): void
    {
        config(['services.nexabsen.key' => str_repeat('k', 40), 'services.nexabsen.auto_register_device' => false]);
        \App\Models\AppSetting::put('attendance', array_merge(\App\Models\AppSetting::get('attendance'), ['rfid_debounce_seconds' => 0]));
        $this->travelTo(Carbon::parse('2026-11-16 07:00:00'));
        // didaftarkan dengan nomor dari Absensindo (desimal) → tersimpan dalam bentuk baku
        $staff = StaffProfile::create(['staff_number' => 'S1', 'name' => 'Asep Tia', 'staff_type' => 'teacher', 'rfid_uid' => '2225223850', 'is_active' => true]);
        $this->assertSame('AA38A284', $staff->fresh()->rfid_uid);

        // tap di Nexabsen (hex)
        AttendanceDevice::create(['device_code' => 'NX-1', 'device_name' => 'NX', 'device_type' => 'rfid_reader', 'is_active' => true]);
        $this->postJson('/api/tap.php', ['uid' => 'AA38A284', 'device_id' => 'NX-1'], ['X-GLOBAL-KEY' => str_repeat('k', 40)])
            ->assertOk()->assertJsonPath('data.name', 'Asep Tia');

        // tap di Absensindo (desimal)
        AttendanceDevice::create(['device_code' => 'CA4111025121031', 'device_name' => 'ABS', 'device_type' => 'rfid_reader', 'is_active' => true]);
        $token = $this->postJson('/api/device/activate', ['serial_number' => 'CA4111025121031', 'mac_address' => 'aa:bb:cc:dd:ee:01'])->json('data.token');
        $this->travelTo(Carbon::parse('2026-11-16 16:30:00'));
        $this->postJson('/api/device/attendance', ['uid' => '2225223850', 'scanned_at' => '2026-11-16 16:30:00'], ['Authorization' => "Bearer {$token}"])
            ->assertOk()->assertJsonPath('data.student_name', 'Asep Tia')->assertJsonPath('data.uid', 'AA38A284');
    }

    public function test_migration_converts_stored_decimal_uids(): void
    {
        DB::table('staff_profiles')->insert(['staff_number' => 'S2', 'name' => 'Lama', 'staff_type' => 'teacher', 'rfid_uid' => '2225223850', 'qr_token' => 'STF-UJI-S2', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        (require database_path('migrations/2026_11_18_000010_normalize_decimal_rfid_uids.php'))->up();
        $this->assertSame('AA38A284', DB::table('staff_profiles')->where('staff_number', 'S2')->value('rfid_uid'));
    }
}
