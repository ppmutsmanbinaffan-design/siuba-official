<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Transformers\SpaTransformer;
use App\Models\AcademicCalendarEvent;
use App\Models\Extracurricular;
use App\Models\ExtracurricularMember;
use App\Models\ExtracurricularSchedule;
use App\Models\ExtracurricularStaffAssignment;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\TrainerSubstitution;
use App\Models\TrainingSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Presensi pembina / pelatih ekstrakurikuler (halaman "Presensi Pembina Ekskul").
 * Sebelumnya seluruhnya berjalan di browser dengan jadwal latihan contoh yang tertanam di kode.
 */
class TrainerApiController extends Controller
{
    private const GRACE_MINUTES = 15;

    private const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // ================================================================== Ringkasan harian

    public function overview(Request $request): JsonResponse
    {
        $date = Carbon::parse($request->query('date', today()->toDateString()))->toDateString();
        $sessions = TrainingSession::with(['extracurricular', 'primaryStaff', 'actualStaff', 'substitution'])
            ->whereDate('session_date', $date)->orderBy('start_time')->get();
        $records = StaffAttendanceRecord::with('staff')->where('attendance_type', 'training')->whereDate('attendance_date', $date)->get();
        $recordBySession = $records->keyBy(fn ($r) => (int) ($r->metadata['training_session_id'] ?? 0));

        $sessionRows = $sessions->map(fn ($s) => $this->session($s, $recordBySession->get($s->id)))->values();
        $recordRows = $records->map(function ($r) use ($sessions) {
            $row = SpaTransformer::staffRecord($r);
            $sid = (int) ($r->metadata['training_session_id'] ?? 0);
            $row['context_id'] = $sid;
            $row['context_type'] = 'extracurricular';
            $row['context_name'] = $sessions->firstWhere('id', $sid)?->extracurricular?->name ?? 'Latihan ekskul';

            return $row;
        })->values();

        return response()->json(['success' => true, 'data' => [
            'date' => $date,
            'staff' => StaffProfile::where('is_active', true)->orderBy('name')->get()->map(fn ($s) => [
                'id' => $s->id, 'name' => $s->name, 'staff_number' => $s->staff_number, 'staff_type' => $s->staff_type, 'user_id' => $s->user_id,
            ])->values(),
            'extracurriculars' => Extracurricular::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name', 'location'])->values(),
            'schedules' => ExtracurricularSchedule::with('extracurricular')->orderBy('day_of_week')->orderBy('start_time')->get()->map(fn ($s) => [
                'id' => $s->id, 'extracurricular_id' => $s->extracurricular_id, 'extracurricular_name' => $s->extracurricular?->name,
                'day_of_week' => $s->day_of_week, 'day_name' => self::DAYS[$s->day_of_week] ?? '-',
                'start_time' => substr($s->start_time, 0, 5), 'end_time' => substr($s->end_time, 0, 5),
                'location' => $s->location, 'is_active' => (bool) $s->is_active,
            ])->values(),
            'assignments' => ExtracurricularStaffAssignment::with(['extracurricular', 'staff'])->orderByDesc('is_active')->orderBy('extracurricular_id')->get()
                ->map(fn ($a) => $this->assignment($a))->values(),
            'substitutions' => TrainerSubstitution::with(['extracurricular', 'originalStaff', 'substituteStaff'])
                ->whereDate('date', '>=', Carbon::parse($date)->subDays(30))->orderByDesc('date')->get()
                ->map(fn ($s) => $this->substitution($s))->values(),
            'sessions' => $sessionRows,
            'records' => $recordRows,
            'summary' => $this->summary($sessionRows->all()),
            'reconciliation' => $sessionRows->map(fn ($s) => $this->reconcile($s))->values(),
        ]]);
    }

    // ================================================================== Jadwal latihan

    public function storeSchedule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'extracurricular_id' => 'required|integer|exists:extracurriculars,id',
            'day_of_week' => 'required|integer|between:0,6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'location' => 'nullable|string|max:100',
        ], ['end_time.after' => 'Jam selesai latihan harus setelah jam mulai.']);
        $s = ExtracurricularSchedule::create($data + ['is_active' => true]);

        return response()->json(['success' => true, 'message' => 'Jadwal latihan ditambahkan.', 'data' => ['id' => $s->id]], 201);
    }

    public function deleteSchedule(ExtracurricularSchedule $schedule): JsonResponse
    {
        $schedule->delete(); // sesi latihan lama tetap ada

        return response()->json(['success' => true, 'message' => 'Jadwal latihan dihapus.']);
    }

    // ================================================================== Penugasan & pengganti

    public function storeAssignment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'extracurricular_id' => 'required|integer|exists:extracurriculars,id',
            'staff_id' => 'required|integer|exists:staff_profiles,id',
            'role' => ['nullable', Rule::in(['coach', 'assistant_coach', 'supervisor'])],
            'is_primary' => 'sometimes|boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        $role = $data['role'] ?? 'coach';
        $isPrimary = (bool) ($data['is_primary'] ?? $role === 'coach');

        $a = DB::transaction(function () use ($data, $role, $isPrimary, $request) {
            if ($isPrimary) {
                ExtracurricularStaffAssignment::where('extracurricular_id', $data['extracurricular_id'])->update(['is_primary' => false]);
            }
            $a = ExtracurricularStaffAssignment::updateOrCreate(
                ['extracurricular_id' => $data['extracurricular_id'], 'staff_profile_id' => $data['staff_id'], 'role' => $role],
                ['is_primary' => $isPrimary, 'start_date' => $data['start_date'] ?? today()->toDateString(), 'end_date' => $data['end_date'] ?? null,
                    'is_active' => true, 'created_by' => $request->user()?->id]
            );
            // Pelatih utama yang punya akun juga dicatat sebagai pembina di data ekskul
            $staff = StaffProfile::find($data['staff_id']);
            if ($isPrimary && $staff?->user_id) {
                Extracurricular::whereKey($data['extracurricular_id'])->update(['coach_id' => $staff->user_id]);
            }
            // Sesi latihan mendatang yang belum ada presensinya ikut memakai pelatih utama baru
            if ($isPrimary) {
                TrainingSession::where('extracurricular_id', $data['extracurricular_id'])->whereDate('session_date', '>=', today())
                    ->whereNull('trainer_substitution_id')->where('status', 'scheduled')
                    ->update(['primary_staff_profile_id' => $data['staff_id'], 'actual_staff_profile_id' => $data['staff_id']]);
            }

            return $a;
        });

        return response()->json(['success' => true, 'message' => 'Penugasan pelatih ekstrakurikuler disimpan.', 'data' => $this->assignment($a->load(['extracurricular', 'staff']))], 201);
    }

    public function deleteAssignment(ExtracurricularStaffAssignment $assignment): JsonResponse
    {
        $assignment->update(['is_active' => false, 'is_primary' => false, 'end_date' => today()]);

        return response()->json(['success' => true, 'message' => 'Penugasan pelatih dinonaktifkan.']);
    }

    public function storeSubstitution(Request $request): JsonResponse
    {
        $data = $request->validate([
            'extracurricular_id' => 'required|integer|exists:extracurriculars,id',
            'original_staff_id' => 'nullable|integer|exists:staff_profiles,id',
            'substitute_staff_id' => 'required|integer|exists:staff_profiles,id|different:original_staff_id',
            'date' => 'required|date',
            'reason' => 'nullable|string|max:255',
        ], ['substitute_staff_id.different' => 'Pelatih pengganti tidak boleh sama dengan pelatih asli.']);

        $sub = DB::transaction(function () use ($data, $request) {
            $date = Carbon::parse($data['date'])->toDateString();
            TrainerSubstitution::where('extracurricular_id', $data['extracurricular_id'])->whereDate('date', $date)->where('status', 'active')
                ->update(['status' => 'cancelled']);
            $sub = TrainerSubstitution::create([
                'extracurricular_id' => $data['extracurricular_id'], 'date' => $date,
                'original_staff_profile_id' => $data['original_staff_id'] ?? null,
                'substitute_staff_profile_id' => $data['substitute_staff_id'],
                'reason' => $data['reason'] ?? null, 'status' => 'active', 'assigned_by' => $request->user()?->id,
            ]);
            TrainingSession::where('extracurricular_id', $data['extracurricular_id'])->whereDate('session_date', $date)
                ->update(['actual_staff_profile_id' => $data['substitute_staff_id'], 'trainer_substitution_id' => $sub->id]);

            return $sub;
        });

        return response()->json(['success' => true, 'message' => 'Pelatih pengganti didaftarkan dan diterapkan ke sesi latihan terkait.', 'data' => $this->substitution($sub->load(['extracurricular', 'originalStaff', 'substituteStaff']))], 201);
    }

    public function cancelSubstitution(TrainerSubstitution $substitution): JsonResponse
    {
        DB::transaction(function () use ($substitution) {
            $substitution->update(['status' => 'cancelled']);
            TrainingSession::where('trainer_substitution_id', $substitution->id)->get()->each(fn ($s) => $s->update([
                'trainer_substitution_id' => null, 'actual_staff_profile_id' => $s->primary_staff_profile_id,
            ]));
        });

        return response()->json(['success' => true, 'message' => 'Penggantian pelatih dibatalkan.']);
    }

    // ================================================================== Sesi latihan

    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date']);
        $date = Carbon::parse($data['date']);
        $dateStr = $date->toDateString();

        $holiday = AcademicCalendarEvent::whereDate('start_date', '<=', $dateStr)->whereDate('end_date', '>=', $dateStr)
            ->where('type', 'holiday')->first();
        if ($holiday) {
            return response()->json(['success' => true, 'data' => [
                'date' => $dateStr, 'schedules_found' => 0, 'sessions_created' => 0, 'sessions_existing' => 0, 'substitutions_applied' => 0,
                'is_holiday' => true, 'holiday_name' => $holiday->name,
            ], 'message' => "Tanggal {$dateStr} libur ({$holiday->name}); sesi latihan tidak dibuat."]);
        }

        $schedules = ExtracurricularSchedule::with('extracurricular')->where('is_active', true)->where('day_of_week', $date->dayOfWeek)->get()
            ->filter(fn ($s) => $s->extracurricular?->is_active);
        $created = $existing = $subs = 0;

        foreach ($schedules as $sch) {
            $session = TrainingSession::where('extracurricular_id', $sch->extracurricular_id)->whereDate('session_date', $dateStr)
                ->where('start_time', 'like', substr($sch->start_time, 0, 5) . '%')->first();
            if ($session) {
                $existing++;
                continue;
            }
            $primary = $this->primaryStaffId($sch->extracurricular, $dateStr);
            $sub = TrainerSubstitution::where('extracurricular_id', $sch->extracurricular_id)->whereDate('date', $dateStr)->where('status', 'active')->latest('id')->first();
            if ($sub) $subs++;
            TrainingSession::create([
                'extracurricular_id' => $sch->extracurricular_id, 'extracurricular_schedule_id' => $sch->id,
                'session_date' => $dateStr, 'start_time' => $sch->start_time, 'end_time' => $sch->end_time,
                'location' => $sch->location ?? $sch->extracurricular->location,
                'primary_staff_profile_id' => $primary,
                'actual_staff_profile_id' => $sub?->substitute_staff_profile_id ?? $primary,
                'trainer_substitution_id' => $sub?->id,
                'status' => 'scheduled', 'realization_status' => 'pending',
            ]);
            $created++;
        }

        return response()->json(['success' => true, 'data' => [
            'date' => $dateStr, 'schedules_found' => $schedules->count(), 'sessions_created' => $created,
            'sessions_existing' => $existing, 'substitutions_applied' => $subs, 'is_holiday' => false,
        ]]);
    }

    /** Presensi pelatih lewat kartu RFID / QR / nomor induk: tap pertama = mulai melatih, tap kedua = selesai. */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => 'nullable|string|max:100',
            'staff_id' => 'nullable|integer',
            'session_id' => 'nullable|integer|exists:training_sessions,id',
            'method' => 'nullable|in:qr,rfid,manual',
        ]);

        $staff = null;
        if (!empty($data['staff_id'])) {
            $staff = StaffProfile::where('is_active', true)->find($data['staff_id']);
        } elseif (!empty($data['identifier'])) {
            $id = trim($data['identifier']);
            $staff = StaffProfile::where('is_active', true)->where(fn ($q) => $q->where('staff_number', $id)->orWhere('qr_token', $id)
                ->orWhere('rfid_uid', Student::normalizeRfidUid($id)))->first();
        }
        if (!$staff) {
            return ApiResponse::error('STAFF_NOT_FOUND', 'Data staf/pelatih tidak ditemukan dengan identitas tersebut.', null, 404);
        }

        $today = today()->toDateString();
        $session = !empty($data['session_id']) ? TrainingSession::find($data['session_id'])
            : TrainingSession::whereDate('session_date', $today)->where('status', '!=', 'cancelled')
                ->where(fn ($q) => $q->where('actual_staff_profile_id', $staff->id)->orWhere('primary_staff_profile_id', $staff->id))
                ->orderBy('start_time')->first()
            ?? TrainingSession::whereDate('session_date', $today)->where('status', '!=', 'cancelled')
                ->whereIn('extracurricular_id', ExtracurricularStaffAssignment::where('staff_profile_id', $staff->id)->where('is_active', true)->pluck('extracurricular_id'))
                ->orderBy('start_time')->first();
        if (!$session) {
            return ApiResponse::error('NO_TRAINING_SESSION', "Tidak ada sesi latihan hari ini untuk {$staff->name}. Buat sesi latihan dulu (tombol Sinkronisasi Sesi).", null, 404);
        }
        if ($session->status === 'cancelled') {
            return ApiResponse::error('SESSION_CANCELLED', 'Sesi latihan ini dibatalkan.', null, 409);
        }

        $method = $data['method'] ?? 'manual';
        $result = DB::transaction(function () use ($staff, $session, $method, $request) {
            $date = $session->session_date->toDateString();
            $start = Carbon::parse($date . ' ' . $session->start_time);
            $end = Carbon::parse($date . ' ' . $session->end_time);
            $record = StaffAttendanceRecord::firstOrNew([
                'staff_profile_id' => $staff->id, 'attendance_type' => 'training', 'context_key' => 'training:' . $session->id,
            ]);
            $now = now();
            $isSub = $session->actual_staff_profile_id && $session->actual_staff_profile_id === $staff->id && $session->primary_staff_profile_id !== $staff->id;

            if (!$record->check_in_at || $record->status === 'absent') {
                $late = $now->gt($start->copy()->addMinutes(self::GRACE_MINUTES)) ? (int) floor($start->diffInMinutes($now, true)) : 0;
                $record->fill([
                    'attendance_date' => $date, 'status' => $late > 0 ? 'late' : 'present',
                    'scheduled_start_at' => $start, 'scheduled_end_at' => $end,
                    'check_in_at' => $now, 'check_in_method' => $method, 'late_minutes' => min(65535, $late),
                    'recorded_by' => $request->user()?->id, 'recorded_by_name' => $request->user()?->name,
                    'notes' => ($isSub ? 'Pelatih pengganti. ' : '') . ($late > 0 ? "Mulai melatih terlambat {$late} menit" : 'Mulai melatih tepat waktu'),
                    'metadata' => ['training_session_id' => $session->id],
                ])->save();
                if ($session->status === 'scheduled') $session->update(['status' => 'ongoing']);

                return ['mode' => 'check_in', 'message' => $late > 0
                    ? "{$staff->name}: presensi melatih tercatat, terlambat {$late} menit."
                    : "{$staff->name}: presensi melatih tercatat tepat waktu."];
            }
            if (!$record->check_out_at) {
                $early = $now->lt($end) ? (int) floor($now->diffInMinutes($end, true)) : 0;
                $record->update(['check_out_at' => $now, 'check_out_method' => $method, 'early_leave_minutes' => min(65535, $early)]);
                if ($session->status === 'ongoing') $session->update(['status' => 'completed']);

                return ['mode' => 'check_out', 'message' => "{$staff->name}: selesai melatih tercatat."];
            }

            return ['mode' => 'duplicate', 'message' => "{$staff->name} sudah tercatat mulai & selesai melatih untuk sesi ini."];
        });

        return response()->json(['success' => true, 'message' => $result['message'], 'data' => ['mode' => $result['mode'], 'session_id' => $session->id, 'staff_id' => $staff->id]]);
    }

    public function journal(Request $request, TrainingSession $session): JsonResponse
    {
        $data = $request->validate([
            'topic' => 'required|string|max:255',
            'student_present_count' => 'nullable|integer|min:0|max:5000',
            'activity_notes' => 'nullable|string|max:5000',
        ], ['topic.required' => 'Materi / topik latihan wajib diisi.']);
        $session->update($data + [
            'realization_status' => 'submitted',
            'status' => $session->status === 'cancelled' ? 'cancelled' : 'completed',
            'submitted_by' => $request->user()?->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Jurnal latihan dan realisasi materi tersimpan.']);
    }

    /** Sesi latihan yang pelatihnya tidak presensi ditandai alpa. */
    public function finalize(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date']);
        $date = Carbon::parse($data['date'])->toDateString();
        $count = 0;
        foreach (TrainingSession::whereDate('session_date', $date)->where('status', '!=', 'cancelled')->get() as $s) {
            $staffId = $s->actual_staff_profile_id ?? $s->primary_staff_profile_id;
            if (!$staffId) continue;
            $exists = StaffAttendanceRecord::where('staff_profile_id', $staffId)->where('attendance_type', 'training')
                ->where('context_key', 'training:' . $s->id)->exists();
            if ($exists) continue;
            StaffAttendanceRecord::create([
                'staff_profile_id' => $staffId, 'attendance_date' => $date, 'attendance_type' => 'training', 'context_key' => 'training:' . $s->id,
                'status' => 'absent', 'scheduled_start_at' => Carbon::parse("$date {$s->start_time}"), 'scheduled_end_at' => Carbon::parse("$date {$s->end_time}"),
                'recorded_by' => $request->user()?->id, 'recorded_by_name' => $request->user()?->name,
                'notes' => 'Difinalisasi: tidak ada presensi melatih', 'metadata' => ['training_session_id' => $s->id, 'auto_finalized' => true],
            ]);
            $count++;
        }

        return response()->json(['success' => true, 'message' => $count > 0
            ? "Finalisasi selesai: {$count} sesi tanpa presensi pelatih ditandai alpa."
            : 'Finalisasi selesai: semua sesi latihan sudah memiliki presensi pelatih.', 'data' => ['absent_created' => $count]]);
    }

    // ================================================================== Helper

    private function primaryStaffId(Extracurricular $e, string $date): ?int
    {
        $base = ExtracurricularStaffAssignment::where('extracurricular_id', $e->id)->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('start_date')->orWhereDate('start_date', '<=', $date))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', $date));
        $a = (clone $base)->where('is_primary', true)->first() ?? (clone $base)->where('role', 'coach')->first();
        if ($a) return $a->staff_profile_id;

        return $e->coach_id ? StaffProfile::where('user_id', $e->coach_id)->value('id') : null;
    }

    private function session(TrainingSession $s, ?StaffAttendanceRecord $r): array
    {
        $memberCount = ExtracurricularMember::where('extracurricular_id', $s->extracurricular_id)->where('membership_status', 'active')->where('is_active', true)->count();

        return [
            'id' => $s->id, 'extracurricular_id' => $s->extracurricular_id, 'extracurricular_name' => $s->extracurricular?->name ?? '-',
            'extracurricular_code' => $s->extracurricular?->code ?? '', 'schedule_id' => $s->extracurricular_schedule_id,
            'session_date' => $s->session_date?->toDateString(),
            'scheduled_start_at' => substr($s->start_time, 0, 5), 'scheduled_end_at' => substr($s->end_time, 0, 5),
            'start_time' => substr($s->start_time, 0, 5), 'end_time' => substr($s->end_time, 0, 5), 'location' => $s->location,
            'primary_staff_id' => $s->primary_staff_profile_id, 'primary_staff_name' => $s->primaryStaff?->name,
            'coach_staff_id' => $s->primary_staff_profile_id, 'coach_name' => $s->primaryStaff?->name,
            'actual_primary_staff_id' => $s->actual_staff_profile_id, 'actual_primary_staff_name' => $s->actualStaff?->name,
            'actual_coach_staff_id' => $s->actual_staff_profile_id, 'actual_coach_name' => $s->actualStaff?->name,
            'is_substituted' => (bool) $s->trainer_substitution_id, 'substitution_id' => $s->trainer_substitution_id,
            'substitution_reason' => $s->substitution?->reason,
            'trainer_check_in_at' => $r?->check_in_at?->toIso8601String(),
            'trainer_attendance_status' => $r?->status ?? 'unrecorded', 'trainer_late_minutes' => (int) ($r?->late_minutes ?? 0),
            'status' => $s->status, 'realization_status' => $s->realization_status,
            'topic' => $s->topic, 'activity_notes' => $s->activity_notes,
            'student_present_count' => $s->student_present_count, 'student_eligible_count' => $memberCount,
        ];
    }

    private function summary(array $sessions): array
    {
        $active = array_values(array_filter($sessions, fn ($s) => $s['status'] !== 'cancelled'));
        $total = count($active);
        $present = count(array_filter($active, fn ($s) => $s['trainer_attendance_status'] === 'present'));
        $late = count(array_filter($active, fn ($s) => $s['trainer_attendance_status'] === 'late'));
        $absent = count(array_filter($active, fn ($s) => $s['trainer_attendance_status'] === 'absent'));
        $realized = count(array_filter($active, fn ($s) => $s['realization_status'] === 'submitted'));

        return [
            'total_sessions' => $total, 'present_count' => $present, 'late_count' => $late, 'absent_count' => $absent,
            'unrecorded_count' => $total - $present - $late - $absent,
            'substituted_count' => count(array_filter($active, fn ($s) => $s['is_substituted'])),
            'realized_sessions' => $realized,
            'realization_rate' => $total ? round($realized / $total * 100, 1) : 0,
            'punctuality_rate' => ($present + $late) ? round($present / ($present + $late) * 100, 1) : 0,
            'attendance_rate' => $total ? round(($present + $late) / $total * 100, 1) : 0,
        ];
    }

    private function reconcile(array $s): array
    {
        $attended = in_array($s['trainer_attendance_status'], ['present', 'late'], true);
        $reason = null;
        if (!$attended && $s['realization_status'] === 'submitted') $reason = 'Jurnal diisi tetapi pelatih tidak tercatat presensi';
        elseif ($attended && $s['realization_status'] !== 'submitted') $reason = 'Pelatih hadir tetapi jurnal latihan belum diisi';
        elseif ($s['student_present_count'] !== null && $s['student_eligible_count'] > 0 && $s['student_present_count'] > $s['student_eligible_count']) $reason = 'Jumlah santri hadir melebihi anggota aktif';

        return [
            'session_id' => $s['id'], 'extracurricular_name' => $s['extracurricular_name'],
            'trainer_name' => $s['actual_primary_staff_name'] ?? $s['primary_staff_name'] ?? '-',
            'trainer_attended' => $attended, 'students_present' => $s['student_present_count'] ?? 0,
            'students_eligible' => $s['student_eligible_count'], 'realization_status' => $s['realization_status'],
            'needs_review' => $reason !== null, 'review_reason' => $reason,
        ];
    }

    private function assignment(ExtracurricularStaffAssignment $a): array
    {
        $labels = ['coach' => 'Pelatih Utama', 'assistant_coach' => 'Asisten Pelatih', 'supervisor' => 'Pembina'];

        return [
            'id' => $a->id, 'extracurricular_id' => $a->extracurricular_id, 'extracurricular_name' => $a->extracurricular?->name,
            'staff_id' => $a->staff_profile_id, 'staff_name' => $a->staff?->name, 'staff_number' => $a->staff?->staff_number,
            'role' => $a->role, 'role_label' => $labels[$a->role] ?? $a->role, 'is_primary' => (bool) $a->is_primary,
            'start_date' => $a->start_date?->toDateString(), 'end_date' => $a->end_date?->toDateString(), 'is_active' => (bool) $a->is_active,
        ];
    }

    private function substitution(TrainerSubstitution $s): array
    {
        return [
            'id' => $s->id, 'extracurricular_id' => $s->extracurricular_id, 'extracurricular_name' => $s->extracurricular?->name,
            'date' => $s->date?->toDateString(), 'original_staff_id' => $s->original_staff_profile_id, 'original_staff_name' => $s->originalStaff?->name ?? '-',
            'substitute_staff_id' => $s->substitute_staff_profile_id, 'substitute_staff_name' => $s->substituteStaff?->name,
            'reason' => $s->reason, 'status' => $s->status,
        ];
    }
}
