<?php

namespace Tests\Feature;

use App\Models\StaffAttendanceRecord;
use App\Models\StaffOfflineScan;
use App\Models\StaffProfile;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Tahap 28: antrean offline presensi SDM — jam tap asli, tanpa dobel, urutan masuk/pulang benar. */
class StaffOfflineSyncTest extends TestCase
{
    use RefreshDatabase;

    private StaffProfile $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->staff = StaffProfile::create(['staff_number' => '501', 'name' => 'Ust. Hasan', 'staff_type' => 'teacher', 'qr_token' => 'STF-501', 'is_active' => true]);
    }

    private function item(string $id, string $clientTime, ?string $estimated = null, array $extra = []): array
    {
        return array_merge(['client_request_id' => $id, 'identifier' => 'STF-501', 'method' => 'qr',
            'captured_at_client' => $clientTime, 'estimated_server_time' => $estimated], $extra);
    }

    private function sync(array $items)
    {
        return $this->postJson('/api/v1/staff-attendance/daily/offline-sync', ['items' => $items])->assertOk();
    }

    public function test_offline_taps_use_capture_time_and_are_idempotent(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 16:30:00')); // dikirim sore hari (Senin)
        // dikirim terbalik: server mengurutkan menurut jam tap
        $res = $this->sync([
            $this->item('req-out', '2026-11-16T16:05:00+07:00'),
            $this->item('req-in', '2026-11-16T07:02:00+07:00'),
        ])->json('data.results');

        $this->assertSame(['CHECK_IN_SUCCESS', 'CHECK_OUT_SUCCESS'], array_column($res, 'code'));
        $rec = StaffAttendanceRecord::firstOrFail();
        $this->assertSame('07:02', $rec->check_in_at->format('H:i'));
        $this->assertSame('16:05', $rec->check_out_at->format('H:i'));
        $this->assertSame('present', $rec->status);
        $this->assertStringContainsString('Tap offline', $rec->notes);

        // kiriman ulang (misal respons pertama hilang) tidak mencatat dua kali
        $again = $this->sync([$this->item('req-in', '2026-11-16T07:02:00+07:00')])->json('data.results.0');
        $this->assertTrue($again['replay']);
        $this->assertTrue($again['success']);
        $this->assertSame(2, StaffOfflineScan::count());
        $this->assertSame(1, StaffAttendanceRecord::count());
    }

    public function test_device_clock_is_corrected_with_estimated_server_time(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));
        // jam HP terlambat 10 menit: HP 07:10, perkiraan jam server 07:20 → terlambat 20 menit
        $r = $this->sync([$this->item('req-1', '2026-11-16T07:10:00+07:00', '2026-11-16T07:20:00+07:00')])->json('data.results.0');
        $this->assertSame('CHECK_IN_SUCCESS', $r['code']);
        $this->assertSame('late', $r['record']['status']);
        $this->assertSame(20, $r['record']['late_minutes']);
    }

    public function test_earlier_offline_tap_corrects_check_in_recorded_online(): void
    {
        // 16:10 tap online di perangkat lain → dianggap "masuk"
        $this->travelTo(Carbon::parse('2026-11-16 16:10:00'));
        $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => 'STF-501', 'method' => 'qr'])->assertOk()
            ->assertJsonPath('data.code', 'CHECK_IN_SUCCESS');
        // tap pagi 07:00 dari perangkat offline baru terkirim
        $this->travelTo(Carbon::parse('2026-11-16 16:20:00'));
        $r = $this->sync([$this->item('req-pagi', '2026-11-16T07:00:00+07:00')])->json('data.results.0');
        $this->assertSame('CHECK_IN_CORRECTED', $r['code']);
        $rec = StaffAttendanceRecord::firstOrFail();
        $this->assertSame('07:00', $rec->check_in_at->format('H:i'));
        $this->assertSame('16:10', $rec->check_out_at->format('H:i'));
        $this->assertSame('present', $rec->status);
        $this->assertSame(0, $rec->late_minutes);
    }

    public function test_rejections_are_final(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 10:00:00'));
        $res = $this->sync([
            $this->item('req-future', '2026-11-16T11:00:00+07:00'),
            $this->item('req-old', '2026-11-01T07:00:00+07:00'),
            $this->item('req-unknown', '2026-11-16T07:00:00+07:00', null, ['identifier' => 'TIDAK-ADA']),
            $this->item('req-a', '2026-11-16T07:05:00+07:00'),
            $this->item('req-b', '2026-11-16T07:05:30+07:00'), // tap ganda
        ])->json('data.results');
        $byId = collect($res)->keyBy('client_request_id');
        $this->assertSame('TIME_IN_FUTURE', $byId['req-future']['code']);
        $this->assertSame('TOO_OLD', $byId['req-old']['code']);
        $this->assertSame('STAFF_NOT_FOUND', $byId['req-unknown']['code']);
        $this->assertTrue($byId['req-a']['success']);
        $this->assertTrue($byId['req-b']['duplicate']);
        $this->assertTrue(collect($res)->every(fn ($r) => $r['final'] === true));
    }

    public function test_manual_entry_accepts_qr_token(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 07:05:00'));
        $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => 'STF-501', 'method' => 'manual'])
            ->assertOk()->assertJsonPath('data.code', 'CHECK_IN_SUCCESS');
    }

    public function test_requires_staff_attendance_permission(): void
    {
        $u = User::create(['username' => 'plt', 'name' => 'P', 'email' => 'p@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->assignRole('pelatih');
        Sanctum::actingAs($u);
        $this->postJson('/api/v1/staff-attendance/daily/offline-sync', ['items' => [$this->item('x', '2026-11-16T07:00:00+07:00')]])->assertForbidden();
    }
}
