<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Models\SystemBackup;
use App\Models\User;
use App\Services\System\BackupService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Tahap 24: uji pulih backup sungguhan, jam server untuk koreksi waktu offline. */
class SyncCenterStage24Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    protected function tearDown(): void
    {
        SystemBackup::all()->each(fn ($b) => File::delete(BackupService::pathFor($b)));
        parent::tearDown();
    }

    public function test_verify_backup_reads_whole_file(): void
    {
        Student::factory()->count(4)->create();
        $id = $this->postJson('/api/v1/maintenance/backups', ['notes' => 'Uji'])->assertCreated()->json('data.backup_id');

        $r = $this->postJson("/api/v1/maintenance/backups/{$id}/verify")->assertOk()->json('data');
        $this->assertTrue($r['ok']);
        $this->assertTrue($r['checksum_ok']);
        $this->assertTrue($r['complete']);
        $this->assertGreaterThanOrEqual(4, $r['counts']['students'] ?? 0);
        $this->assertSame([], $r['problems']);
        $this->assertDatabaseHas('audit_logs', ['event' => 'backup_verified']);
        $this->assertNotNull($this->getJson('/api/v1/maintenance/backups')->json('data.0.checksum'));
    }

    public function test_verify_detects_truncated_backup_and_disables_it(): void
    {
        $id = $this->postJson('/api/v1/maintenance/backups')->assertCreated()->json('data.backup_id');
        $b = SystemBackup::where('backup_id', $id)->first();
        $path = BackupService::pathFor($b);
        // Potong berkas: tulis ulang tanpa penanda akhir, checksum disesuaikan agar hanya "terpotong" yang terdeteksi
        $lines = explode("\n", trim(gzdecode(file_get_contents($path))));
        array_pop($lines);
        file_put_contents($path, gzencode(implode("\n", $lines) . "\n"));
        $b->update(['checksum' => hash_file('sha256', $path)]);

        $r = $this->postJson("/api/v1/maintenance/backups/{$id}/verify")->assertOk()->json('data');
        $this->assertFalse($r['ok']);
        $this->assertFalse($r['complete']);
        $this->assertSame('failed', $b->fresh()->status);
        // Backup gagal uji tidak bisa dipulihkan
        $super = User::create(['username' => 'sa', 'name' => 'SA', 'email' => 's@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $super->assignRole('super-admin');
        Sanctum::actingAs($super);
        $this->postJson("/api/v1/maintenance/backups/{$id}/restore", ['confirmation' => "PULIHKAN {$id}"])->assertNotFound();
    }

    public function test_verify_requires_backup_permission(): void
    {
        $u = User::create(['username' => 'g', 'name' => 'Guru', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->assignRole('guru');
        Sanctum::actingAs($u);
        $this->postJson('/api/v1/maintenance/backups/BKP-X/verify')->assertForbidden();
    }

    public function test_responses_carry_server_time(): void
    {
        $ms = (int) $this->getJson('/api/v1/health')->headers->get('X-Server-Time');
        $this->assertEqualsWithDelta(now()->getTimestampMs(), $ms, 5000);
    }

    public function test_offline_sync_uses_clock_corrected_time(): void
    {
        $this->travelTo(Carbon::parse('2026-08-24 06:00:00'));
        $act = Activity::create(['activity_category_id' => ActivityCategory::create(['name' => 'Ibadah', 'code' => 'IBD'])->id, 'name' => 'Subuh', 'code' => 'SBH']);
        $student = Student::factory()->create();
        $session = AttendanceSession::create([
            'activity_id' => $act->id, 'session_code' => 'SBH-1', 'session_date' => '2026-08-24',
            'start_at' => '2026-08-24 04:00:00', 'present_until' => '2026-08-24 04:30:00', 'late_until' => '2026-08-24 05:00:00',
            'end_at' => '2026-08-24 05:30:00', 'status' => SessionStatus::OPEN,
        ]);
        AttendanceSessionParticipant::create(['attendance_session_id' => $session->id, 'student_id' => $student->id, 'eligibility_status' => 'eligible']);

        // Jam HP terlambat 20 menit: tercatat 04:15 di HP, sebenarnya 04:35 (terlambat)
        $this->postJson('/api/v1/offline/attendance/sync', ['items' => [[
            'client_request_id' => 'req_clock_1', 'local_id' => 'loc_1', 'session_id' => $session->id, 'student_id' => $student->id,
            'method' => 'qr', 'captured_at_client' => '2026-08-24T04:15:00+07:00',
            'estimated_server_time' => '2026-08-24T04:35:00+07:00', 'clock_offset_ms' => 1200000,
        ]]])->assertOk()->assertJsonPath('results.0.success', true);

        $rec = AttendanceRecord::where('student_id', $student->id)->firstOrFail();
        $this->assertSame('2026-08-24 04:35', $rec->check_in_at->timezone('Asia/Jakarta')->format('Y-m-d H:i'));
        $this->assertSame('late', $rec->status->value);
    }
}
