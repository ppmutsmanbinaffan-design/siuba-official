<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSessionContext;
use App\Models\AcademicSubstitution;
use App\Models\AppSetting;
use App\Models\LessonPeriod;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Presensi mengajar guru per jam pelajaran (KBM) — tahap 19.
 *
 * - Satu sesi mengajar = satu AcademicSessionContext (jadwal KBM yang sudah dibuat lewat "Generate Sesi KBM").
 * - Presensi guru disimpan di staff_attendance_records (attendance_type = teaching, context_key = teaching:{attendance_session_id}),
 *   sehingga ikut terbaca di laporan SDM.
 * - Jurnal mengajar (materi, catatan, jumlah santri hadir) disimpan di academic_session_contexts.
 */
class TeachingApiController extends Controller
{
    // ================================================================== Baca

    public function sessions(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'nullable|date']);
        $date = Carbon::parse($data['date'] ?? today()->toDateString())->toDateString();

        $contexts = $this->baseQuery($request)
            ->whereHas('session', fn ($q) => $q->whereDate('session_date', $date))
            ->get()
            ->sortBy(fn (AcademicSessionContext $c) => $c->session?->start_at?->format('H:i') . '-' . $c->classroom?->name)
            ->values();

        return response()->json(['success' => true, 'data' => $this->rows($contexts)]);
    }

    public function show(Request $request, int $session): JsonResponse
    {
        $context = $this->baseQuery($request)->where('attendance_session_id', $session)->first();
        if (!$context) {
            return ApiResponse::error('TEACHING_SESSION_NOT_FOUND', 'Sesi mengajar tidak ditemukan atau bukan milik Anda.', null, 404);
        }

        return response()->json(['success' => true, 'data' => $this->rows(collect([$context]))->first()]);
    }

    public function substitutions(Request $request): JsonResponse
    {
        $staffByUser = StaffProfile::whereNotNull('user_id')->get()->keyBy('user_id');
        $rows = AcademicSubstitution::with('assignedBy')->orderByDesc('date')->orderByDesc('id')->limit(500)->get()
            ->map(fn (AcademicSubstitution $s) => [
                'id' => $s->id,
                'academic_schedule_id' => $s->academic_schedule_id,
                'attendance_session_id' => $s->attendance_session_id,
                // Halaman Guru Pengganti bekerja dengan id staf
                'original_teacher_id' => $staffByUser->get($s->original_teacher_id)?->id ?? 0,
                'substitute_teacher_id' => $staffByUser->get($s->substitute_teacher_id)?->id ?? 0,
                'original_teacher_user_id' => $s->original_teacher_id,
                'substitute_teacher_user_id' => $s->substitute_teacher_id,
                'date' => $s->date?->toDateString(),
                'reason' => $s->reason,
                'assigned_by' => $s->assignedBy?->name ?? '',
                'created_at' => $s->created_at?->toIso8601String(),
            ])->values();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    // ================================================================== Aksi

    /** Scan QR/RFID kartu guru: presensi mulai mengajar (scan pertama) atau selesai mengajar (scan kedua). */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => 'nullable|string|max:100',
            'staff_id' => 'nullable|integer',
            'session_id' => 'nullable|integer|exists:attendance_sessions,id',
            'method' => 'nullable|in:qr,rfid,manual',
        ]);

        $staff = $this->resolveStaff($data['staff_id'] ?? null, $data['identifier'] ?? null);
        if (!$staff) {
            return ApiResponse::error('STAFF_NOT_FOUND', 'Data guru tidak ditemukan dengan identitas tersebut.', null, 404);
        }
        if (!$staff->user_id) {
            return ApiResponse::error('TEACHER_ACCOUNT_MISSING', "{$staff->name} belum ditautkan ke akun guru, sehingga tidak memiliki jadwal mengajar.", null, 422);
        }
        if ($denied = $this->denyIfNotSelf($request, $staff)) {
            return $denied;
        }

        $context = !empty($data['session_id'])
            ? AcademicSessionContext::with('session')->where('attendance_session_id', $data['session_id'])->first()
            : $this->currentContextFor($staff->user_id);
        if (!$context) {
            return ApiResponse::error('NO_TEACHING_SESSION', "Tidak ada jadwal mengajar hari ini untuk {$staff->name}. Pastikan sesi KBM hari ini sudah di-generate.", null, 404);
        }
        if (!$this->isAssigned($context, $staff->user_id)) {
            return ApiResponse::error('NOT_ASSIGNED_TO_TEACHING_SESSION', "{$staff->name} tidak dijadwalkan mengajar pada sesi ini. Tetapkan sebagai guru pengganti bila menggantikan.", null, 422);
        }
        if ($this->sessionStatus($context) === 'cancelled') {
            return ApiResponse::error('SESSION_CANCELLED', 'Sesi KBM ini dibatalkan.', null, 409);
        }

        $result = $this->checkInOrOut($request, $staff, $context, $data['method'] ?? 'qr');

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => ['mode' => $result['mode'], 'status' => $result['status'] ?? null, 'late_minutes' => $result['late'] ?? 0,
                'session' => $this->rows(collect([$context->fresh(['session', 'classroom', 'subject', 'scheduledTeacher', 'teachingTeacher'])]))->first()],
        ]);
    }

    /** Presensi manual oleh operator/piket: hadir (otomatis tepat/terlambat), izin, sakit, atau alpa. */
    public function manual(Request $request, int $session): JsonResponse
    {
        $data = $request->validate([
            'staff_id' => 'nullable|integer|exists:staff_profiles,id',
            'status' => 'nullable|in:present,permission,sick,absent',
            'notes' => 'nullable|string|max:500',
        ]);
        $context = AcademicSessionContext::with('session')->where('attendance_session_id', $session)->first();
        if (!$context) {
            return ApiResponse::error('TEACHING_SESSION_NOT_FOUND', 'Sesi mengajar tidak ditemukan.', null, 404);
        }
        $teacherUserId = $context->teaching_teacher_id ?: $context->scheduled_teacher_id;
        $staff = !empty($data['staff_id'])
            ? StaffProfile::find($data['staff_id'])
            : StaffProfile::where('user_id', $teacherUserId)->first();
        if (!$staff || !$staff->user_id) {
            return ApiResponse::error('STAFF_NOT_FOUND', 'Data staf guru untuk sesi ini tidak ditemukan / belum ditautkan ke akun guru.', null, 422);
        }
        if (!$this->isAssigned($context, $staff->user_id)) {
            return ApiResponse::error('NOT_ASSIGNED_TO_TEACHING_SESSION', 'Guru tidak ditugaskan pada sesi mengajar ini (gunakan fitur Guru Pengganti bila menggantikan).', null, 422);
        }
        if ($denied = $this->denyIfNotSelf($request, $staff)) {
            return $denied;
        }
        if ($this->sessionStatus($context) === 'cancelled') {
            return ApiResponse::error('SESSION_CANCELLED', 'Sesi KBM ini dibatalkan.', null, 409);
        }

        $status = $data['status'] ?? 'present';
        if ($status === 'present') {
            $result = $this->checkInOrOut($request, $staff, $context, 'manual', $data['notes'] ?? null, true);
        } else {
            [$start, $end] = $this->window($context);
            StaffAttendanceRecord::updateOrCreate(
                ['staff_profile_id' => $staff->id, 'attendance_type' => 'teaching', 'context_key' => 'teaching:' . $context->attendance_session_id],
                [
                    'attendance_date' => $start->toDateString(), 'status' => $status,
                    'scheduled_start_at' => $start, 'scheduled_end_at' => $end,
                    'check_in_at' => null, 'check_out_at' => null, 'check_in_method' => 'manual', 'late_minutes' => 0,
                    'recorded_by' => $request->user()?->id, 'recorded_by_name' => $request->user()?->name,
                    'notes' => $data['notes'] ?? null,
                    'metadata' => ['attendance_session_id' => $context->attendance_session_id],
                ]
            );
            $label = ['permission' => 'izin', 'sick' => 'sakit', 'absent' => 'alpa'][$status];
            $result = ['mode' => 'status', 'status' => $status, 'message' => "{$staff->name} dicatat {$label} untuk sesi ini."];
        }

        return response()->json([
            'success' => true, 'message' => $result['message'],
            'data' => ['mode' => $result['mode'], 'status' => $result['status'] ?? $status, 'late_minutes' => $result['late'] ?? 0,
                'session' => $this->rows(collect([$context->fresh(['session', 'classroom', 'subject', 'scheduledTeacher', 'teachingTeacher'])]))->first()],
        ]);
    }

    /** Jurnal mengajar: materi yang disampaikan, catatan, jumlah santri hadir. */
    public function journal(Request $request, int $session): JsonResponse
    {
        $data = $request->validate([
            'topic' => 'required|string|max:255',
            'journal_notes' => 'nullable|string|max:5000',
            'student_present_count' => 'nullable|integer|min:0|max:5000',
        ], ['topic.required' => 'Materi / pokok bahasan wajib diisi.']);
        $context = AcademicSessionContext::where('attendance_session_id', $session)->first();
        if (!$context) {
            return ApiResponse::error('TEACHING_SESSION_NOT_FOUND', 'Sesi mengajar tidak ditemukan.', null, 404);
        }
        if (!$this->canManageAll($request) && !$this->isAssigned($context, (int) $request->user()->id)) {
            return ApiResponse::error('FORBIDDEN', 'Hanya guru pengajar sesi ini atau petugas KBM yang dapat mengisi jurnal.', null, 403);
        }
        $context->update($data + [
            'realization_status' => 'submitted',
            'journal_submitted_by' => $request->user()?->id,
            'journal_submitted_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Jurnal mengajar tersimpan.']);
    }

    /** Akhir hari: sesi KBM yang gurunya tidak presensi ditandai alpa. */
    public function finalize(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date']);
        $date = Carbon::parse($data['date'])->toDateString();
        $staffByUser = StaffProfile::whereNotNull('user_id')->get()->keyBy('user_id');
        $count = 0;
        $skipped = 0;

        $contexts = AcademicSessionContext::with('session')->whereHas('session', fn ($q) => $q->whereDate('session_date', $date))->get();
        foreach ($contexts as $c) {
            if ($this->sessionStatus($c) === 'cancelled') continue;
            $staff = $staffByUser->get($c->teaching_teacher_id ?: $c->scheduled_teacher_id);
            if (!$staff) {
                $skipped++;
                continue;
            }
            $key = 'teaching:' . $c->attendance_session_id;
            if (StaffAttendanceRecord::where('attendance_type', 'teaching')->where('context_key', $key)->exists()) continue;
            [$start, $end] = $this->window($c);
            StaffAttendanceRecord::create([
                'staff_profile_id' => $staff->id, 'attendance_date' => $date, 'attendance_type' => 'teaching', 'context_key' => $key,
                'status' => 'absent', 'scheduled_start_at' => $start, 'scheduled_end_at' => $end,
                'recorded_by' => $request->user()?->id, 'recorded_by_name' => $request->user()?->name,
                'notes' => 'Difinalisasi: tidak ada presensi mengajar',
                'metadata' => ['attendance_session_id' => $c->attendance_session_id, 'auto_finalized' => true],
            ]);
            $count++;
        }

        $msg = $count > 0 ? "Finalisasi selesai: {$count} sesi KBM tanpa presensi guru ditandai alpa." : 'Finalisasi selesai: semua sesi KBM sudah memiliki presensi guru.';
        if ($skipped > 0) {
            $msg .= " {$skipped} sesi dilewati karena gurunya belum memiliki data staf.";
        }

        return response()->json(['success' => true, 'message' => $msg, 'data' => ['absent_created' => $count, 'skipped' => $skipped]]);
    }

    /** Tetapkan guru pengganti memakai id staf (diteruskan ke penetapan pengganti KBM). */
    public function substitute(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_schedule_id' => 'required|integer|exists:academic_schedules,id',
            'substitute_staff_id' => 'required|integer|exists:staff_profiles,id',
            'date' => 'required|date',
            'reason' => 'required|string|max:255',
        ], ['reason.required' => 'Alasan penggantian wajib diisi.']);
        $staff = StaffProfile::find($data['substitute_staff_id']);
        if (!$staff?->user_id) {
            return ApiResponse::error('TEACHER_ACCOUNT_MISSING', "{$staff?->name} belum ditautkan ke akun guru, sehingga belum bisa ditetapkan sebagai pengganti.", null, 422);
        }
        $request->merge(['substitute_teacher_id' => $staff->user_id]);

        return app(AcademicApiController::class)->storeSubstitution($request);
    }

    // ================================================================== Helper

    private function baseQuery(Request $request)
    {
        $q = AcademicSessionContext::with(['session', 'classroom', 'subject', 'scheduledTeacher', 'teachingTeacher']);
        if (!$this->canManageAll($request)) {
            $uid = (int) $request->user()->id;
            $q->where(fn ($w) => $w->where('teaching_teacher_id', $uid)->orWhere(fn ($x) => $x->whereNull('teaching_teacher_id')->where('scheduled_teacher_id', $uid)));
        }

        return $q;
    }

    /** Petugas KBM / piket / laporan melihat semua sesi; guru biasa hanya sesi miliknya. */
    private function canManageAll(Request $request): bool
    {
        $u = $request->user();

        return (bool) $u && ($u->can('kbm.monitoring') || $u->can('staff.attendance') || $u->can('kbm.reports') || $u->can('kbm.master'));
    }

    private function denyIfNotSelf(Request $request, StaffProfile $staff): ?JsonResponse
    {
        if ($this->canManageAll($request) || (int) $staff->user_id === (int) $request->user()->id) {
            return null;
        }

        return ApiResponse::error('FORBIDDEN', 'Anda hanya dapat mencatat presensi mengajar untuk diri sendiri.', null, 403);
    }

    private function resolveStaff(?int $staffId, ?string $identifier): ?StaffProfile
    {
        if ($staffId) {
            return StaffProfile::where('is_active', true)->find($staffId);
        }
        if ($identifier === null || trim($identifier) === '') {
            return null;
        }
        $id = trim($identifier);

        return StaffProfile::where('is_active', true)->where(fn ($q) => $q->where('staff_number', $id)->orWhere('qr_token', $id)
            ->orWhere('rfid_uid', Student::normalizeRfidUid($id)))->first();
    }

    private function isAssigned(AcademicSessionContext $c, int $userId): bool
    {
        return $c->teaching_teacher_id
            ? (int) $c->teaching_teacher_id === $userId
            : (int) $c->scheduled_teacher_id === $userId;
    }

    /** Sesi KBM guru hari ini yang sedang berlangsung, berikutnya, atau terakhir dimulai. */
    private function currentContextFor(int $userId): ?AcademicSessionContext
    {
        $now = now();
        $mine = AcademicSessionContext::with('session')
            ->whereHas('session', fn ($q) => $q->whereDate('session_date', today()))
            ->where(fn ($w) => $w->where('teaching_teacher_id', $userId)->orWhere(fn ($x) => $x->whereNull('teaching_teacher_id')->where('scheduled_teacher_id', $userId)))
            ->get()
            ->filter(fn ($c) => $this->sessionStatus($c) !== 'cancelled')
            ->sortBy(fn ($c) => $this->window($c)[0]->timestamp)
            ->values();
        if ($mine->isEmpty()) {
            return null;
        }
        // Sedang berlangsung (boleh scan 30 menit sebelum mulai), lalu yang berikutnya, lalu yang terakhir.
        return $mine->first(function ($c) use ($now) {
            [$s, $e] = $this->window($c);

            return $now->between($s->copy()->subMinutes(30), $e);
        }) ?? $mine->first(fn ($c) => $this->window($c)[0]->gt($now)) ?? $mine->last();
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function window(AcademicSessionContext $c): array
    {
        $s = $c->session;
        $date = $s->session_date->toDateString();
        $start = $s->start_at ? Carbon::parse($date . ' ' . $s->start_at->format('H:i:s')) : Carbon::parse($date . ' 07:00:00');
        $end = $s->end_at ? Carbon::parse($date . ' ' . $s->end_at->format('H:i:s')) : $start->copy()->addMinutes(40);

        return [$start, $end];
    }

    private function sessionStatus(AcademicSessionContext $c): string
    {
        $st = $c->session?->status;

        return (string) (is_object($st) ? $st->value : $st);
    }

    /** @return array{mode: string, message: string, status?: string, late?: int} */
    private function checkInOrOut(Request $request, StaffProfile $staff, AcademicSessionContext $context, string $method, ?string $notes = null, bool $checkInOnly = false): array
    {
        return DB::transaction(function () use ($request, $staff, $context, $method, $notes, $checkInOnly) {
            [$start, $end] = $this->window($context);
            $record = StaffAttendanceRecord::firstOrNew([
                'staff_profile_id' => $staff->id, 'attendance_type' => 'teaching', 'context_key' => 'teaching:' . $context->attendance_session_id,
            ]);
            $now = now();
            $tolerance = (int) (AppSetting::get('attendance')['late_tolerance_minutes'] ?? 15);
            $isSub = $context->teaching_teacher_id && (int) $context->teaching_teacher_id !== (int) $context->scheduled_teacher_id;
            $label = ($context->subject?->name ?? 'KBM') . ' — ' . ($context->classroom?->name ?? '');

            if (!$record->check_in_at || in_array($record->status, ['absent', 'permission', 'sick'], true)) {
                $late = $now->gt($start->copy()->addMinutes($tolerance)) ? (int) floor($start->diffInMinutes($now, true)) : 0;
                $status = $late > 0 ? 'late' : 'present';
                $record->fill([
                    'attendance_date' => $start->toDateString(), 'status' => $status,
                    'scheduled_start_at' => $start, 'scheduled_end_at' => $end,
                    'check_in_at' => $now, 'check_in_method' => $method, 'late_minutes' => min(65535, $late),
                    'recorded_by' => $request->user()?->id, 'recorded_by_name' => $request->user()?->name,
                    'notes' => $notes ?: (($isSub ? 'Guru pengganti. ' : '') . ($late > 0 ? "Mulai mengajar terlambat {$late} menit" : 'Mulai mengajar tepat waktu')),
                    'metadata' => ['attendance_session_id' => $context->attendance_session_id, 'subject' => $context->subject?->name, 'classroom' => $context->classroom?->name],
                ])->save();

                return ['mode' => 'check_in', 'status' => $status, 'late' => $late, 'message' => $late > 0
                    ? "{$staff->name}: mulai mengajar {$label}, terlambat {$late} menit."
                    : "{$staff->name}: mulai mengajar {$label} tepat waktu."];
            }
            if ($checkInOnly) {
                return ['mode' => 'duplicate', 'status' => $record->status, 'late' => (int) $record->late_minutes, 'message' => "{$staff->name} sudah tercatat hadir mengajar {$label}."];
            }
            if (!$record->check_out_at) {
                $early = $now->lt($end) ? (int) floor($now->diffInMinutes($end, true)) : 0;
                $record->update(['check_out_at' => $now, 'check_out_method' => $method, 'early_leave_minutes' => min(65535, $early)]);

                return ['mode' => 'check_out', 'status' => $record->status, 'late' => (int) $record->late_minutes, 'message' => "{$staff->name}: selesai mengajar {$label} tercatat."];
            }

            return ['mode' => 'duplicate', 'status' => $record->status, 'late' => (int) $record->late_minutes, 'message' => "{$staff->name} sudah tercatat mulai & selesai mengajar untuk sesi ini."];
        });
    }

    /**
     * Bentuk data TeachingSession untuk SPA.
     *
     * @param  Collection<int, AcademicSessionContext>  $contexts
     */
    private function rows(Collection $contexts): Collection
    {
        if ($contexts->isEmpty()) {
            return collect();
        }
        $userIds = $contexts->flatMap(fn ($c) => [$c->scheduled_teacher_id, $c->teaching_teacher_id])->filter()->unique();
        $staffByUser = StaffProfile::whereIn('user_id', $userIds)->get()->keyBy('user_id');
        $periods = LessonPeriod::whereIn('id', $contexts->pluck('lesson_period_id')->filter()->unique())->get()->keyBy('id');
        $subs = AcademicSubstitution::whereIn('attendance_session_id', $contexts->pluck('attendance_session_id'))->get()->keyBy('attendance_session_id');
        $records = StaffAttendanceRecord::where('attendance_type', 'teaching')
            ->whereIn('context_key', $contexts->map(fn ($c) => 'teaching:' . $c->attendance_session_id))
            ->get()->keyBy('context_key');
        $submitters = User::whereIn('id', $contexts->pluck('journal_submitted_by')->filter()->unique())->pluck('name', 'id');

        return $contexts->map(function (AcademicSessionContext $c) use ($staffByUser, $periods, $subs, $records, $submitters) {
            $s = $c->session;
            [$start, $end] = $this->window($c);
            $sched = $staffByUser->get($c->scheduled_teacher_id);
            $actualUser = $c->teaching_teacher_id ?: $c->scheduled_teacher_id;
            $actual = $staffByUser->get($actualUser);
            $actualName = $c->teachingTeacher?->name ?? $c->scheduledTeacher?->name;
            $period = $c->lesson_period_id ? $periods->get($c->lesson_period_id) : null;
            $sub = $subs->get($c->attendance_session_id);
            $rec = $records->get('teaching:' . $c->attendance_session_id);
            $sessionStatus = $this->sessionStatus($c);
            $status = match (true) {
                $sessionStatus === 'cancelled' => 'cancelled',
                (bool) $rec?->check_out_at || $sessionStatus === 'closed' => 'completed',
                (bool) $rec?->check_in_at || $sessionStatus === 'open' => 'open',
                default => 'scheduled',
            };

            return [
                'id' => $s->id, 'attendance_session_id' => $s->id, 'academic_schedule_id' => $c->academic_schedule_id,
                'session_date' => $s->session_date?->toDateString(),
                'classroom_id' => $c->classroom_id, 'classroom_name' => $c->classroom?->name ?? '-',
                'subject_id' => $c->subject_id, 'subject_name' => $c->subject?->name ?? '-', 'subject_code' => $c->subject?->code,
                'lesson_period_id' => $c->lesson_period_id, 'lesson_period_name' => $period?->name ?? '-', 'period_number' => (int) ($period?->sort_order ?? 1),
                'room_location' => $s->location,
                'scheduled_start_at' => $start->format('H:i'), 'scheduled_end_at' => $end->format('H:i'),
                'start_time' => $start->format('H:i'), 'end_time' => $end->format('H:i'),
                'scheduled_teacher_staff_id' => $sched?->id ?? 0, 'scheduled_teacher_name' => $c->scheduledTeacher?->name ?? '-',
                'teacher_staff_id' => $actual?->id ?? $sched?->id, 'teacher_name' => $actualName,
                'actual_teacher_staff_id' => $actual?->id, 'actual_teacher_name' => $actualName,
                'is_substituted' => (bool) ($c->teaching_teacher_id && (int) $c->teaching_teacher_id !== (int) $c->scheduled_teacher_id),
                'substitution_id' => $sub?->id, 'substitution_reason' => $sub?->reason,
                'status' => $status,
                'teacher_attendance_status' => $rec?->status ?? 'unrecorded',
                'teacher_check_in_at' => $rec?->check_in_at?->toIso8601String(),
                'teacher_check_out_at' => $rec?->check_out_at?->toIso8601String(),
                'teacher_check_in_method' => $rec?->check_in_method,
                'late_minutes' => (int) ($rec?->late_minutes ?? 0),
                'teacher_attendance_notes' => $rec?->notes,
                'topic' => $c->topic,
                'journal_notes' => $c->journal_notes,
                'student_present_count' => $c->student_present_count,
                'realization_status' => $c->realization_status ?? 'pending',
                'journal_submitted_by' => $c->journal_submitted_by ? ($submitters[$c->journal_submitted_by] ?? null) : null,
                'journal_submitted_at' => $c->journal_submitted_at?->toIso8601String(),
                'teacher_has_account' => (bool) $actual,
            ];
        })->values();
    }
}
