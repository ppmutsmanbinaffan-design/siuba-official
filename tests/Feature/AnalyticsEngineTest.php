<?php

namespace Tests\Feature;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\Analytics\AttendanceMetricService;
use App\Services\Analytics\AttendanceReportService;
use App\Services\Analytics\ExecutiveDashboardService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendance_metric_service_uses_eligible_participants_as_denominator(): void
    {
        $metricService = new AttendanceMetricService();

        $category = ActivityCategory::create(['name' => 'Akademik', 'code' => 'AKD']);
        $activity = Activity::create([
            'activity_category_id' => $category->id,
            'name' => 'KBM Matematika',
            'code' => 'MAT-10A',
            'activity_type' => 'academic',
        ]);

        $classroom = Classroom::create(['name' => '10A', 'grade_level' => '10', 'academic_year' => '2026/2027']);

        // Create 10 students
        $students = [];
        for ($i = 1; $i <= 10; $i++) {
            $students[] = Student::create([
                'student_number' => "STU100{$i}",
                'name' => "Santri {$i}",
                'classroom_id' => $classroom->id,
                'gender' => 'L',
                'status' => 'active',
            ]);
        }

        $session = AttendanceSession::create([
            'activity_id' => $activity->id,
            'session_code' => 'KBM-MAT-20260824',
            'session_date' => '2026-08-24',
            'start_at' => '2026-08-24 07:30:00',
            'present_until' => '2026-08-24 07:45:00',
            'late_until' => '2026-08-24 08:00:00',
            'end_at' => '2026-08-24 09:00:00',
            'status' => SessionStatus::CLOSED,
        ]);

        // Register all 10 students into attendance_session_participants snapshot (Denominator = 10)
        foreach ($students as $s) {
            AttendanceSessionParticipant::create([
                'attendance_session_id' => $session->id,
                'student_id' => $s->id,
                'eligibility_status' => 'eligible',
                'classroom_id' => $classroom->id,
            ]);
        }

        // Record attendance for 8 students: 6 present, 1 late, 1 absent. (2 unrecorded)
        for ($i = 0; $i < 6; $i++) {
            AttendanceRecord::create([
                'attendance_session_id' => $session->id,
                'student_id' => $students[$i]->id,
                'status' => AttendanceStatus::PRESENT,
                'method' => AttendanceMethod::MANUAL,
            ]);
        }

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $students[6]->id,
            'status' => AttendanceStatus::LATE,
            'method' => AttendanceMethod::MANUAL,
            'late_minutes' => 5,
        ]);

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $students[7]->id,
            'status' => AttendanceStatus::ABSENT,
            'method' => AttendanceMethod::MANUAL,
        ]);

        $metrics = $metricService->calculateMetrics(['session_ids' => [$session->id]]);

        $this->assertEquals(10, $metrics['total_eligible']);
        $this->assertEquals(8, $metrics['total_recorded']);
        $this->assertEquals(6, $metrics['present']);
        $this->assertEquals(1, $metrics['late']);
        $this->assertEquals(1, $metrics['absent']);
        $this->assertEquals(2, $metrics['unrecorded']);

        // Rates:
        // Completion = 8/10 = 80.0%
        // Attendance Rate = (6 + 1) / 10 = 70.0%
        // On-Time Rate = 6/10 = 60.0%
        // Late Rate = 1/10 = 10.0%
        // Absent Rate = 1/10 = 10.0%
        $this->assertEquals(80.0, $metrics['completion_rate']);
        $this->assertEquals(70.0, $metrics['attendance_rate']);
        $this->assertEquals(60.0, $metrics['on_time_rate']);
        $this->assertEquals(10.0, $metrics['late_rate']);
        $this->assertEquals(10.0, $metrics['absent_rate']);
    }

    public function test_zero_denominator_safe_guarding(): void
    {
        $metricService = new AttendanceMetricService();
        $emptyMetrics = $metricService->calculateMetrics(['session_ids' => [9999]]);

        $this->assertEquals(0, $emptyMetrics['total_eligible']);
        $this->assertEquals(0.0, $emptyMetrics['attendance_rate']);
        $this->assertEquals(0.0, $emptyMetrics['completion_rate']);
    }

    public function test_dashboard_api_returns_structured_metrics(): void
    {
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'dashboard.view', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'dashboard.executive', 'guard_name' => 'web']);
        $role->givePermissionTo(['dashboard.view', 'dashboard.executive']);

        $user = \App\Models\User::create([
            'name' => 'Super Admin Test',
            'username' => 'test.superadmin',
            'email' => 'test.superadmin@utsman.sch.id',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'is_active' => true,
        ]);
        $user->assignRole('super-admin');

        \Laravel\Sanctum\Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/v1/analytics/dashboard');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'target_date',
                'active_students',
                'today_sessions',
                'today_metrics',
                'trend_7_days',
                'category_breakdown',
            ],
        ]);
    }
}
