<?php

namespace App\Services\Attendance;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SessionService
{
    /**
     * Create a new attendance session.
     */
    public function createSession(
        Activity $activity,
        ?ActivitySchedule $schedule = null,
        ?Carbon $date = null,
        array $customAttributes = [],
        ?User $creator = null
    ): AttendanceSession {
        $targetDate = $date ?? Carbon::now('Asia/Jakarta');
        $sessionCode = $this->generateSessionCode($activity, $targetDate);

        // Derive time window from schedule or defaults
        $startAt = $customAttributes['start_at'] ?? null;
        $presentUntil = $customAttributes['present_until'] ?? null;
        $lateUntil = $customAttributes['late_until'] ?? null;
        $endAt = $customAttributes['end_at'] ?? null;

        if ($schedule && !$startAt) {
            $dateStr = $targetDate->format('Y-m-d');
            $startAt = Carbon::parse("{$dateStr} {$schedule->start_time}", 'Asia/Jakarta');
            $presentUntil = Carbon::parse("{$dateStr} {$schedule->present_until}", 'Asia/Jakarta');
            $lateUntil = Carbon::parse("{$dateStr} {$schedule->late_until}", 'Asia/Jakarta');
            $endAt = Carbon::parse("{$dateStr} {$schedule->end_time}", 'Asia/Jakarta');
        }

        return DB::transaction(function () use (
            $activity,
            $schedule,
            $sessionCode,
            $targetDate,
            $startAt,
            $presentUntil,
            $lateUntil,
            $endAt,
            $customAttributes,
            $creator
        ) {
            return AttendanceSession::create([
                'activity_id' => $activity->id,
                'activity_schedule_id' => $schedule?->id,
                'session_code' => $sessionCode,
                'session_date' => $targetDate->toDateString(),
                'start_at' => $startAt,
                'present_until' => $presentUntil,
                'late_until' => $lateUntil,
                'end_at' => $endAt,
                'status' => $customAttributes['status'] ?? SessionStatus::DRAFT,
                'location' => $customAttributes['location'] ?? $activity->location,
                'opened_by' => ($customAttributes['status'] ?? null) === SessionStatus::OPEN ? $creator?->id : null,
                'opened_at' => ($customAttributes['status'] ?? null) === SessionStatus::OPEN ? Carbon::now('Asia/Jakarta') : null,
                'notes' => $customAttributes['notes'] ?? null,
            ]);
        });
    }

    /**
     * Open a draft session.
     */
    public function openSession(AttendanceSession $session, User $operator): AttendanceSession
    {
        if (!$session->status->canTransitionTo(SessionStatus::OPEN)) {
            throw new InvalidArgumentException(
                "Sesi dalam status '{$session->status->label()}' tidak dapat dibuka."
            );
        }

        $session->update([
            'status' => SessionStatus::OPEN,
            'opened_by' => $operator->id,
            'opened_at' => Carbon::now('Asia/Jakarta'),
        ]);

        return $session->fresh();
    }

    /**
     * Close an active session.
     */
    public function closeSession(AttendanceSession $session, User $operator): AttendanceSession
    {
        if (!$session->status->canTransitionTo(SessionStatus::CLOSED)) {
            throw new InvalidArgumentException(
                "Sesi dalam status '{$session->status->label()}' tidak dapat ditutup."
            );
        }

        $session->update([
            'status' => SessionStatus::CLOSED,
            'closed_by' => $operator->id,
            'closed_at' => Carbon::now('Asia/Jakarta'),
        ]);

        return $session->fresh();
    }

    /**
     * Cancel a session.
     */
    public function cancelSession(AttendanceSession $session, User $operator, ?string $reason = null): AttendanceSession
    {
        if (!$session->status->canTransitionTo(SessionStatus::CANCELLED)) {
            throw new InvalidArgumentException(
                "Sesi dalam status '{$session->status->label()}' tidak dapat dibatalkan."
            );
        }

        $notes = $session->notes ? ($session->notes . "\n[Dibatalkan: " . ($reason ?? 'Tanpa alasan') . "]") : $reason;

        $session->update([
            'status' => SessionStatus::CANCELLED,
            'closed_by' => $operator->id,
            'closed_at' => Carbon::now('Asia/Jakarta'),
            'notes' => $notes,
        ]);

        return $session->fresh();
    }

    /**
     * Generate unique standard session code: ATT-YYYYMMDD-ACTIVITYCODE-INDEX
     */
    public function generateSessionCode(Activity $activity, Carbon $date): string
    {
        $prefix = 'ATT-' . $date->format('Ymd') . '-' . strtoupper(Str::slug($activity->code ?: $activity->name));
        $countToday = AttendanceSession::where('session_date', $date->toDateString())
            ->where('activity_id', $activity->id)
            ->count();

        $index = str_pad((string)($countToday + 1), 3, '0', STR_PAD_LEFT);
        return "{$prefix}-{$index}";
    }
}
