<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\AcademicSessionContext;
use App\Models\AcademicSubstitution;
use App\Models\ExtracurricularStaffAssignment;
use App\Models\LessonPeriod;
use App\Models\StaffAbsenceRequest;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\TrainingSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Data mentah untuk halaman Laporan SDM (harian, mengajar, melatih, izin) pada rentang tanggal tertentu.
 * Sebelumnya laporan ini membaca data di browser — yang kosong / berisi data contoh — bukan data server.
 */
class ReportDatasetApiController extends Controller
{
    public const MAX_DAYS = 93;

    public function staff(Request $request): JsonResponse
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date|after_or_equal:from']);
        $from = Carbon::parse($request->input('from'))->startOfDay();
        $to = Carbon::parse($request->input('to'))->endOfDay();
        $clipped = false;
        if ($from->diffInDays($to, true) > self::MAX_DAYS) {
            $from = $to->copy()->subDays(self::MAX_DAYS)->startOfDay();
            $clipped = true;
        }
        $fromStr = $from->toDateString();
        $toStr = $to->toDateString();

        // Guru/pelatih tanpa hak laporan SDM hanya mendapat datanya sendiri
        $user = $request->user();
        $ownOnly = $user && !$user->can('staff.reports') && !$user->can('reports.view');
        $ownStaffId = $ownOnly ? StaffProfile::where('user_id', $user->id)->value('id') ?? 0 : null;

        $staff = StaffProfile::with('user')->withTrashed()->orderBy('name')
            ->when($ownOnly, fn ($q) => $q->whereKey($ownStaffId))->get();
        $staffByUser = $staff->whereNotNull('user_id')->keyBy('user_id');

        $records = StaffAttendanceRecord::with('staff')->whereBetween('attendance_date', [$fromStr, $toStr])
            ->when($ownOnly, fn ($q) => $q->where('staff_profile_id', $ownStaffId))->get();

        // Sesi mengajar (KBM)
        $contexts = AcademicSessionContext::with(['session', 'classroom', 'subject', 'scheduledTeacher', 'teachingTeacher'])
            ->whereHas('session', fn ($q) => $q->whereBetween('session_date', [$fromStr, $toStr]))
            ->when($ownOnly, fn ($q) => $q->where(fn ($w) => $w->where('scheduled_teacher_id', $user->id)->orWhere('teaching_teacher_id', $user->id)))->get();
        $periods = LessonPeriod::whereIn('id', $contexts->pluck('lesson_period_id')->filter()->unique())->get()->keyBy('id');
        $subs = AcademicSubstitution::whereIn('attendance_session_id', $contexts->pluck('attendance_session_id'))->get()->keyBy('attendance_session_id');
        $teaching = $contexts->map(function (AcademicSessionContext $c) use ($staffByUser, $periods, $subs) {
            $s = $c->session;
            $sched = $staffByUser->get($c->scheduled_teacher_id);
            $actualUser = $c->teaching_teacher_id ?: $c->scheduled_teacher_id;
            $actual = $staffByUser->get($actualUser);
            $period = $c->lesson_period_id ? $periods->get($c->lesson_period_id) : null;
            $sub = $subs->get($c->attendance_session_id);

            return [
                'id' => $s->id, 'attendance_session_id' => $s->id, 'academic_schedule_id' => $c->academic_schedule_id,
                'session_date' => $s->session_date?->toDateString(),
                'classroom_id' => $c->classroom_id, 'classroom_name' => $c->classroom?->name ?? '-',
                'subject_id' => $c->subject_id, 'subject_name' => $c->subject?->name ?? '-', 'subject_code' => $c->subject?->code,
                'lesson_period_id' => $c->lesson_period_id, 'lesson_period_name' => $period?->name, 'period_number' => (int) ($period?->sort_order ?? 1),
                'scheduled_start_at' => $s->start_at?->format('H:i'), 'scheduled_end_at' => $s->end_at?->format('H:i'),
                'start_time' => $s->start_at?->format('H:i'), 'end_time' => $s->end_at?->format('H:i'),
                'scheduled_teacher_staff_id' => $sched?->id, 'scheduled_teacher_name' => $c->scheduledTeacher?->name ?? '-',
                'teacher_staff_id' => $actual?->id, 'teacher_name' => $c->teachingTeacher?->name ?? $c->scheduledTeacher?->name,
                'actual_teacher_staff_id' => $actual?->id, 'actual_teacher_name' => $c->teachingTeacher?->name ?? $c->scheduledTeacher?->name,
                'is_substituted' => (bool) ($c->teaching_teacher_id && $c->teaching_teacher_id !== $c->scheduled_teacher_id),
                'substitution_id' => $sub?->id, 'substitution_reason' => $sub?->reason,
                'status' => match ((string) ($s->status->value ?? $s->status)) { 'open' => 'ongoing', 'closed' => 'completed', 'cancelled' => 'cancelled', default => 'scheduled' },
            ];
        })->values();

        // Sesi latihan ekskul
        $training = TrainingSession::with(['extracurricular', 'primaryStaff', 'actualStaff', 'substitution'])
            ->whereBetween('session_date', [$fromStr, $toStr])
            ->when($ownOnly, fn ($q) => $q->where(fn ($w) => $w->where('primary_staff_profile_id', $ownStaffId)->orWhere('actual_staff_profile_id', $ownStaffId)))
            ->orderBy('session_date')->get()
            ->map(fn (TrainingSession $s) => [
                'id' => $s->id, 'extracurricular_id' => $s->extracurricular_id, 'extracurricular_name' => $s->extracurricular?->name ?? '-',
                'extracurricular_code' => $s->extracurricular?->code ?? '', 'session_date' => $s->session_date?->toDateString(),
                'scheduled_start_at' => substr($s->start_time, 0, 5), 'scheduled_end_at' => substr($s->end_time, 0, 5),
                'location' => $s->location,
                'primary_staff_id' => $s->primary_staff_profile_id, 'primary_staff_name' => $s->primaryStaff?->name,
                'actual_primary_staff_id' => $s->actual_staff_profile_id, 'actual_primary_staff_name' => $s->actualStaff?->name,
                'substitution_id' => $s->trainer_substitution_id, 'is_substituted' => (bool) $s->trainer_substitution_id,
                'status' => $s->status, 'realization_status' => $s->realization_status,
                'topic' => $s->topic, 'student_present_count' => $s->student_present_count,
            ])->values();

        return response()->json(['success' => true, 'data' => [
            'from' => $fromStr, 'to' => $toStr, 'clipped' => $clipped,
            'staff' => $staff->map(fn ($s) => SpaTransformer::staff($s))->values(),
            'records' => $records->map(function (StaffAttendanceRecord $r) {
                $row = SpaTransformer::staffRecord($r);
                [$kind, $id] = array_pad(explode(':', (string) $r->context_key, 2), 2, null);
                $row['context_id'] = is_numeric($id) ? (int) $id : null;
                $row['context_type'] = match ($r->attendance_type) { 'teaching' => 'kbm', 'training' => 'extracurricular', default => 'general' };

                return $row;
            })->values(),
            'absences' => StaffAbsenceRequest::with('staff')->where('start_at', '<=', $to)->where('end_at', '>=', $from)
                ->when($ownOnly, fn ($q) => $q->where('staff_profile_id', $ownStaffId))->get()
                ->map(fn ($a) => SpaTransformer::staffAbsence($a))->values(),
            'teaching_sessions' => $teaching,
            'training_sessions' => $training,
            'extracurriculars' => \App\Models\Extracurricular::orderBy('name')->get()->map(fn ($e) => [
                'id' => $e->id, 'code' => $e->code, 'name' => $e->name, 'description' => $e->description ?? '',
                'location' => $e->location, 'is_active' => (bool) $e->is_active,
            ])->values(),
            'extracurricular_assignments' => ExtracurricularStaffAssignment::with(['extracurricular', 'staff'])
                ->when($ownOnly, fn ($q) => $q->where('staff_profile_id', $ownStaffId))->get()->map(fn ($a) => [
                'id' => $a->id, 'extracurricular_id' => $a->extracurricular_id, 'extracurricular_name' => $a->extracurricular?->name,
                'staff_id' => $a->staff_profile_id, 'staff_name' => $a->staff?->name, 'staff_number' => $a->staff?->staff_number,
                'role' => $a->role, 'is_primary' => (bool) $a->is_primary, 'is_active' => (bool) $a->is_active,
                'start_date' => $a->start_date?->toDateString(), 'end_date' => $a->end_date?->toDateString(),
            ])->values(),
        ]]);
    }
}
