<?php

namespace App\Actions\Attendance;

use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Services\Participant\ActivityParticipantResolver;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class GenerateSessionParticipants
{
    public function __construct(
        protected ActivityParticipantResolver $resolver
    ) {}

    /**
     * Snapshots resolved participants into the session.
     * Throws exception if session is already OPEN or CLOSED/CANCELLED (unless forced on draft).
     */
    public function execute(AttendanceSession $session, bool $force = false): array
    {
        if ($session->status !== SessionStatus::DRAFT && !$force) {
            throw new InvalidArgumentException("Participant snapshot can only be generated or refreshed while session status is DRAFT (Current status: {$session->status->value}).");
        }

        $activity = $session->activity;
        if (!$activity) {
            return ['added' => 0, 'total' => 0];
        }

        $sessionDate = Carbon::parse($session->session_date, 'Asia/Jakarta');
        $resolved = $this->resolver->resolve($activity, $sessionDate);

        return DB::transaction(function () use ($session, $resolved) {
            // Remove previous draft snapshot if refreshing
            AttendanceSessionParticipant::where('attendance_session_id', $session->id)->delete();

            $inserted = 0;
            foreach ($resolved as $item) {
                AttendanceSessionParticipant::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $item['student_id'],
                    'participant_source' => $item['primary_source'] ?? 'dynamic_rule',
                    'participant_source_id' => $item['primary_source_id'] ?? null,
                    'eligibility_status' => 'ELIGIBLE',
                ]);
                $inserted++;
            }

            return [
                'added' => $inserted,
                'total' => $inserted,
            ];
        });
    }

    /**
     * Preview changes before executing refresh on a draft session.
     */
    public function previewRefresh(AttendanceSession $session): array
    {
        $currentCount = $session->participants()->count();
        $activity = $session->activity;
        $sessionDate = Carbon::parse($session->session_date, 'Asia/Jakarta');
        $resolved = $this->resolver->resolve($activity, $sessionDate);
        $newCount = count($resolved);

        return [
            'current_count' => $currentCount,
            'resolved_count' => $newCount,
            'net_change' => $newCount - $currentCount,
            'status' => $session->status->value,
            'can_refresh' => ($session->status === SessionStatus::DRAFT),
        ];
    }
}
