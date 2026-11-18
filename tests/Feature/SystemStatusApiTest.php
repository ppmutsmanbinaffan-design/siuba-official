<?php

namespace Tests\Feature;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\AuditLog;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 22: halaman Keamanan & Audit memakai data server
 * (kesehatan sistem, audit integritas + perbaikan aman, catatan uji pemulihan).
 */
class SystemStatusApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'adm@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('super-admin');
    }

    public function test_health_report_uses_real_values_and_counts_failed_logins(): void
    {
        $this->postJson('/api/v1/auth/login', ['username' => 'adm', 'password' => 'salah-sekali'])->assertStatus(401);
        $this->postJson('/api/v1/auth/login', ['username' => 'tidakada', 'password' => 'salah-sekali'])->assertStatus(401);
        $this->assertSame(2, AuditLog::where('event', 'auth.login_failed')->count());
        $this->assertStringNotContainsString('salah-sekali', json_encode(AuditLog::where('event', 'auth.login_failed')->get()));

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/v1/system/health-report')->assertOk();
        $d = $res->json('data');
        $this->assertSame(2, $d['failed_logins_today']);
        $this->assertMatchesRegularExpression('/SQLite|MySQL|MariaDB|PostgreSQL/i', $d['database_engine']);
        $this->assertNull($d['backup_last_successful_at']);
        $this->assertSame('critical', $d['backup_freshness_status']);
        $this->assertContains($d['overall_status'], ['healthy', 'warning', 'critical']);
        $this->assertArrayHasKey('iot_key_configured', $d);
    }

    public function test_requires_permission(): void
    {
        $u = User::create(['username' => 'biasa', 'name' => 'Biasa', 'email' => 'b@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/system/health-report')->assertForbidden();
        $this->postJson('/api/v1/system/integrity')->assertForbidden();
    }

    public function test_integrity_detects_and_repairs_incomplete_closed_session(): void
    {
        $session = AttendanceSession::factory()->create(['status' => SessionStatus::CLOSED, 'session_code' => 'SES-TUTUP']);
        [$a, $b] = Student::factory()->count(2)->create();
        // eligibility_status NULL tetap dihitung sebagai peserta
        AttendanceSessionParticipant::create(['attendance_session_id' => $session->id, 'student_id' => $a->id]);
        AttendanceSessionParticipant::create(['attendance_session_id' => $session->id, 'student_id' => $b->id]);
        AttendanceRecord::create(['attendance_session_id' => $session->id, 'student_id' => $a->id, 'status' => AttendanceStatus::PRESENT, 'method' => 'manual', 'check_in_at' => now()]);

        Sanctum::actingAs($this->admin);
        $res = $this->postJson('/api/v1/system/integrity')->assertOk();
        $issue = collect($res->json('data.issues'))->firstWhere('type', 'incomplete_closed_required_session');
        $this->assertNotNull($issue);
        $this->assertTrue($issue['can_auto_repair']);
        $this->assertSame('SES-TUTUP', $issue['affected_entity_label']);
        $this->assertSame(1, $res->json('data.metrics.incomplete_closed_sessions_count'));
        $this->assertSame('WARNING', $res->json('data.status'));

        $this->postJson('/api/v1/system/integrity/repair', ['type' => $issue['type'], 'context' => $issue['context']])->assertOk();
        $this->assertSame(AttendanceStatus::ABSENT, AttendanceRecord::where('student_id', $b->id)->first()->status);
        $this->assertDatabaseHas('audit_logs', ['event' => 'integrity_repair']);

        $after = $this->postJson('/api/v1/system/integrity')->assertOk();
        $this->assertNull(collect($after->json('data.issues'))->firstWhere('type', 'incomplete_closed_required_session'));

        // perbaikan kedua: sudah tidak ada yang perlu dilengkapi, tetap aman
        $this->postJson('/api/v1/system/integrity/repair', ['type' => $issue['type'], 'context' => $issue['context']])->assertOk();
    }

    public function test_device_assignment_repair_and_manual_only_types(): void
    {
        $session = AttendanceSession::factory()->create(['status' => SessionStatus::CLOSED]);
        $device = AttendanceDevice::create(['device_code' => 'GRB-1', 'device_name' => 'Gerbang', 'device_type' => 'rfid_reader', 'is_active' => true, 'current_session_id' => $session->id]);

        Sanctum::actingAs($this->admin);
        $issue = collect($this->postJson('/api/v1/system/integrity')->json('data.issues'))->firstWhere('type', 'invalid_device_session_assignment');
        $this->assertNotNull($issue);
        $this->postJson('/api/v1/system/integrity/repair', ['type' => $issue['type'], 'context' => $issue['context']])->assertOk();
        $this->assertNull($device->fresh()->current_session_id);

        $this->postJson('/api/v1/system/integrity/repair', ['type' => 'duplicate_rfid_uid', 'context' => ['rfid_uid' => 'X']])->assertStatus(422);
    }

    public function test_dr_drills_recorded_on_server(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/system/dr-drills')->assertOk()->assertExactJson(['success' => true, 'data' => []]);

        $this->postJson('/api/v1/system/dr-drills', ['plan_id' => 'dr_database_corruption', 'status' => 'PASS', 'notes' => 'Pulih 20 menit'])->assertOk();
        $res = $this->getJson('/api/v1/system/dr-drills')->assertOk();
        $this->assertSame('PASS', $res->json('data.dr_database_corruption.status'));
        $this->assertSame('Admin', $res->json('data.dr_database_corruption.by'));

        $this->postJson('/api/v1/system/dr-drills', ['plan_id' => 'ngawur', 'status' => 'PASS'])->assertStatus(422);
    }
}
