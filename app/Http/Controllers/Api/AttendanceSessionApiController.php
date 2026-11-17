<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Transformers\SpaTransformer;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Services\Attendance\AttendanceResult;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\SessionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * API sesi absensi untuk aplikasi React (daftar sesi, buka/tutup, peserta, catat manual, koreksi, KPI).
 * Semua pencatatan lewat AttendanceService agar aturannya sama dengan QR & RFID.
 */
class AttendanceSessionApiController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected SessionService $sessionService
    ) {}

    // ------------------------------------------------------------------ Sesi

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'nullable|date',
            'status' => ['nullable', Rule::in(array_column(SessionStatus::cases(), 'value'))],
            'category_id' => 'nullable|integer',
            'search' => 'nullable|string|max:100',
        ]);

        $query = AttendanceSession::with(['activity.category', 'openedByUser', 'closedByUser'])
            ->orderByDesc('session_date')->orderBy('start_at');

        if ($request->filled('date')) {
            $query->whereDate('session_date', $request->input('date'));
        } else {
            // tanpa filter tanggal: batasi 30 hari terakhir s/d 7 hari ke depan
            $query->whereBetween('session_date', [today()->subDays(30), today()->addDays(7)]);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('category_id')) {
            $query->whereHas('activity', fn ($q) => $q->where('activity_category_id', (int) $request->input('category_id')));
        }
        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('session_code', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('activity', fn ($a) => $a->where('name', 'like', "%{$search}%"));
            });
        }

        $sessions = $query->limit(500)->get();
        $stats = $this->statsFor($sessions->pluck('id'));

        return response()->json([
            'success' => true,
            'data' => $sessions->map(fn ($s) => SpaTransformer::session($s, $stats[$s->id] ?? []))->values(),
        ]);
    }

    public function show(AttendanceSession $session): JsonResponse
    {
        $session->load(['activity.category', 'openedByUser', 'closedByUser']);
        $stats = $this->statsFor(collect([$session->id]));

        return response()->json(['success' => true, 'data' => SpaTransformer::session($session, $stats[$session->id] ?? [])]);
    }

    public function open(Request $request, AttendanceSession $session): JsonResponse
    {
        return $this->transition(function () use ($session, $request) {
            $opened = $this->sessionService->openSession($session, $request->user());
            app(\App\Services\Staff\StaffDailyAttendanceService::class)->recordTeaching($opened, 'open', $request->user());

            return $opened;
        }, 'dibuka');
    }

    public function close(Request $request, AttendanceSession $session): JsonResponse
    {
        return $this->transition(function () use ($session, $request) {
            $closed = $this->sessionService->closeSession($session, $request->user());
            app(\App\Services\Staff\StaffDailyAttendanceService::class)->recordTeaching($closed, 'close', $request->user());
            $this->finalizeUnrecorded($closed, $request->user());

            return $closed;
        }, 'ditutup');
    }

    public function cancel(Request $request, AttendanceSession $session): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500'], ['reason.required' => 'Alasan pembatalan sesi wajib diisi.']);

        return $this->transition(fn () => $this->sessionService->cancelSession($session, $request->user(), $data['reason']), 'dibatalkan');
    }

    /**
     * Saat sesi ditutup: peserta yang belum tercatat otomatis diberi status — sesuai izin yang disetujui
     * (sakit/izin/dispensasi) atau alpa. Sama seperti perilaku aplikasi lama, kini di server.
     */
    private function finalizeUnrecorded(AttendanceSession $session, $operator): int
    {
        $recorded = AttendanceRecord::where('attendance_session_id', $session->id)->pluck('student_id');
        $pending = AttendanceSessionParticipant::where('attendance_session_id', $session->id)
            ->whereNotIn('student_id', $recorded)
            ->where(fn ($q) => $q->whereNull('eligibility_status')->orWhereRaw('LOWER(eligibility_status) != ?', ['ineligible']))
            ->pluck('student_id');
        if ($pending->isEmpty()) {
            return 0;
        }

        $excusals = \App\Models\StudentExcusal::whereIn('student_id', $pending)
            ->activeBetween($session->start_at ?? $session->session_date, $session->end_at ?? $session->session_date)
            ->get()->keyBy('student_id');

        foreach ($pending as $studentId) {
            $exc = $excusals->get($studentId);
            try {
                AttendanceRecord::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => $exc ? (AttendanceStatus::tryFrom($exc->type) ?? AttendanceStatus::ABSENT) : AttendanceStatus::ABSENT,
                    'method' => AttendanceMethod::MANUAL,
                    'check_in_at' => null,
                    'late_minutes' => 0,
                    'recorded_by' => $operator?->id,
                    'notes' => $exc ? 'Otomatis saat sesi ditutup (izin disetujui)' : 'Otomatis saat sesi ditutup (tanpa keterangan)',
                    'metadata' => ['auto_finalized' => true],
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException) {
                // sudah tercatat oleh proses lain
            }
        }

        return $pending->count();
    }

    private function transition(callable $action, string $verb): JsonResponse
    {
        try {
            $session = $action();
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error('INVALID_SESSION_TRANSITION', $e->getMessage(), null, 409);
        }

        $session->load(['activity.category', 'openedByUser', 'closedByUser']);
        $stats = $this->statsFor(collect([$session->id]));

        return response()->json([
            'success' => true,
            'message' => "Sesi {$session->session_code} berhasil {$verb}.",
            'data' => SpaTransformer::session($session, $stats[$session->id] ?? []),
        ]);
    }

    // ------------------------------------------------------------------ Peserta & catatan

    public function participants(Request $request, AttendanceSession $session): JsonResponse
    {
        $request->validate(['search' => 'nullable|string|max:100', 'classroom_id' => 'nullable|integer']);

        $query = AttendanceSessionParticipant::where('attendance_session_id', $session->id)
            ->with(['student.classroom', 'student.dormitoryRoom']);

        if ($search = trim((string) $request->input('search', ''))) {
            $query->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('student_number', 'like', "%{$search}%"));
        }
        if ($request->filled('classroom_id')) {
            $query->whereHas('student', fn ($q) => $q->where('classroom_id', (int) $request->input('classroom_id')));
        }

        return response()->json([
            'success' => true,
            'data' => $query->get()->sortBy(fn ($p) => $p->student?->name)->map(fn ($p) => SpaTransformer::participant($p))->values(),
        ]);
    }

    public function records(AttendanceSession $session): JsonResponse
    {
        $records = AttendanceRecord::where('attendance_session_id', $session->id)
            ->with(['student.classroom', 'student.dormitoryRoom', 'device', 'recordedBy'])
            ->orderBy('check_in_at')
            ->get();

        return response()->json(['success' => true, 'data' => $records->map(fn ($r) => SpaTransformer::record($r))->values()]);
    }

    /**
     * Catat absensi manual satu santri. Hasil bisnis (sudah absen, sesi ditutup, dll.) dikirim
     * dengan HTTP 200 di dalam `data` agar tampilan React bisa menampilkan pesannya.
     */
    public function manual(Request $request, AttendanceSession $session): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'status' => ['required', Rule::enum(AttendanceStatus::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        $student = Student::with(['classroom', 'dormitoryRoom'])->findOrFail($data['student_id']);
        $result = $this->attendanceService->record(
            session: $session->load('activity'),
            student: $student,
            method: AttendanceMethod::MANUAL,
            operator: $request->user(),
            overrideStatus: $this->applyExcusal($session, $student, AttendanceStatus::from($data['status'])),
            notes: $data['notes'] ?? null,
        );

        return response()->json(['success' => true, 'data' => $this->resultPayload($result, $student)]);
    }

    public function manualBulk(Request $request, AttendanceSession $session): JsonResponse
    {
        $data = $request->validate([
            'student_ids' => 'required|array|min:1|max:1000',
            'student_ids.*' => 'integer',
            'status' => ['required', Rule::enum(AttendanceStatus::class)],
            'notes' => 'nullable|string|max:1000',
        ]);

        $session->load('activity');
        $status = AttendanceStatus::from($data['status']);
        $students = Student::with(['classroom', 'dormitoryRoom'])->whereIn('id', $data['student_ids'])->get()->keyBy('id');

        $summary = ['total' => count($data['student_ids']), 'success' => 0, 'skipped' => 0, 'failed' => 0, 'messages' => [], 'newRecords' => []];

        foreach (array_unique($data['student_ids']) as $id) {
            $student = $students->get($id);
            if (!$student) {
                $summary['failed']++;
                $summary['messages'][] = "Santri ID {$id} tidak ditemukan.";
                continue;
            }

            $result = $this->attendanceService->record(
                session: $session,
                student: $student,
                method: AttendanceMethod::MANUAL,
                operator: $request->user(),
                overrideStatus: $this->applyExcusal($session, $student, $status),
                notes: $data['notes'] ?? null,
            );

            if ($result->success) {
                $summary['success']++;
                $summary['newRecords'][] = SpaTransformer::record($result->attendanceRecord->load(['student.classroom', 'student.dormitoryRoom']));
            } elseif ($result->code === AttendanceResultCode::ALREADY_RECORDED) {
                $summary['skipped']++;
            } else {
                $summary['failed']++;
                $summary['messages'][] = $result->message;
            }
        }

        return response()->json(['success' => true, 'data' => $summary]);
    }

    public function correct(Request $request, AttendanceRecord $record): JsonResponse
    {
        $data = $request->validate([
            'new_status' => ['required', Rule::enum(AttendanceStatus::class)],
            'reason' => 'required|string|min:3|max:500',
        ], ['reason.required' => 'Alasan koreksi status absensi wajib diisi.']);

        $record->load(['student.classroom', 'student.dormitoryRoom', 'session']);
        $newStatus = AttendanceStatus::from($data['new_status']);
        $oldStatus = $record->status;

        if ($oldStatus === $newStatus) {
            return response()->json(['success' => true, 'data' => [
                'success' => false,
                'code' => 'ALREADY_RECORDED',
                'message' => "Santri sudah berstatus '{$newStatus->value}'. Tidak ada perubahan.",
            ]]);
        }

        $operator = $request->user();
        $oldPayload = SpaTransformer::record($record);

        $history = DB::transaction(function () use ($record, $newStatus, $oldStatus, $data, $operator, $request) {
            $record->update([
                'status' => $newStatus,
                'late_minutes' => $newStatus === AttendanceStatus::LATE ? $record->late_minutes : 0,
                'notes' => trim(($record->notes ? $record->notes . ' | ' : '') . 'Koreksi: ' . $data['reason'] . ' (' . ($operator?->name ?? 'sistem') . ')'),
                'recorded_by' => $operator?->id ?? $record->recorded_by,
            ]);

            return AttendanceRecordHistory::create([
                'attendance_record_id' => $record->id,
                'student_id' => $record->student_id,
                'old_status' => SpaTransformer::val($oldStatus),
                'new_status' => $newStatus->value,
                'old_method' => SpaTransformer::val($record->method),
                'new_method' => SpaTransformer::val($record->method),
                'reason' => $data['reason'],
                'changed_by' => $operator?->name,
                'changed_at' => now(),
                'metadata' => ['user_id' => $operator?->id, 'ip' => $request->ip()],
            ]);
        });

        $updated = SpaTransformer::record($record->fresh(['student.classroom', 'student.dormitoryRoom', 'device', 'recordedBy']));
        $historyPayload = SpaTransformer::history($history, $record->student?->name);

        return response()->json(['success' => true, 'data' => [
            'success' => true,
            'code' => 'SUCCESS',
            'message' => "Status santri {$record->student?->name} berhasil dikoreksi menjadi '{$newStatus->value}'.",
            'oldRecord' => $oldPayload,
            'updatedRecord' => $updated,
            'record' => $updated,
            'history' => $historyPayload,
            'historyEntry' => $historyPayload,
        ]]);
    }

    // ------------------------------------------------------------------ KPI & monitoring

    public function kpi(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $date = $request->input('date', today()->toDateString());

        $sessions = AttendanceSession::whereDate('session_date', $date)->get(['id', 'status']);
        $stats = $this->statsFor($sessions->pluck('id'));
        $sum = fn (string $k) => array_sum(array_map(fn ($s) => (int) ($s[$k] ?? 0), $stats));

        $eligible = $sum('participants');
        $recorded = $sum('recorded');
        $statusOf = fn ($s) => SpaTransformer::val($s->status);

        return response()->json(['success' => true, 'data' => [
            'totalSessionsToday' => $sessions->count(),
            'openSessionsCount' => $sessions->filter(fn ($s) => $statusOf($s) === 'open')->count(),
            'draftSessionsCount' => $sessions->filter(fn ($s) => $statusOf($s) === 'draft')->count(),
            'closedSessionsCount' => $sessions->filter(fn ($s) => $statusOf($s) === 'closed')->count(),
            'totalEligibleParticipants' => $eligible,
            'recordedCount' => $recorded,
            'unrecordedCount' => max(0, $eligible - $recorded),
            'presentCount' => $sum('present'),
            'lateCount' => $sum('late'),
            'permissionCount' => $sum('permission'),
            'sickCount' => $sum('sick'),
            'dispensationCount' => $sum('dispensation'),
            'absentCount' => $sum('absent'),
            'completionRate' => $eligible > 0 ? (int) round($recorded / $eligible * 100) : 0,
        ]]);
    }

    public function monitoring(): JsonResponse
    {
        $sessions = AttendanceSession::with(['activity.category'])
            ->where('status', SessionStatus::OPEN)
            ->orderBy('start_at')
            ->get();
        $stats = $this->statsFor($sessions->pluck('id'));

        $lastRecords = AttendanceRecord::with('student')
            ->whereIn('id', AttendanceRecord::selectRaw('MAX(id)')->whereIn('attendance_session_id', $sessions->pluck('id'))->groupBy('attendance_session_id'))
            ->get()->keyBy('attendance_session_id');

        $data = $sessions->map(function (AttendanceSession $s) use ($stats, $lastRecords) {
            $st = $stats[$s->id] ?? [];
            $eligible = (int) ($st['participants'] ?? 0);
            $recorded = (int) ($st['recorded'] ?? 0);
            $last = $lastRecords->get($s->id);

            return [
                'session' => SpaTransformer::session($s, $st),
                'activity' => $s->activity ? [
                    'id' => $s->activity->id, 'code' => $s->activity->code, 'name' => $s->activity->name,
                    'allow_manual' => (bool) $s->activity->allow_manual, 'allow_qr' => (bool) $s->activity->allow_qr,
                    'allow_rfid' => (bool) $s->activity->allow_rfid, 'is_active' => (bool) ($s->activity->is_active ?? true),
                ] : null,
                'totalEligible' => $eligible,
                'recordedCount' => $recorded,
                'unrecordedCount' => max(0, $eligible - $recorded),
                'presentCount' => (int) ($st['present'] ?? 0),
                'lateCount' => (int) ($st['late'] ?? 0),
                'permissionCount' => (int) ($st['permission'] ?? 0),
                'sickCount' => (int) ($st['sick'] ?? 0),
                'dispensationCount' => (int) ($st['dispensation'] ?? 0),
                'absentCount' => (int) ($st['absent'] ?? 0),
                'completionRate' => $eligible > 0 ? (int) round($recorded / $eligible * 100) : 0,
                'lastScanAt' => $last?->check_in_at?->toIso8601String(),
                'lastStudentName' => $last?->student?->name,
            ];
        })->values();

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Data absensi sekaligus (sesi + peserta + catatan) untuk mengisi state awal aplikasi React
     * (dashboard, laporan, monitoring) — menggantikan data contoh/localStorage.
     * Route: GET /api/v1/attendance/snapshot?from=YYYY-MM-DD&to=YYYY-MM-DD (maks. 93 hari)
     */
    public function snapshot(Request $request): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $to = Carbon::parse($request->input('to', today()->addDay()->toDateString()))->endOfDay();
        $from = Carbon::parse($request->input('from', today()->subDays(13)->toDateString()))->startOfDay();
        if ($from->diffInDays($to, true) > 93) { // laporan bulanan/triwulan
            $from = $to->copy()->subDays(93)->startOfDay();
        }

        $sessions = AttendanceSession::with(['activity.category', 'openedByUser', 'closedByUser'])
            ->whereBetween('session_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('session_date')->orderBy('start_at')
            ->limit(6000)
            ->get();
        $ids = $sessions->pluck('id');
        $stats = $this->statsFor($ids);

        $participants = AttendanceSessionParticipant::whereIn('attendance_session_id', $ids)
            ->with(['student.classroom', 'student.dormitoryRoom'])->get();
        $records = AttendanceRecord::whereIn('attendance_session_id', $ids)
            ->with(['student.classroom', 'student.dormitoryRoom', 'device', 'recordedBy'])->get();

        return response()->json(['success' => true, 'data' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'sessions' => $sessions->map(fn ($s) => SpaTransformer::session($s, $stats[$s->id] ?? []))->values(),
            'participants' => $participants->map(fn ($p) => SpaTransformer::participant($p))->values(),
            'records' => $records->map(fn ($r) => SpaTransformer::record($r))->values(),
            // Riwayat koreksi status presensi (untuk audit & laporan koreksi)
            'record_histories' => \App\Models\AttendanceRecordHistory::whereIn('attendance_record_id', $records->pluck('id'))
                ->with('student:id,name')
                ->orderByDesc('id')
                ->limit(5000)
                ->get()
                ->map(fn ($h) => SpaTransformer::history($h, $h->student?->name))
                ->values(),
        ]]);
    }

    // ------------------------------------------------------------------ Helper

    /**
     * Hitung jumlah peserta & status absensi per sesi dalam 2 query (tanpa N+1).
     *
     * @return array<int, array<string,int>>
     */
    private function statsFor(Collection $sessionIds): array
    {
        if ($sessionIds->isEmpty()) {
            return [];
        }

        $out = [];
        AttendanceSessionParticipant::whereIn('attendance_session_id', $sessionIds)
            ->where(fn ($q) => $q->whereNull('eligibility_status')->orWhereRaw('LOWER(eligibility_status) != ?', ['ineligible']))
            ->selectRaw('attendance_session_id, COUNT(*) as total')
            ->groupBy('attendance_session_id')
            ->get()
            ->each(function ($row) use (&$out) {
                $out[$row->attendance_session_id]['participants'] = (int) $row->total;
            });

        AttendanceRecord::whereIn('attendance_session_id', $sessionIds)
            ->selectRaw('attendance_session_id, status, COUNT(*) as total')
            ->groupBy('attendance_session_id', 'status')
            ->get()
            ->each(function ($row) use (&$out) {
                $status = SpaTransformer::val($row->status);
                $out[$row->attendance_session_id][$status] = (int) $row->total;
                $out[$row->attendance_session_id]['recorded'] = ($out[$row->attendance_session_id]['recorded'] ?? 0) + (int) $row->total;
            });

        // Sesi tanpa snapshot peserta: jumlah peserta = jumlah yang sudah tercatat
        foreach ($out as $id => $row) {
            if (!isset($row['participants'])) {
                $out[$id]['participants'] = (int) ($row['recorded'] ?? 0);
            }
        }

        return $out;
    }

    /**
     * Jika santri ditandai "alpa" padahal punya izin/sakit/dispensasi yang DISETUJUI pada jam sesi,
     * status otomatis diganti sesuai jenis izinnya.
     */
    private function applyExcusal(AttendanceSession $session, Student $student, AttendanceStatus $status): AttendanceStatus
    {
        if ($status !== AttendanceStatus::ABSENT) {
            return $status;
        }

        $excusal = \App\Models\StudentExcusal::where('student_id', $student->id)
            ->activeBetween($session->start_at ?? $session->session_date, $session->end_at ?? $session->session_date)
            ->orderByDesc('approved_at')
            ->first();

        return $excusal ? (AttendanceStatus::tryFrom($excusal->type) ?? $status) : $status;
    }

    private function resultPayload(AttendanceResult $result, Student $student): array
    {
        $record = $result->attendanceRecord?->loadMissing(['student.classroom', 'student.dormitoryRoom', 'device', 'recordedBy']);

        return [
            'success' => $result->success,
            'code' => $result->code === AttendanceResultCode::SYSTEM_ERROR ? 'SERVER_ERROR' : $result->code->value,
            'message' => $result->message,
            'record' => $record ? SpaTransformer::record($record) : null,
            'student' => SpaTransformer::student($student),
        ];
    }
}
