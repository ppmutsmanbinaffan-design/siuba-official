<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflineSyncEngineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        (new \Database\Seeders\RolePermissionSeeder())->run();
    }

    public function test_health_check_endpoint(): void
    {
        $response = $this->getJson('/api/v1/health');
        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'ok',
            'app_version' => 'v1.10.0-pwa',
        ]);
    }

    public function test_idempotent_offline_sync(): void
    {
        $user = \App\Models\User::create([
            'name' => 'Sync Operator',
            'username' => 'sync.operator',
            'email' => 'sync@utsman.sch.id',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'is_active' => true,
        ]);
        $user->assignRole('super-admin');
        \Laravel\Sanctum\Sanctum::actingAs($user, ['*']);

        $category = ActivityCategory::create(['name' => 'Ibadah', 'code' => 'IBD']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'name' => 'Salat Subuh',
            'code' => 'SHL-SBH',
            'activity_type' => 'routine',
        ]);

        $classroom = Classroom::create(['name' => '10A', 'grade_level' => '10', 'academic_year' => '2026/2027']);
        $student = Student::create([
            'student_number' => 'STU2001',
            'name' => 'Ahmad Fauzi',
            'classroom_id' => $classroom->id,
            'gender' => 'L',
            'status' => 'active',
        ]);

        $session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'IBD-SBH-20260824',
            'session_date' => '2026-08-24',
            'start_at' => '2026-08-24 04:00:00',
            'present_until' => '2026-08-24 04:30:00',
            'late_until' => '2026-08-24 05:00:00',
            'end_at' => '2026-08-24 05:30:00',
            'status' => SessionStatus::OPEN,
        ]);

        AttendanceSessionParticipant::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'eligibility_status' => 'eligible',
        ]);

        $clientRequestId = 'req_test_uuid_12345';
        $payload = [
            'items' => [
                [
                    'client_request_id' => $clientRequestId,
                    'local_id' => 'loc_1',
                    'session_id' => $session->id,
                    'student_id' => $student->id,
                    'method' => 'manual',
                    'status' => 'present',
                    'captured_at_client' => '2026-08-24T04:25:00+07:00',
                    'notes' => 'Catatan Offline',
                ]
            ]
        ];

        // 1. First sync - Should create record
        $response1 = $this->postJson('/api/v1/offline/attendance/sync', $payload);
        $response1->assertStatus(200);
        $response1->assertJsonPath('results.0.code', 'SYNCED');
        $response1->assertJsonPath('results.0.success', true);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'client_request_id' => $clientRequestId,
            'was_offline' => true,
        ]);

        // 2. Second sync with exact same client_request_id - Must be idempotent
        $response2 = $this->postJson('/api/v1/offline/attendance/sync', $payload);
        $response2->assertStatus(200);
        $response2->assertJsonPath('results.0.code', 'ALREADY_SYNCED');
        $response2->assertJsonPath('results.0.success', true);

        // Count should still be exactly 1
        $this->assertEquals(1, AttendanceRecord::where('attendance_session_id', $session->id)->where('student_id', $student->id)->count());
    }

    public function test_auto_alpha_conflict_resolution(): void
    {
        $user = \App\Models\User::firstOrCreate(
            ['username' => 'sync.operator2'],
            [
                'name' => 'Sync Operator 2',
                'email' => 'sync2@utsman.sch.id',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'is_active' => true,
            ]
        );
        $user->assignRole('super-admin');
        \Laravel\Sanctum\Sanctum::actingAs($user, ['*']);

        $category = ActivityCategory::create(['name' => 'Ibadah', 'code' => 'IBD']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'name' => 'Salat Maghrib',
            'code' => 'SHL-MGB',
            'activity_type' => 'routine',
        ]);

        $classroom = Classroom::create(['name' => '10A', 'grade_level' => '10', 'academic_year' => '2026/2027']);
        $student = Student::create([
            'student_number' => 'STU2002',
            'name' => 'Bilal',
            'classroom_id' => $classroom->id,
            'gender' => 'L',
            'status' => 'active',
        ]);

        $session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'IBD-MGB-20260824',
            'session_date' => '2026-08-24',
            'start_at' => '2026-08-24 17:45:00',
            'present_until' => '2026-08-24 18:15:00',
            'late_until' => '2026-08-24 18:30:00',
            'end_at' => '2026-08-24 19:00:00',
            'status' => SessionStatus::CLOSED,
        ]);

        AttendanceSessionParticipant::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'eligibility_status' => 'eligible',
        ]);

        // System auto-finalized student to Absent when session was closed
        $systemRecord = AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => AttendanceStatus::ABSENT,
            'method' => AttendanceMethod::MANUAL,
            'record_source' => 'system',
            'notes' => 'Auto-Alpha by System upon Session Closure',
        ]);

        // Offline device later reconnects and syncs a valid capture made by ustadh before session closed
        $payload = [
            'items' => [
                [
                    'client_request_id' => 'req_auto_alpha_fix_99',
                    'local_id' => 'loc_2',
                    'session_id' => $session->id,
                    'student_id' => $student->id,
                    'method' => 'manual',
                    'status' => 'present',
                    'captured_at_client' => '2026-08-24T18:05:00+07:00',
                    'notes' => 'Hadir tepat waktu offline',
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/offline/attendance/sync', $payload);
        $response->assertStatus(200);
        $response->assertJsonPath('results.0.code', 'AUTO_ALPHA_CONFLICT_RESOLVED');
        $response->assertJsonPath('results.0.final_status', 'present');

        // Record is updated to present
        $this->assertEquals(AttendanceStatus::PRESENT, $systemRecord->fresh()->status);
        $this->assertEquals('operator', $systemRecord->fresh()->record_source);

        // Audit history is created
        $this->assertDatabaseHas('attendance_record_histories', [
            'attendance_record_id' => $systemRecord->id,
            'student_id' => $student->id,
            'old_status' => 'absent',
            'new_status' => 'present',
        ]);
    }

    public function test_human_correction_protection_from_silent_overwrite(): void
    {
        $user = \App\Models\User::firstOrCreate(
            ['username' => 'sync.operator3'],
            [
                'name' => 'Sync Operator 3',
                'email' => 'sync3@utsman.sch.id',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'is_active' => true,
            ]
        );
        $user->assignRole('super-admin');
        \Laravel\Sanctum\Sanctum::actingAs($user, ['*']);

        $category = ActivityCategory::create(['name' => 'Ibadah', 'code' => 'IBD']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'name' => 'Salat Isya',
            'code' => 'SHL-ISY',
            'activity_type' => 'routine',
        ]);

        $classroom = Classroom::create(['name' => '10A', 'grade_level' => '10', 'academic_year' => '2026/2027']);
        $student = Student::create([
            'student_number' => 'STU2003',
            'name' => 'Hamzah',
            'classroom_id' => $classroom->id,
            'gender' => 'L',
            'status' => 'active',
        ]);

        $session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'IBD-ISY-20260824',
            'session_date' => '2026-08-24',
            'start_at' => '2026-08-24 19:15:00',
            'present_until' => '2026-08-24 19:45:00',
            'late_until' => '2026-08-24 20:00:00',
            'end_at' => '2026-08-24 20:30:00',
            'status' => SessionStatus::CLOSED,
        ]);

        AttendanceSessionParticipant::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'eligibility_status' => 'eligible',
        ]);

        // Human teacher manually marked student as 'permission' (Izin)
        $humanRecord = AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => AttendanceStatus::PERMISSION,
            'method' => AttendanceMethod::MANUAL,
            'record_source' => 'operator',
            'notes' => 'Izin ke klinik (Manual oleh Ust. Zaid)',
        ]);

        // Offline terminal attempts to sync 'present'
        $payload = [
            'items' => [
                [
                    'client_request_id' => 'req_human_override_conflict',
                    'local_id' => 'loc_3',
                    'session_id' => $session->id,
                    'student_id' => $student->id,
                    'method' => 'manual',
                    'status' => 'present',
                    'captured_at_client' => '2026-08-24T19:35:00+07:00',
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/offline/attendance/sync', $payload);
        $response->assertJsonPath('results.0.code', 'MANUAL_RECORD_CONFLICT_REQUIRES_REVIEW');
        $response->assertJsonPath('results.0.requires_review', true);

        // Human record must NOT be modified
        $this->assertEquals(AttendanceStatus::PERMISSION, $humanRecord->fresh()->status);
    }
}
