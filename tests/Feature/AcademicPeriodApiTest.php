<?php

namespace Tests\Feature;

use App\Models\AcademicCalendarEvent;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\Semester;
use App\Models\User;
use App\Services\System\SelfTestService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Tahap 27: kelola tahun ajaran & semester (satu yang aktif, data terpakai tidak bisa dihapus). */
class AcademicPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-18 10:00:00'));
        $this->admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    private function createYear(string $name, string $start, string $end, array $extra = [])
    {
        return $this->postJson('/api/v1/academic/years', ['name' => $name, 'start_date' => $start, 'end_date' => $end] + $extra);
    }

    public function test_first_year_is_created_with_two_semesters_and_activated(): void
    {
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')
            ->assertCreated()
            ->assertJsonPath('data.academic_years.0.name', '2026/2027')
            ->assertJsonPath('data.academic_years.0.is_active', true);

        $year = AcademicYear::firstOrFail();
        $sems = Semester::where('academic_year_id', $year->id)->orderBy('start_date')->get();
        $this->assertSame(['GANJIL', 'GENAP'], $sems->pluck('code')->all());
        $this->assertSame('2026-12-31', $sems[0]->end_date->toDateString());
        $this->assertSame('2027-01-01', $sems[1]->start_date->toDateString());
        // hari ini 18 Nov 2026 → Ganjil aktif
        $this->assertTrue($sems[0]->is_active);
        $this->assertFalse($sems[1]->is_active);
        $this->assertTrue(AuditLog::where('event', 'academic.year.created')->exists());

        $check = collect(app(SelfTestService::class)->run()['checks'] ?? [])->firstWhere('id', 'academic_year');
        $this->assertSame('pass', $check['status'] ?? null);
    }

    public function test_second_year_is_not_activated_until_requested(): void
    {
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertCreated();
        $this->createYear('2027/2028', '2027-07-12', '2028-06-30')->assertCreated();
        $next = AcademicYear::where('name', '2027/2028')->firstOrFail();
        $this->assertFalse($next->is_active);

        $this->postJson("/api/v1/academic/years/{$next->id}/activate")->assertOk();
        $this->assertSame(1, AcademicYear::where('is_active', true)->count());
        $this->assertTrue($next->fresh()->is_active);
        // hanya satu semester aktif di seluruh sistem, dan berada di tahun aktif
        $active = Semester::where('is_active', true)->get();
        $this->assertCount(1, $active);
        $this->assertSame($next->id, $active[0]->academic_year_id);
        $this->assertSame('GANJIL', $active[0]->code); // tahun belum dimulai → semester pertama
    }

    public function test_activate_semester_switches_within_year(): void
    {
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertCreated();
        $genap = Semester::where('code', 'GENAP')->firstOrFail();
        $this->postJson("/api/v1/academic/semesters/{$genap->id}/activate")->assertOk();
        $this->assertTrue($genap->fresh()->is_active);
        $this->assertSame(1, Semester::where('is_active', true)->count());
    }

    public function test_validation_rules(): void
    {
        $this->createYear('2026-2027', '2026-07-13', '2027-06-30')->assertStatus(422);
        $this->createYear('2026/2028', '2026-07-13', '2027-06-30')->assertStatus(422);
        $this->createYear('2026/2027', '2027-06-30', '2026-07-13')->assertStatus(422);
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertCreated();
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertStatus(422); // nama ganda
        $this->createYear('2027/2028', '2027-06-01', '2028-05-31')->assertStatus(422)->assertJsonPath('error.code', 'YEAR_OVERLAP');

        $year = AcademicYear::firstOrFail();
        // semester di luar rentang tahun ajaran
        $this->postJson('/api/v1/academic/semesters', ['academic_year_id' => $year->id, 'code' => 'GENAP', 'start_date' => '2027-01-01', 'end_date' => '2027-08-01'])
            ->assertStatus(422);
        // kode ganda dalam tahun yang sama
        $this->postJson('/api/v1/academic/semesters', ['academic_year_id' => $year->id, 'code' => 'GANJIL', 'start_date' => '2026-07-13', 'end_date' => '2026-12-31'])
            ->assertStatus(422)->assertJsonPath('error.code', 'SEMESTER_DUPLICATE');
        // tahun ajaran dipersempit sampai semester keluar rentang
        $this->patchJson("/api/v1/academic/years/{$year->id}", ['name' => '2026/2027', 'start_date' => '2026-08-01', 'end_date' => '2027-06-30'])
            ->assertStatus(422)->assertJsonPath('error.code', 'SEMESTER_OUT_OF_RANGE');
    }

    public function test_active_or_used_year_cannot_be_deleted(): void
    {
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertCreated();
        $this->createYear('2025/2026', '2025-07-14', '2026-06-30')->assertCreated();
        $active = AcademicYear::where('name', '2026/2027')->firstOrFail();
        $old = AcademicYear::where('name', '2025/2026')->firstOrFail();

        $this->deleteJson("/api/v1/academic/years/{$active->id}")->assertStatus(422)->assertJsonPath('error.code', 'YEAR_ACTIVE');

        AcademicCalendarEvent::create(['academic_year_id' => $old->id, 'name' => 'Libur', 'type' => 'holiday', 'start_date' => '2025-12-20', 'end_date' => '2025-12-31']);
        $this->deleteJson("/api/v1/academic/years/{$old->id}")->assertStatus(422)->assertJsonPath('error.code', 'YEAR_IN_USE');

        AcademicCalendarEvent::query()->delete();
        $this->deleteJson("/api/v1/academic/years/{$old->id}")->assertOk();
        $this->assertNull(AcademicYear::find($old->id));
        $this->assertSame(0, Semester::where('academic_year_id', $old->id)->count());

        $ganjil = Semester::where('academic_year_id', $active->id)->where('is_active', true)->firstOrFail();
        $this->deleteJson("/api/v1/academic/semesters/{$ganjil->id}")->assertStatus(422)->assertJsonPath('error.code', 'SEMESTER_ACTIVE');
    }

    public function test_requires_kbm_master_permission(): void
    {
        $guru = User::create(['username' => 'plt', 'name' => 'Pelatih', 'email' => 'p@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('pelatih');
        Sanctum::actingAs($guru);
        $this->createYear('2026/2027', '2026-07-13', '2027-06-30')->assertForbidden();
        $this->assertSame(0, AcademicYear::count());
    }
}
