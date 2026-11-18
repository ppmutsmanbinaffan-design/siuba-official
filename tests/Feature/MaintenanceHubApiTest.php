<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Student;
use App\Models\SystemBackup;
use App\Models\User;
use App\Services\System\BackupService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaintenanceHubApiTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->super = User::create(['username' => 'sa2', 'name' => 'Super', 'email' => 'sa2@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->super->assignRole('super-admin');
    }

    protected function tearDown(): void
    {
        SystemBackup::all()->each(fn ($b) => File::delete(BackupService::pathFor($b)));
        parent::tearDown();
    }

    public function test_overview_integrity_logs(): void
    {
        $c = Classroom::factory()->create();
        Student::factory()->count(4)->create(['classroom_id' => $c->id]);
        Sanctum::actingAs($this->super);

        $o = $this->getJson('/api/v1/maintenance/overview')->assertOk()->json('data');
        $this->assertSame(4, $o['counts']['students']);
        $this->assertSame('healthy', $o['health']['checks']['database']['status']);

        $i = $this->postJson('/api/v1/maintenance/integrity')->assertOk()->json('data');
        $this->assertArrayHasKey('health_score_percent', $i);
        $this->assertSame($i['scan_id'], $this->getJson('/api/v1/maintenance/overview')->json('data.last_integrity.scan_id'));

        $this->assertContains('integrity_check', array_column($this->getJson('/api/v1/maintenance/logs')->assertOk()->json('data'), 'event_type'));
    }

    public function test_reset_operational_keeps_masters_and_requires_password(): void
    {
        $c = Classroom::factory()->create();
        $students = Student::factory()->count(3)->create(['classroom_id' => $c->id]);
        $session = AttendanceSession::factory()->create();
        AttendanceRecord::factory()->create(['attendance_session_id' => $session->id, 'student_id' => $students[0]->id]);
        Sanctum::actingAs($this->super);

        $modes = $this->getJson('/api/v1/maintenance/reset-modes')->assertOk()->json('data');
        $this->assertNotEmpty(collect($modes['MODE_A_OPERATIONAL'])->firstWhere('name', 'Presensi santri'));

        $this->postJson('/api/v1/maintenance/reset', ['mode' => 'MODE_A_OPERATIONAL', 'confirmation_phrase' => 'RESET DATABASE SIUBA', 'password' => 'salah'])
            ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_PASSWORD');
        $this->postJson('/api/v1/maintenance/reset', ['mode' => 'MODE_A_OPERATIONAL', 'confirmation_phrase' => 'RESET DATABASE SIUBA', 'password' => 'Rahasia123'])
            ->assertOk()->assertJsonPath('success', true);

        $this->assertSame(0, AttendanceRecord::count());
        $this->assertSame(0, AttendanceSession::count());
        $this->assertSame(3, Student::count());
        $this->assertSame(1, SystemBackup::where('status', 'verified')->count());

        // Mode B: master santri ikut terhapus, akun tetap
        $this->postJson('/api/v1/maintenance/reset', ['mode' => 'MODE_B_MASTERS_EXCEPT_CORE', 'confirmation_phrase' => 'RESET DATABASE SIUBA', 'password' => 'Rahasia123'])->assertOk();
        $this->assertSame(0, Student::count());
        $this->assertSame(0, Classroom::count());
        $this->assertTrue(User::whereKey($this->super->id)->exists());

        config(['siuba.allow_database_reset' => false]);
        $this->postJson('/api/v1/maintenance/reset', ['mode' => 'MODE_A_OPERATIONAL', 'confirmation_phrase' => 'RESET DATABASE SIUBA', 'password' => 'Rahasia123'])->assertForbidden();

        $admin = User::create(['username' => 'adm12', 'name' => 'A', 'email' => 'a12@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/maintenance/overview')->assertOk();
        $this->postJson('/api/v1/maintenance/reset', ['mode' => 'MODE_A_OPERATIONAL'])->assertForbidden();
    }
}
