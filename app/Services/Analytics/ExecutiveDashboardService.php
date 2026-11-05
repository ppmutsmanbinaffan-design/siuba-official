<?php

namespace App\Services\Analytics;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ExecutiveDashboardService
{
    public function __construct(
        protected AttendanceMetricService $metricService
    ) {}

    public function getExecutiveSummary(?string $date = null): array
    {
        $targetDate = $date ?? Carbon::now('Asia/Jakarta')->toDateString();

        // 1. Active Students Count
        $activeStudentsCount = Student::where('status', 'active')->count();

        // 2. Today's Sessions & Metrics
        $todayMetrics = $this->metricService->calculateMetrics([
            'date_from' => $targetDate,
            'date_to' => $targetDate,
            'session_state' => 'all',
        ]);

        $todaySessionsCount = AttendanceSession::where('session_date', $targetDate)
            ->where('status', '!=', 'cancelled')
            ->count();

        $openSessionsCount = AttendanceSession::where('session_date', $targetDate)
            ->where('status', 'open')
            ->count();

        $closedSessionsCount = AttendanceSession::where('session_date', $targetDate)
            ->where('status', 'closed')
            ->count();

        // 3. 7-Day Trend
        $startDate7 = Carbon::parse($targetDate)->subDays(6)->toDateString();
        $trend7Days = $this->getDailyTrend($startDate7, $targetDate);

        // 4. Category Breakdown Today
        $categoryBreakdown = $this->getCategoryBreakdown($targetDate, $targetDate);

        // 5. Method Distribution Today
        $methodDistribution = $this->getMethodDistribution($targetDate, $targetDate);

        // 6. Action Required
        $actionRequired = $this->getActionRequired($targetDate);

        return [
            'target_date' => $targetDate,
            'active_students' => $activeStudentsCount,
            'today_sessions' => [
                'total' => $todaySessionsCount,
                'open' => $openSessionsCount,
                'closed' => $closedSessionsCount,
            ],
            'today_metrics' => $todayMetrics,
            'trend_7_days' => $trend7Days,
            'category_breakdown' => $categoryBreakdown,
            'method_distribution' => $methodDistribution,
            'action_required' => $actionRequired,
        ];
    }

    public function getDailyTrend(string $startDate, string $endDate): array
    {
        $dates = [];
        $current = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        while ($current->lessThanOrEqualTo($end)) {
            $dateStr = $current->toDateString();
            $metrics = $this->metricService->calculateMetrics([
                'date_from' => $dateStr,
                'date_to' => $dateStr,
            ]);

            $dates[] = [
                'date' => $dateStr,
                'day_name' => $current->translatedFormat('l'),
                'metrics' => $metrics,
            ];

            $current->addDay();
        }

        return $dates;
    }

    public function getCategoryBreakdown(string $startDate, string $endDate): array
    {
        $categories = ActivityCategory::with(['activities'])->get();
        $breakdown = [];

        foreach ($categories as $cat) {
            $catSessions = AttendanceSession::whereBetween('session_date', [$startDate, $endDate])
                ->where('status', '!=', 'cancelled')
                ->whereHas('activity', fn($q) => $q->where('activity_category_id', $cat->id))
                ->pluck('id')
                ->toArray();

            $metrics = empty($catSessions)
                ? $this->metricService->emptyMetricResult()
                : $this->metricService->calculateMetrics(['session_ids' => $catSessions]);

            $breakdown[] = [
                'category_id' => $cat->id,
                'category_name' => $cat->name,
                'category_code' => $cat->code,
                'session_count' => count($catSessions),
                'metrics' => $metrics,
            ];
        }

        return $breakdown;
    }

    public function getMethodDistribution(string $startDate, string $endDate): array
    {
        $sessionIds = AttendanceSession::whereBetween('session_date', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled')
            ->pluck('id')
            ->toArray();

        if (empty($sessionIds)) {
            return [
                'total' => 0,
                'manual' => 0,
                'qr' => 0,
                'rfid' => 0,
                'manual_pct' => 0.0,
                'qr_pct' => 0.0,
                'rfid_pct' => 0.0,
            ];
        }

        $counts = AttendanceRecord::whereIn('attendance_session_id', $sessionIds)
            ->select('method', DB::raw('count(*) as count'))
            ->groupBy('method')
            ->pluck('count', 'method')
            ->toArray();

        $manual = $counts['manual'] ?? 0;
        $qr = $counts['qr'] ?? 0;
        $rfid = $counts['rfid'] ?? 0;
        $total = $manual + $qr + $rfid;

        $pct = fn(int $num) => $total > 0 ? round(($num / $total) * 100, 1) : 0.0;

        return [
            'total' => $total,
            'manual' => $manual,
            'qr' => $qr,
            'rfid' => $rfid,
            'manual_pct' => $pct($manual),
            'qr_pct' => $pct($qr),
            'rfid_pct' => $pct($rfid),
        ];
    }

    public function getActionRequired(string $targetDate): array
    {
        // 1. Unclosed overdue sessions
        $now = Carbon::now('Asia/Jakarta');
        $overdueSessions = AttendanceSession::where('status', 'open')
            ->where('end_at', '<', $now)
            ->with(['activity'])
            ->get()
            ->map(fn($s) => [
                'session_id' => $s->id,
                'session_code' => $s->session_code,
                'activity_name' => $s->activity->name ?? 'Kegiatan',
                'end_at' => $s->end_at?->toIso8601String(),
                'type' => 'overdue_unclosed',
            ])
            ->toArray();

        // 2. High Alpha Students (Santri dengan >= 3 Alpha dalam 30 hari terakhir)
        $thirtyDaysAgo = Carbon::parse($targetDate)->subDays(30)->toDateString();
        $attentionStudents = AttendanceRecord::where('status', 'absent')
            ->whereHas('attendanceSession', fn($q) => $q->where('session_date', '>=', $thirtyDaysAgo))
            ->select('student_id', DB::raw('count(*) as absent_count'))
            ->groupBy('student_id')
            ->having('absent_count', '>=', 3)
            ->with(['student.classroom'])
            ->get()
            ->map(fn($r) => [
                'student_id' => $r->student_id,
                'student_name' => $r->student->name ?? 'Santri',
                'student_number' => $r->student->student_number ?? '-',
                'classroom_name' => $r->student->classroom->name ?? '-',
                'absent_count' => $r->absent_count,
            ])
            ->toArray();

        return [
            'overdue_sessions' => $overdueSessions,
            'attention_students' => $attentionStudents,
            'overdue_count' => count($overdueSessions),
            'attention_students_count' => count($attentionStudents),
        ];
    }
}
