<?php

namespace Tests\Feature;

use App\Models\AcademicCalendarEvent;
use App\Models\StaffProfile;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 20: jadwal kerja SDM disimpan di server dan dipakai saat presensi; hari libur kalender akademik dihormati.
 */
class StaffWorkScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 06:00:00')); // Senin
        $this->admin = User::create(['username' => 'adm20', 'name' => 'Admin TU', 'email' => 'a20@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    private function staff(): StaffProfile
    {
        return StaffProfile::create(['staff_number' => 'NIP-20', 'name' => 'Ustadz Ridwan', 'staff_type' => 'teacher']);
    }

    private function week(array $mondayOverride = []): array
    {
        $days = $this->getJson('/api/v1/staff-attendance/work-schedule')->assertOk()->json('data.days');
        $days['monday'] = array_merge($days['monday'], $mondayOverride);

        return $days;
    }

    public function test_default_schedule_matches_config(): void
    {
        $d = $this->getJson('/api/v1/staff-attendance/work-schedule')->assertOk()->json('data');
        $this->assertSame('07:15', $d['days']['monday']['late_after']);
        $this->assertFalse($d['days']['sunday']['working']);
        $this->assertSame('12:00', $d['days']['friday']['scheduled_end_at']);
        $this->assertFalse($d['customized']);
    }

    public function test_saved_schedule_changes_late_calculation(): void
    {
        $staff = $this->staff();

        // Urutan jam tidak valid ditolak
        $this->putJson('/api/v1/staff-attendance/work-schedule', ['days' => $this->week(['late_after' => '06:30'])])
            ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_SCHEDULE');

        // Batas terlambat Senin diundur ke 07:30
        $this->putJson('/api/v1/staff-attendance/work-schedule', ['days' => $this->week(['late_after' => '07:30'])])->assertOk();
        $this->assertTrue($this->getJson('/api/v1/staff-attendance/work-schedule')->json('data.customized'));

        // 07:20: dengan jadwal bawaan (07:15) ini terlambat; dengan jadwal baru masih tepat waktu
        $this->travelTo(Carbon::parse('2026-11-16 07:20:00'));
        $in = $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])->assertOk()->json('data');
        $this->assertSame('CHECK_IN_SUCCESS', $in['code']);
        $this->assertSame('present', $in['record']['status']);

        // Perubahan tercatat di audit
        $this->assertDatabaseHas('audit_logs', ['event' => 'staff_work_schedule_updated']);
    }

    public function test_non_working_day_from_saved_schedule_and_holiday(): void
    {
        $staff = $this->staff();

        // Libur kalender akademik pada Senin
        AcademicCalendarEvent::create(['name' => 'Libur Maulid Nabi', 'type' => 'holiday', 'start_date' => '2026-11-16', 'end_date' => '2026-11-16']);
        $this->travelTo(Carbon::parse('2026-11-16 07:00:00'));
        $r = $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])->json('data');
        $this->assertSame('NOT_WORKING_DAY', $r['code']);
        $this->assertStringContainsString('Libur Maulid Nabi', $r['message']);
        $this->assertStringContainsString('Libur Maulid Nabi', $this->postJson('/api/v1/staff-attendance/daily/finalize', ['date' => '2026-11-16'])->json('message'));
        $this->assertSame('Libur Maulid Nabi', $this->getJson('/api/v1/staff-attendance/work-schedule')->json('data.upcoming_holidays.0.name'));

        // Selasa dijadikan hari tidak bekerja lewat jadwal
        $days = $this->week();
        $days['tuesday']['working'] = false;
        $this->putJson('/api/v1/staff-attendance/work-schedule', ['days' => $days])->assertOk();
        $this->travelTo(Carbon::parse('2026-11-17 07:00:00'));
        $this->assertSame('NOT_WORKING_DAY', $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])->json('data.code'));
    }

    public function test_update_requires_permission(): void
    {
        $u = User::create(['username' => 'u20', 'name' => 'Biasa', 'email' => 'u20@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/staff-attendance/work-schedule')->assertForbidden();
        $this->putJson('/api/v1/staff-attendance/work-schedule', ['days' => []])->assertForbidden();
    }
}
