<?php

namespace App\Services\Analytics;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AttendanceMetricService
{
    /**
     * Compute aggregated metrics for given query filters.
     * CRITICAL RULE: Denominator MUST be eligible participants from attendance_session_participants.
     *
     * @param array $filters [
     *   'date_from' => string,
     *   'date_to' => string,
     *   'session_ids' => array,
     *   'classroom_id' => int,
     *   'dormitory_id' => int,
     *   'dormitory_room_id' => int,
     *   'activity_id' => int,
     *   'activity_category_id' => int,
     *   'student_id' => int,
     *   'method' => string,
     *   'device_id' => int,
     *   'session_state' => string ('closed_only', 'include_open', 'all'),
     *   'required_only' => bool,
     * ]
     */
    public function calculateMetrics(array $filters = []): array
    {
        // 1. Resolve Session Scoping
        $sessionQuery = AttendanceSession::query()->where('status', '!=', 'cancelled');

        if (!empty($filters['date_from'])) {
            $sessionQuery->where('session_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $sessionQuery->where('session_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['session_ids'])) {
            $sessionQuery->whereIn('id', (array) $filters['session_ids']);
        }
        if (!empty($filters['activity_id'])) {
            $sessionQuery->where('activity_id', $filters['activity_id']);
        }
        if (!empty($filters['activity_category_id'])) {
            $sessionQuery->whereHas('activity', function ($q) use ($filters) {
                $q->where('activity_category_id', $filters['activity_category_id']);
            });
        }

        $sessionState = $filters['session_state'] ?? 'all';
        if ($sessionState === 'closed_only') {
            $sessionQuery->where('status', 'closed');
        } elseif ($sessionState === 'include_open') {
            $sessionQuery->whereIn('status', ['open', 'closed']);
        }

        $sessionIds = $sessionQuery->pluck('id')->toArray();

        if (empty($sessionIds)) {
            return $this->emptyMetricResult();
        }

        // 2. Resolve Eligible Participants (The Authoritative Denominator)
        $participantQuery = AttendanceSessionParticipant::query()
            ->whereIn('attendance_session_id', $sessionIds)
            ->where('eligibility_status', '!=', 'ineligible');

        if (!empty($filters['student_id'])) {
            $participantQuery->where('student_id', $filters['student_id']);
        }
        if (!empty($filters['classroom_id'])) {
            $participantQuery->where('classroom_id', $filters['classroom_id']);
        }
        if (!empty($filters['dormitory_room_id'])) {
            $participantQuery->where('dormitory_room_id', $filters['dormitory_room_id']);
        }
        if (!empty($filters['dormitory_id'])) {
            $participantQuery->whereHas('dormitoryRoom', function ($q) use ($filters) {
                $q->where('dormitory_id', $filters['dormitory_id']);
            });
        }

        $totalEligible = $participantQuery->count();

        // 3. Resolve Recorded Attendance Facts
        $recordQuery = AttendanceRecord::query()
            ->whereIn('attendance_session_id', $sessionIds);

        if (!empty($filters['student_id'])) {
            $recordQuery->where('student_id', $filters['student_id']);
        }
        if (!empty($filters['method'])) {
            $recordQuery->where('method', $filters['method']);
        }
        if (!empty($filters['device_id'])) {
            $recordQuery->where('attendance_device_id', $filters['device_id']);
        }

        // If filtered by classroom/dormitory, ensure we only count records for eligible participants in that scope
        if (!empty($filters['classroom_id']) || !empty($filters['dormitory_room_id']) || !empty($filters['dormitory_id'])) {
            $scopedStudentIds = (clone $participantQuery)->pluck('student_id')->unique()->toArray();
            $recordQuery->whereIn('student_id', $scopedStudentIds);
        }

        $statusCounts = (clone $recordQuery)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $present = $statusCounts['present'] ?? 0;
        $late = $statusCounts['late'] ?? 0;
        $permission = $statusCounts['permission'] ?? 0;
        $sick = $statusCounts['sick'] ?? 0;
        $dispensation = $statusCounts['dispensation'] ?? 0;
        $absent = $statusCounts['absent'] ?? 0;

        $totalRecorded = $present + $late + $permission + $sick + $dispensation + $absent;
        $unrecorded = max(0, $totalEligible - $totalRecorded);

        return $this->formatMetrics(
            $totalEligible,
            $totalRecorded,
            $present,
            $late,
            $permission,
            $sick,
            $dispensation,
            $absent,
            $unrecorded
        );
    }

    /**
     * Compute rates with standard 1 decimal place rounding & zero-denominator guarding.
     */
    public function formatMetrics(
        int $totalEligible,
        int $totalRecorded,
        int $present,
        int $late,
        int $permission,
        int $sick,
        int $dispensation,
        int $absent,
        int $unrecorded
    ): array {
        $round = fn(int $num, int $den) => $den > 0 ? round(($num / $den) * 100, 1) : 0.0;

        return [
            'total_eligible' => $totalEligible,
            'total_recorded' => $totalRecorded,
            'present' => $present,
            'late' => $late,
            'permission' => $permission,
            'sick' => $sick,
            'dispensation' => $dispensation,
            'absent' => $absent,
            'unrecorded' => $unrecorded,
            'completion_rate' => $round($totalRecorded, $totalEligible),
            'attendance_rate' => $round($present + $late, $totalEligible),
            'on_time_rate' => $round($present, $totalEligible),
            'late_rate' => $round($late, $totalEligible),
            'absent_rate' => $round($absent, $totalEligible),
            'excused_rate' => $round($permission + $sick + $dispensation, $totalEligible),
        ];
    }

    public function emptyMetricResult(): array
    {
        return [
            'total_eligible' => 0,
            'total_recorded' => 0,
            'present' => 0,
            'late' => 0,
            'permission' => 0,
            'sick' => 0,
            'dispensation' => 0,
            'absent' => 0,
            'unrecorded' => 0,
            'completion_rate' => 0.0,
            'attendance_rate' => 0.0,
            'on_time_rate' => 0.0,
            'late_rate' => 0.0,
            'absent_rate' => 0.0,
            'excused_rate' => 0.0,
        ];
    }
}
