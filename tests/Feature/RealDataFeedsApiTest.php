<?php

namespace Tests\Feature;

use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 18: data yang dulu hanya berupa contoh di browser kini dikirim dari server
 * (log perangkat, log audit, riwayat koreksi presensi).
 */
class RealDataFeedsApiTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->super = User::create(['username' => 'sa18', 'name' => 'Super 18', 'email' => 'sa18@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->super->assignRole('super-admin');
    }

    public function test_device_logs_endpoint_returns_latest_first_with_limit(): void
    {
        $device = AttendanceDevice::create(['device_code' => 'GATE-01', 'device_name' => 'Gerbang', 'device_type' => 'rfid_reader', 'is_active' => true]);
        foreach (['info', 'warning', 'error'] as $i => $level) {
            AttendanceDeviceLog::create([
                'attendance_device_id' => $device->id,
                'device_code' => 'GATE-01',
                'event_type' => 'CARD_SCANNED',
                'level' => $level,
                'message' => "log {$i}",
                'created_at' => now()->subMinutes(10 - $i),
            ]);
        }
        Sanctum::actingAs($this->super);

        $rows = $this->getJson('/api/v1/attendance/device-logs?limit=2')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $this->assertSame('log 2', $rows[0]['message']);
        $this->assertSame('error', $rows[0]['status']);
        $this->assertSame('GATE-01', $rows[0]['device_code']);
        $this->assertSame('success', $this->getJson('/api/v1/attendance/device-logs')->json('data.2.status'));
    }

    public function test_device_logs_requires_permission(): void
    {
        $plain = User::create(['username' => 'u18', 'name' => 'Biasa', 'email' => 'u18@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        Sanctum::actingAs($plain);
        $this->getJson('/api/v1/attendance/device-logs')->assertForbidden();
        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    public function test_audit_logs_endpoint_shape(): void
    {
        AuditLog::create([
            'user_id' => $this->super->id,
            'event' => 'backup_created',
            'auditable_type' => 'App\\Models\\SystemBackup',
            'auditable_id' => 7,
            'new_values' => ['filename' => 'x.ndjson.gz'],
            'reason' => 'Backup harian',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);
        Sanctum::actingAs($this->super);

        $row = $this->getJson('/api/v1/audit-logs')->assertOk()->json('data.0');
        $this->assertSame('backup_created', $row['event']);
        $this->assertSame('Super 18', $row['user_name']);
        $this->assertSame('SystemBackup', $row['auditable_type']);
        $this->assertSame('server', $row['source']);
        $this->assertSame('Backup harian', $row['reason']);
    }

    public function test_snapshot_includes_record_histories(): void
    {
        $c = Classroom::factory()->create();
        $student = Student::factory()->create(['classroom_id' => $c->id, 'name' => 'Ahmad Uji']);
        $session = AttendanceSession::factory()->create(['session_date' => today()->toDateString()]);
        $record = AttendanceRecord::factory()->create(['attendance_session_id' => $session->id, 'student_id' => $student->id]);
        AttendanceRecordHistory::create([
            'attendance_record_id' => $record->id,
            'student_id' => $student->id,
            'old_status' => 'absent',
            'new_status' => 'present',
            'reason' => 'Salah input',
            'changed_by' => 'Ust. Operator',
            'changed_at' => now(),
        ]);
        Sanctum::actingAs($this->super);

        $h = $this->getJson('/api/v1/attendance/snapshot')->assertOk()->json('data.record_histories');
        $this->assertCount(1, $h);
        $this->assertSame('Ahmad Uji', $h[0]['student_name']);
        $this->assertSame('Ust. Operator', $h[0]['changed_by']);
        $this->assertSame('present', $h[0]['new_status']);
    }
}
