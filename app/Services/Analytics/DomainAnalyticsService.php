<?php

namespace App\Services\Analytics;

use App\Models\AcademicSchedule;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\Event;
use App\Models\Extracurricular;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DomainAnalyticsService
{
    public function __construct(
        protected AttendanceMetricService $metricService
    ) {}

    /**
     * Individual Student Analytics & Attendance Profile
     */
    public function getStudentAnalytics(Student $student, array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;

        // Base metrics for student
        $metrics = $this->metricService->calculateMetrics([
            'student_id' => $student->id,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        // Category Breakdown for this student
        $categories = ActivityCategory::all();
        $categoryBreakdown = [];

        foreach ($categories as $cat) {
            $catMetrics = $this->metricService->calculateMetrics([
                'student_id' => $student->id,
                'activity_category_id' => $cat->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]);

            $categoryBreakdown[] = [
                'category_id' => $cat->id,
                'category_name' => $cat->name,
                'metrics' => $catMetrics,
            ];
        }

        // Missed / Problematic Sessions (Absent, Late, Sick, Permission)
        $problematicRecords = AttendanceRecord::where('student_id', $student->id)
            ->whereIn('status', ['absent', 'late', 'sick', 'permission'])
            ->with(['attendanceSession.activity'])
            ->orderBy('check_in_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn($r) => [
                'record_id' => $r->id,
                'session_code' => $r->attendanceSession->session_code ?? '-',
                'activity_name' => $r->attendanceSession->activity->name ?? 'Kegiatan',
                'session_date' => $r->attendanceSession->session_date ?? '-',
                'status' => $r->status,
                'late_minutes' => $r->late_minutes,
                'method' => $r->method,
                'notes' => $r->notes,
            ]);

        return [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'gender' => $student->gender,
                'classroom' => $student->classroom->name ?? '-',
                'dormitory_room' => $student->dormitoryRoom->name ?? '-',
            ],
            'overall_metrics' => $metrics,
            'category_breakdown' => $categoryBreakdown,
            'problematic_records' => $problematicRecords,
        ];
    }

    /**
     * Classroom Analytics with Historical Snapshot Respect
     */
    public function getClassroomAnalytics(Classroom $classroom, array $filters = []): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;

        $metrics = $this->metricService->calculateMetrics([
            'classroom_id' => $classroom->id,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        // Student Ranking / Roster in Classroom
        $students = Student::where('classroom_id', $classroom->id)
            ->where('status', 'active')
            ->get();

        $studentSummaries = $students->map(function ($s) use ($dateFrom, $dateTo) {
            $sMetrics = $this->metricService->calculateMetrics([
                'student_id' => $s->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]);

            return [
                'student_id' => $s->id,
                'student_number' => $s->student_number,
                'student_name' => $s->name,
                'metrics' => $sMetrics,
            ];
        });

        return [
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'grade_level' => $classroom->grade_level,
                'academic_year' => $classroom->academic_year,
            ],
            'overall_metrics' => $metrics,
            'students' => $studentSummaries,
        ];
    }

    /**
     * 5 Daily Prayer Analytics (Subuh, Dzuhur, Ashar, Maghrib, Isya)
     */
    public function getPrayerAnalytics(array $filters = []): array
    {
        $prayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
        $prayerResults = [];

        foreach ($prayers as $prayerName) {
            $activity = Activity::where('name', 'like', "%{$prayerName}%")->first();
            if ($activity) {
                $metrics = $this->metricService->calculateMetrics(array_merge($filters, [
                    'activity_id' => $activity->id,
                ]));

                $prayerResults[$prayerName] = [
                    'activity_id' => $activity->id,
                    'prayer_name' => $prayerName,
                    'metrics' => $metrics,
                ];
            } else {
                $prayerResults[$prayerName] = [
                    'activity_id' => null,
                    'prayer_name' => $prayerName,
                    'metrics' => $this->metricService->emptyMetricResult(),
                ];
            }
        }

        return $prayerResults;
    }

    /**
     * Device Analytics (RFID & QR Terminals)
     */
    public function getDeviceAnalytics(): array
    {
        $devices = AttendanceDevice::all();
        $now = Carbon::now('Asia/Jakarta');

        return $devices->map(function ($d) use ($now) {
            $totalRecords = AttendanceRecord::where('attendance_device_id', $d->id)->count();
            $todayRecords = AttendanceRecord::where('attendance_device_id', $d->id)
                ->whereDate('check_in_at', $now->toDateString())
                ->count();

            $isOnline = $d->last_seen_at && $d->last_seen_at->diffInMinutes($now) <= 15;

            return [
                'device_id' => $d->id,
                'device_code' => $d->device_code,
                'device_name' => $d->name,
                'device_type' => $d->device_type,
                'location' => $d->location,
                'is_active' => $d->is_active,
                'is_online' => $isOnline,
                'last_seen_at' => $d->last_seen_at?->toIso8601String(),
                'total_records' => $totalRecords,
                'today_records' => $todayRecords,
            ];
        })->toArray();
    }
}
