<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Extracurricular;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\TrainingSession;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 23: presensi melatih — pelatih hanya untuk dirinya, wajib ditugaskan, kartu hanya hari ini,
 * susulan manual oleh petugas, toleransi global, pembuatan & finalisasi otomatis.
 */
class TrainerScopeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $pelatihUser;
    private StaffProfile $coach;
    private StaffProfile $other;
    private Extracurricular $panahan;
    private Extracurricular $hadroh;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 15:50:00')); // Senin
        $this->admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        $this->pelatihUser = User::create(['username' => 'plt', 'name' => 'Ust. Panah', 'email' => 'p@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->pelatihUser->assignRole('pelatih');

        $this->coach = StaffProfile::create(['staff_number' => '301', 'name' => 'Ust. Panah', 'staff_type' => 'teacher', 'qr_token' => 'STF-301', 'is_active' => true, 'user_id' => $this->pelatihUser->id]);
        $this->other = StaffProfile::create(['staff_number' => '302', 'name' => 'Ust. Hadroh', 'staff_type' => 'trainer', 'qr_token' => 'STF-302', 'is_active' => true]);
        $this->panahan = Extracurricular::create(['code' => 'PNH', 'name' => 'Panahan', 'is_active' => true]);
        $this->hadroh = Extracurricular::create(['code' => 'HDR', 'name' => 'Hadroh', 'is_active' => true]);

        Sanctum::actingAs($this->admin);
        foreach ([[$this->panahan, $this->coach], [$this->hadroh, $this->other]] as [$e, $s]) {
            $this->postJson('/api/v1/trainer/schedules', ['extracurricular_id' => $e->id, 'day_of_week' => 1, 'start_time' => '16:00', 'end_time' => '17:00'])->assertCreated();
            $this->postJson('/api/v1/trainer/assignments', ['extracurricular_id' => $e->id, 'staff_id' => $s->id])->assertCreated();
        }
    }

    private function sessionOf(Extracurricular $e): TrainingSession
    {
        return TrainingSession::where('extracurricular_id', $e->id)->firstOrFail();
    }

    public function test_scan_generates_todays_sessions_and_trainer_only_self(): void
    {
        $this->assertSame(0, TrainingSession::count());
        Sanctum::actingAs($this->pelatihUser);

        // Sesi hari ini dibuat otomatis saat scan pertama
        $this->postJson('/api/v1/trainer/scan', ['staff_id' => $this->coach->id, 'method' => 'manual'])->assertOk()->assertJsonPath('data.mode', 'check_in');
        $this->assertSame(2, TrainingSession::count());

        // Tidak boleh mencatatkan pelatih lain
        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'STF-302', 'method' => 'qr'])->assertForbidden();

        // Overview hanya berisi sesi miliknya
        $d = $this->getJson('/api/v1/trainer/overview')->assertOk()->json('data');
        $this->assertSame($this->coach->id, $d['me']['staff_id']);
        $this->assertFalse($d['can_manage']);
        $this->assertCount(1, $d['sessions']);
        $this->assertSame('Panahan', $d['sessions'][0]['extracurricular_name']);
        $this->assertCount(1, $d['staff']);

        // Jurnal sesi ekskul lain ditolak, sesi sendiri boleh
        $this->postJson('/api/v1/trainer/sessions/' . $this->sessionOf($this->hadroh)->id . '/journal', ['topic' => 'x'])->assertForbidden();
        $this->postJson('/api/v1/trainer/sessions/' . $this->sessionOf($this->panahan)->id . '/journal', ['topic' => 'Teknik dasar'])->assertOk();
    }

    public function test_staff_must_be_assigned_to_session(): void
    {
        $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-16'])->assertOk();
        $this->postJson('/api/v1/trainer/scan', ['staff_id' => $this->other->id, 'session_id' => $this->sessionOf($this->panahan)->id, 'method' => 'manual'])
            ->assertStatus(409)->assertJsonPath('error.code', 'NOT_ASSIGNED');
    }

    public function test_card_only_today_and_manual_backfill_by_officer(): void
    {
        $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-09'])->assertOk(); // Senin lalu
        $past = TrainingSession::whereDate('session_date', '2026-11-09')->where('extracurricular_id', $this->panahan->id)->firstOrFail();

        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'STF-301', 'session_id' => $past->id, 'method' => 'qr'])
            ->assertStatus(409)->assertJsonPath('error.code', 'NOT_TODAY');

        $this->postJson('/api/v1/trainer/scan', ['staff_id' => $this->coach->id, 'session_id' => $past->id, 'method' => 'manual'])
            ->assertOk()->assertJsonPath('data.mode', 'backfill');
        $rec = StaffAttendanceRecord::where('context_key', 'training:' . $past->id)->firstOrFail();
        $this->assertSame('present', $rec->status);
        $this->assertSame('2026-11-09 16:00:00', $rec->check_in_at->format('Y-m-d H:i:s'));
        $this->assertSame('completed', $past->fresh()->status);

        // Pelatih tidak boleh susulan sendiri
        Sanctum::actingAs($this->pelatihUser);
        $this->postJson('/api/v1/trainer/scan', ['staff_id' => $this->coach->id, 'session_id' => $past->id, 'method' => 'manual'])
            ->assertStatus(409)->assertJsonPath('error.code', 'NOT_TODAY');
    }

    public function test_lateness_follows_global_tolerance(): void
    {
        AppSetting::put('attendance', array_merge(AppSetting::get('attendance'), ['late_tolerance_minutes' => 5]));
        $this->postJson('/api/v1/trainer/generate', ['date' => '2026-11-16'])->assertOk();
        $this->travelTo(Carbon::parse('2026-11-16 16:10:00'));
        $this->postJson('/api/v1/trainer/scan', ['identifier' => 'STF-301', 'method' => 'qr'])->assertOk();
        $rec = StaffAttendanceRecord::where('staff_profile_id', $this->coach->id)->firstOrFail();
        $this->assertSame('late', $rec->status);
        $this->assertSame(10, $rec->late_minutes);
    }

    public function test_scheduled_generate_and_finalize_commands(): void
    {
        $this->artisan('trainer:generate', ['--date' => '2026-11-16'])->assertExitCode(0);
        $this->assertSame(2, TrainingSession::count());
        $this->assertTrue(collect(\Illuminate\Support\Facades\Artisan::all())->has('trainer:finalize'));

        $this->travelTo(Carbon::parse('2026-11-17 00:40:00'));
        $this->artisan('trainer:finalize')->assertExitCode(0); // bawaan: kemarin
        $this->assertSame(2, StaffAttendanceRecord::where('status', 'absent')->where('attendance_type', 'training')->count());

        $this->artisan('schedule:list')->expectsOutputToContain('trainer:generate');
    }
}
