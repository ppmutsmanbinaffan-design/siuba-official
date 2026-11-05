<?php

namespace App\Services\Routine;

use App\Models\Activity;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use App\Models\RoutineScheduleOverride;
use App\Enums\SessionStatus;
use App\Services\Participant\ActivityParticipantResolver;
use App\Models\AttendanceSessionParticipant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RoutineSessionGenerator
{
    public function __construct(
        protected ActivityParticipantResolver $participantResolver
    ) {}

    /**
     * Generate daily routine/prayer attendance sessions idempotently for a target date.
     */
    public function generateForDate(Carbon $date): array
    {
        $dateStr = $date->toDateString();
        $dayOfWeek = $date->dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday

        $schedules = ActivitySchedule::with('activity')
            ->where('is_active', true)
            ->where(function ($q) use ($dayOfWeek) {
                $q->whereNull('day_of_week')
                  ->orWhere('day_of_week', $dayOfWeek);
            })
            ->get();

        $created = 0;
        $existing = 0;
        $skipped = 0;

        foreach ($schedules as $schedule) {
            $activity = $schedule->activity;
            if (!$activity) {
                $skipped++;
                continue;
            }

            // Check if routine override cancelled this schedule today
            $override = RoutineScheduleOverride::where('activity_schedule_id', $schedule->id)
                ->whereDate('date', $dateStr)
                ->first();

            if ($override && $override->type === 'cancelled') {
                $skipped++;
                continue;
            }

            // Idempotency: check if session code or schedule+date already exists
            $sessionCode = "ROUTINE-SCH{$schedule->id}-" . str_replace('-', '', $dateStr);
            if (AttendanceSession::where('session_code', $sessionCode)->exists()) {
                $existing++;
                continue;
            }

            DB::transaction(function () use ($schedule, $activity, $override, $dateStr, $sessionCode, &$created) {
                $startTime = $override?->new_start_time ?? $schedule->start_time;
                $presentUntilTime = $override?->new_present_until ?? $schedule->present_until;
                $lateUntilTime = $override?->new_late_until ?? $schedule->late_until;
                $endTime = $override?->new_end_time ?? $schedule->end_time;
                $location = $override?->new_location ?? $schedule->activity->location ?? 'Masjid Utama';

                // Handle cross-midnight (e.g. 23:30 -> 00:30)
                $startAt = Carbon::parse("{$dateStr} {$startTime}", 'Asia/Jakarta');
                $presentUntil = Carbon::parse("{$dateStr} {$presentUntilTime}", 'Asia/Jakarta');
                $lateUntil = Carbon::parse("{$dateStr} {$lateUntilTime}", 'Asia/Jakarta');
                $endAt = Carbon::parse("{$dateStr} {$endTime}", 'Asia/Jakarta');

                if ($endAt->lessThanOrEqualTo($startAt)) {
                    $endAt->addDay();
                }
                if ($lateUntil->lessThanOrEqualTo($startAt)) {
                    $lateUntil->addDay();
                }
                if ($presentUntil->lessThanOrEqualTo($startAt)) {
                    $presentUntil->addDay();
                }

                $session = AttendanceSession::create([
                    'activity_id' => $activity->id,
                    'session_code' => $sessionCode,
                    'session_date' => $dateStr,
                    'start_at' => $startAt,
                    'present_until' => $presentUntil,
                    'late_until' => $lateUntil,
                    'end_at' => $endAt,
                    'status' => SessionStatus::DRAFT,
                    'location' => $location,
                ]);

                // Snapshot dynamic participants
                $resolved = $this->participantResolver->resolve($activity, Carbon::parse($dateStr, 'Asia/Jakarta'));
                foreach ($resolved as $item) {
                    AttendanceSessionParticipant::create([
                        'attendance_session_id' => $session->id,
                        'student_id' => $item['student_id'],
                        'participant_source' => $item['primary_source'] ?? 'dynamic_rule',
                        'participant_source_id' => $item['primary_source_id'] ?? null,
                        'eligibility_status' => 'ELIGIBLE',
                    ]);
                }

                $created++;
            });
        }

        return [
            'success' => true,
            'message' => "Routine sessions generated for {$dateStr}.",
            'schedules_found' => $schedules->count(),
            'sessions_created' => $created,
            'sessions_existing' => $existing,
            'sessions_skipped' => $skipped,
        ];
    }
}
