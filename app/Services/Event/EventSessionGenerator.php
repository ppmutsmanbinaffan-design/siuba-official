<?php

namespace App\Services\Event;

use App\Models\Activity;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Event;
use App\Models\EventAttendanceSessionContext;
use App\Models\EventRegistration;
use App\Models\EventSession;
use App\Enums\SessionStatus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EventSessionGenerator
{
    /**
     * Generate attendance sessions for an Event and its sub-sessions idempotently.
     */
    public function generateForEvent(Event $event): array
    {
        $eventSessions = $event->sessions()->orderBy('sort_order')->get();
        $created = 0;
        $existing = 0;

        // Ensure parent activity exists
        $activityCode = "EVENT-{$event->code}";
        $activity = Activity::firstOrCreate(
            ['code' => $activityCode],
            [
                'name' => "Event: {$event->name}",
                'activity_category_id' => 1,
                'allow_manual' => true,
                'allow_qr' => true,
                'allow_rfid' => true,
                'location' => $event->location,
            ]
        );

        foreach ($eventSessions as $es) {
            $context = EventAttendanceSessionContext::where('event_session_id', $es->id)->first();
            if ($context) {
                $existing++;
                continue;
            }

            DB::transaction(function () use ($event, $es, $activity, &$created) {
                $dateStr = Carbon::parse($es->start_at)->toDateString();
                $sessionCode = "EVT-{$event->id}-SES{$es->id}";

                $session = AttendanceSession::create([
                    'activity_id' => $activity->id,
                    'session_code' => $sessionCode,
                    'session_date' => $dateStr,
                    'start_at' => $es->start_at,
                    'present_until' => $es->present_until,
                    'late_until' => $es->late_until,
                    'end_at' => $es->end_at,
                    'status' => SessionStatus::DRAFT,
                    'location' => $es->location ?? $event->location,
                ]);

                EventAttendanceSessionContext::create([
                    'attendance_session_id' => $session->id,
                    'event_id' => $event->id,
                    'event_session_id' => $es->id,
                    'finalization_policy' => $es->finalization_policy,
                ]);

                // Snapshot registered students (approved registrations)
                $approvedRegistrations = EventRegistration::where('event_id', $event->id)
                    ->where('status', 'approved')
                    ->with('student')
                    ->get();

                foreach ($approvedRegistrations as $reg) {
                    if ($reg->student && $reg->student->is_active) {
                        AttendanceSessionParticipant::create([
                            'attendance_session_id' => $session->id,
                            'student_id' => $reg->student_id,
                            'participant_source' => 'event_registration',
                            'participant_source_id' => $event->id,
                            'eligibility_status' => 'ELIGIBLE',
                        ]);
                    }
                }

                $created++;
            });
        }

        return [
            'success' => true,
            'event_id' => $event->id,
            'sessions_created' => $created,
            'sessions_existing' => $existing,
        ];
    }
}
