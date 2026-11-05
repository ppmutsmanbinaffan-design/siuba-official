<?php

namespace App\Services\Academic;

use App\Models\AcademicCalendarEvent;
use App\Models\AcademicSchedule;
use App\Models\AcademicSessionContext;
use App\Models\AcademicSubstitution;
use App\Models\AcademicYear;
use App\Models\Activity;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Semester;
use App\Models\Student;
use App\Enums\SessionStatus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AcademicSessionGenerator
{
    /**
     * Generate daily academic attendance sessions idempotently for a target date.
     */
    public function generateForDate(Carbon $date): array
    {
        $dateStr = $date->toDateString();
        $dayOfWeek = $date->dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday

        // 1. Check active academic year & semester
        $activeYear = AcademicYear::where('is_active', true)->first();
        if (!$activeYear) {
            return [
                'success' => false,
                'message' => 'No active academic year found.',
                'sessions_created' => 0,
                'sessions_existing' => 0,
                'sessions_skipped' => 0,
            ];
        }

        $activeSemester = Semester::where('academic_year_id', $activeYear->id)
            ->where('is_active', true)
            ->first();

        if (!$activeSemester) {
            return [
                'success' => false,
                'message' => 'No active semester found.',
                'sessions_created' => 0,
                'sessions_existing' => 0,
                'sessions_skipped' => 0,
            ];
        }

        // 2. Check Academic Calendar Events (Holidays, Exclusions)
        $isHoliday = AcademicCalendarEvent::where(function ($q) {
                $q->where('affects_academic_schedule', true)
                  ->orWhere('affects_academic_schedule', 1);
            })
            ->whereDate('start_date', '<=', $dateStr)
            ->whereDate('end_date', '>=', $dateStr)
            ->whereIn('type', ['holiday', 'school_event', 'pesantren_event'])
            ->exists();

        if ($isHoliday) {
            return [
                'success' => true,
                'message' => "Academic sessions skipped for {$dateStr} due to registered Academic Calendar Event / Holiday.",
                'sessions_created' => 0,
                'sessions_existing' => 0,
                'sessions_skipped' => 0,
                'is_holiday' => true,
            ];
        }

        // 3. Query active academic schedules for this day of week
        $schedules = AcademicSchedule::with(['classroom', 'subject', 'teacher', 'lessonPeriod', 'activity'])
            ->where('academic_year_id', $activeYear->id)
            ->where('semester_id', $activeSemester->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->get();

        $created = 0;
        $existing = 0;
        $skipped = 0;

        foreach ($schedules as $schedule) {
            // Skip break periods
            if ($schedule->lessonPeriod && $schedule->lessonPeriod->is_break) {
                $skipped++;
                continue;
            }

            // Check if context already exists for this schedule and date (Idempotency)
            $existingContext = AcademicSessionContext::where('academic_schedule_id', $schedule->id)
                ->whereHas('session', function ($q) use ($dateStr) {
                    $q->whereDate('session_date', $dateStr);
                })
                ->first();

            if ($existingContext) {
                $existing++;
                continue;
            }

            // Create session in transaction
            DB::transaction(function () use ($schedule, $date, $dateStr, &$created) {
                $period = $schedule->lessonPeriod;
                $startTimeStr = $period ? $period->start_time : '07:30:00';
                $endTimeStr = $period ? $period->end_time : '08:15:00';

                $startAt = Carbon::parse("{$dateStr} {$startTimeStr}", 'Asia/Jakarta');
                $presentUntil = (clone $startAt)->addMinutes(10);
                $lateUntil = (clone $startAt)->addMinutes(20);
                $endAt = Carbon::parse("{$dateStr} {$endTimeStr}", 'Asia/Jakarta');

                // Determine or resolve activity
                $activityId = $schedule->activity_id;
                if (!$activityId) {
                    // Fallback activity or find by code
                    $activityCode = "KBM-{$schedule->subject->code}-{$schedule->classroom->name}";
                    $activity = Activity::firstOrCreate(
                        ['code' => $activityCode],
                        [
                            'name' => "KBM {$schedule->subject->name} ({$schedule->classroom->name})",
                            'activity_category_id' => 1,
                            'allow_manual' => true,
                            'allow_qr' => true,
                            'allow_rfid' => false,
                        ]
                    );
                    $activityId = $activity->id;
                }

                $sessionCode = "KBM-SCH{$schedule->id}-" . str_replace('-', '', $dateStr);

                $session = AttendanceSession::create([
                    'activity_id' => $activityId,
                    'session_code' => $sessionCode,
                    'session_date' => $dateStr,
                    'start_at' => $startAt,
                    'present_until' => $presentUntil,
                    'late_until' => $lateUntil,
                    'end_at' => $endAt,
                    'status' => SessionStatus::DRAFT,
                    'location' => $schedule->room_location ?? $schedule->classroom->name,
                ]);

                // Check for substitute teacher
                $substitute = AcademicSubstitution::where('academic_schedule_id', $schedule->id)
                    ->whereDate('date', $dateStr)
                    ->first();

                $teachingTeacherId = $substitute ? $substitute->substitute_teacher_id : $schedule->teacher_id;

                // Create academic session context
                AcademicSessionContext::create([
                    'attendance_session_id' => $session->id,
                    'academic_schedule_id' => $schedule->id,
                    'lesson_period_id' => $schedule->lesson_period_id,
                    'classroom_id' => $schedule->classroom_id,
                    'subject_id' => $schedule->subject_id,
                    'scheduled_teacher_id' => $schedule->teacher_id,
                    'teaching_teacher_id' => $teachingTeacherId,
                ]);

                // Generate classroom participant snapshot
                $students = Student::where('classroom_id', $schedule->classroom_id)
                    ->where('is_active', true)
                    ->get();

                foreach ($students as $student) {
                    AttendanceSessionParticipant::create([
                        'attendance_session_id' => $session->id,
                        'student_id' => $student->id,
                        'participant_source' => 'classroom',
                        'participant_source_id' => $schedule->classroom_id,
                        'eligibility_status' => 'ELIGIBLE',
                    ]);
                }

                $created++;
            });
        }

        return [
            'success' => true,
            'message' => "Academic sessions generated for {$dateStr}.",
            'schedules_found' => $schedules->count(),
            'sessions_created' => $created,
            'sessions_existing' => $existing,
            'sessions_skipped' => $skipped,
            'is_holiday' => false,
        ];
    }
}
