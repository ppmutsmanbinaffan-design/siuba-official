<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attendance\GenerateSessionParticipants;
use App\Http\Controllers\Controller;
use App\Models\AcademicCalendarEvent;
use App\Models\AcademicSchedule;
use App\Models\AcademicYear;
use App\Models\Activity;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\DutyRoster;
use App\Models\Event;
use App\Models\Extracurricular;
use App\Models\Halaqah;
use App\Models\LessonPeriod;
use App\Models\Semester;
use App\Models\Subject;
use App\Services\Academic\AcademicSessionGenerator;
use App\Services\Event\EventSessionGenerator;
use App\Services\Extracurricular\ExtracurricularEligibilityService;
use App\Services\Participant\ActivityParticipantResolver;
use App\Services\Routine\RoutineSessionGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DomainManagementApiController extends Controller
{
    // ==========================================
    // SPRINT 6: ACADEMIC / KBM
    // ==========================================

    public function academicIndex(): JsonResponse
    {
        return response()->json([
            'years' => AcademicYear::with('semesters')->get(),
            'subjects' => Subject::where('is_active', true)->get(),
            'lesson_periods' => LessonPeriod::where('is_active', true)->orderBy('period_number')->get(),
            'schedules' => AcademicSchedule::with(['classroom', 'subject', 'teacher', 'lessonPeriod'])->get(),
            'calendar_events' => AcademicCalendarEvent::all(),
        ]);
    }

    public function generateAcademicSessions(Request $request, AcademicSessionGenerator $generator): JsonResponse
    {
        $dateStr = $request->input('date', now('Asia/Jakarta')->toDateString());
        $result = $generator->generateForDate(Carbon::parse($dateStr, 'Asia/Jakarta'));
        return response()->json($result);
    }

    // ==========================================
    // SPRINT 7: IBADAH & ROUTINE
    // ==========================================

    public function routineIndex(): JsonResponse
    {
        return response()->json([
            'halaqahs' => Halaqah::with('members.student', 'supervisor')->get(),
            'duty_rosters' => DutyRoster::with('student', 'activity')->whereDate('date', '>=', now('Asia/Jakarta')->toDateString())->get(),
        ]);
    }

    public function generateRoutineSessions(Request $request, RoutineSessionGenerator $generator): JsonResponse
    {
        $dateStr = $request->input('date', now('Asia/Jakarta')->toDateString());
        $result = $generator->generateForDate(Carbon::parse($dateStr, 'Asia/Jakarta'));
        return response()->json($result);
    }

    // ==========================================
    // SPRINT 8: EXTRACURRICULAR & EVENTS
    // ==========================================

    public function extracurricularIndex(): JsonResponse
    {
        return response()->json([
            'extracurriculars' => Extracurricular::with(['coach', 'members.student'])->get(),
        ]);
    }

    public function eventsIndex(): JsonResponse
    {
        return response()->json([
            'events' => Event::with(['sessions', 'registrations.student'])->get(),
        ]);
    }

    public function generateEventSessions(Event $event, EventSessionGenerator $generator): JsonResponse
    {
        $result = $generator->generateForEvent($event);
        return response()->json($result);
    }

    // ==========================================
    // DYNAMIC PARTICIPANT ENGINE API
    // ==========================================

    public function previewActivityParticipants(Activity $activity, ActivityParticipantResolver $resolver): JsonResponse
    {
        $resolved = $resolver->resolve($activity);
        return response()->json([
            'activity_id' => $activity->id,
            'activity_name' => $activity->name,
            'total_participants' => count($resolved),
            'participants' => $resolved,
        ]);
    }

    public function previewSessionSnapshot(AttendanceSession $session, GenerateSessionParticipants $generator): JsonResponse
    {
        $preview = $generator->previewRefresh($session);
        return response()->json($preview);
    }

    public function refreshSessionSnapshot(AttendanceSession $session, GenerateSessionParticipants $generator): JsonResponse
    {
        try {
            $result = $generator->execute($session);
            return response()->json(['success' => true, 'data' => $result]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
