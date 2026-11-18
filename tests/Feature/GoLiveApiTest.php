<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Tahap 25: Go-Live & QA memakai data sungguhan dan menyimpan hasil di server. */
class GoLiveApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::create(['username' => 'sa', 'name' => 'Super Admin', 'email' => 's@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('super-admin');
        Sanctum::actingAs($this->admin);
    }

    public function test_overview_starts_empty_without_fabricated_results(): void
    {
        $d = $this->getJson('/api/v1/golive')->assertOk()->json('data');
        $this->assertNotEmpty($d['cases']);
        $this->assertTrue(collect($d['cases'])->every(fn ($c) => $c['status'] === 'NOT_TESTED' && !isset($c['tester_name'])));
        $this->assertTrue(collect($d['signoffs'])->every(fn ($s) => $s['status'] === 'WAITING' && !isset($s['representative_name'])));
        $this->assertSame([], $d['bugs']);
        $this->assertNull($d['self_test']);
        $this->assertFalse($d['ready']);
    }

    public function test_self_test_checks_real_data(): void
    {
        $r = $this->postJson('/api/v1/golive/self-test')->assertOk()->json('data');
        $byId = collect($r['checks'])->keyBy('id');
        $this->assertSame('pass', $byId['db']['status']);
        $this->assertSame('pass', $byId['migrations']['status']);
        $this->assertSame('fail', $byId['students']['status']);      // belum ada santri
        $this->assertSame('fail', $byId['academic_year']['status']);
        $this->assertSame('fail', $byId['backup']['status']);
        $this->assertFalse($r['ready']);

        Student::factory()->count(2)->create(['is_active' => true]);
        AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $r2 = collect($this->postJson('/api/v1/golive/self-test')->json('data.checks'))->keyBy('id');
        $this->assertSame('pass', $r2['students']['status']);
        $this->assertSame('pass', $r2['academic_year']['status']);
        $this->assertNotNull($this->getJson('/api/v1/golive')->json('data.self_test.ran_at'));
    }

    public function test_uat_signoff_and_bugs_are_stored_with_real_user(): void
    {
        $case = $this->getJson('/api/v1/golive')->json('data.cases.0.id');
        $this->postJson("/api/v1/golive/uat/{$case}", ['status' => 'FAIL'])->assertStatus(422);
        $d = $this->postJson("/api/v1/golive/uat/{$case}", ['status' => 'PASS', 'actual_result' => 'Sesuai'])->assertOk()->json('data');
        $c = collect($d['cases'])->firstWhere('id', $case);
        $this->assertSame('PASS', $c['status']);
        $this->assertSame('Super Admin', $c['tester_name']);
        $this->postJson('/api/v1/golive/uat/UAT-NGAWUR-99', ['status' => 'PASS'])->assertNotFound();

        $role = $d['signoffs'][0]['role'];
        $this->postJson('/api/v1/golive/signoffs', ['role' => $role, 'status' => 'ACCEPTED'])->assertStatus(422);
        $d = $this->postJson('/api/v1/golive/signoffs', ['role' => $role, 'status' => 'ACCEPTED', 'representative_name' => 'Ust. Contoh', 'representative_title' => 'Mudir'])->assertOk()->json('data');
        $this->assertSame('Ust. Contoh', $d['signoffs'][0]['representative_name']);
        $this->assertSame('Super Admin', $d['signoffs'][0]['recorded_by']);

        $this->postJson('/api/v1/golive/bugs', ['title' => 'Tombol cetak tidak muncul', 'module' => 'Laporan', 'severity' => 'CRITICAL'])->assertCreated();
        $d = $this->postJson('/api/v1/golive/bugs', ['title' => 'Typo', 'module' => 'Dashboard', 'severity' => 'LOW'])->assertCreated()->json('data');
        $this->assertSame(['BUG-001', 'BUG-002'], array_column($d['bugs'], 'id'));
        $gate = collect($d['gates'])->firstWhere('id', 'bugs');
        $this->assertFalse($gate['passed']);
        $d = $this->patchJson('/api/v1/golive/bugs/BUG-001', ['status' => 'FIXED', 'notes' => 'Diperbaiki'])->assertOk()->json('data');
        $this->assertTrue(collect($d['gates'])->firstWhere('id', 'bugs')['passed']);
        $this->assertNotNull($d['bugs'][0]['resolved_at']);
    }

    public function test_requires_permission(): void
    {
        $u = User::create(['username' => 'g', 'name' => 'Guru', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->assignRole('guru');
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/golive')->assertForbidden();
    }
}
