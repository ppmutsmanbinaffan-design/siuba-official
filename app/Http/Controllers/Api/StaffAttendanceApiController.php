<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Transformers\SpaTransformer;
use App\Models\StaffAbsenceRequest;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Services\Security\AuditService;
use App\Services\Staff\StaffDailyAttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Presensi harian SDM & pengajuan izin/sakit/cuti/dinas SDM (sebelumnya hanya localStorage).
 */
class StaffAttendanceApiController extends Controller
{
    public function __construct(protected StaffDailyAttendanceService $service) {}

    public function daily(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date', 'type' => 'nullable|in:daily,teaching,training,all']);
        $date = $request->input('date', today()->toDateString());
        $type = $request->input('type', 'daily');

        $rows = StaffAttendanceRecord::with('staff')->whereDate('attendance_date', $date)
            ->when($type !== 'all', fn ($q) => $q->where('attendance_type', $type))
            ->orderBy('check_in_at')->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($r) => SpaTransformer::staffRecord($r))->values()]);
    }

    public function summary(Request $request): JsonResponse
    {
        $request->validate(['date' => 'nullable|date']);
        $date = Carbon::parse($request->input('date', today()->toDateString()));

        $expected = StaffProfile::where('is_active', true)->where('requires_daily_attendance', true)->count();
        $rows = StaffAttendanceRecord::whereDate('attendance_date', $date)->where('attendance_type', 'daily')->get();
        $count = fn (string $status) => $rows->where('status', $status)->count();
        $checkedIn = $rows->whereNotNull('check_in_at')->count();
        $checkedOut = $rows->whereNotNull('check_out_at')->count();
        $excused = $count('permission') + $count('sick') + $count('leave') + $count('official_duty');

        return response()->json(['success' => true, 'data' => [
            'date' => $date->toDateString(),
            'total_expected' => $expected,
            'total_present' => $count('present'),
            'total_late' => $count('late'),
            'total_permission' => $count('permission'),
            'total_sick' => $count('sick'),
            'total_leave' => $count('leave'),
            'total_official_duty' => $count('official_duty'),
            'total_alpha' => $count('absent'),
            'total_checked_in' => $checkedIn,
            'total_not_checked_in' => max(0, $expected - $checkedIn - $excused - $count('absent')),
            'total_checked_out' => $checkedOut,
            'total_not_checked_out' => max(0, $checkedIn - $checkedOut),
            'total_early_leave' => $rows->where('early_leave_minutes', '>', 0)->count(),
        ]]);
    }

    /** Scan QR / RFID / nomor SDM dari halaman scanner presensi SDM. */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => 'required|string|max:100',
            'method' => 'required|in:qr,rfid,manual',
        ]);

        $id = trim($data['identifier']);
        $staff = match ($data['method']) {
            'qr' => StaffProfile::where('qr_token', $id)->first(),
            'rfid' => StaffProfile::where('rfid_uid', Student::normalizeRfidUid($id))->first(),
            default => StaffProfile::where('staff_number', $id)->first() ?? (ctype_digit($id) ? StaffProfile::find((int) $id) : null),
        };

        return response()->json(['success' => true, 'data' => $this->scanPayload(
            $this->service->scan($staff, $data['method'], null, $request->user())
        )]);
    }

    /**
     * Presensi manual oleh operator.
     * - Tanpa jam/status eksplisit: diperlakukan seperti scan sekarang (masuk/pulang otomatis).
     * - Dengan date + jam/status + reason: entri susulan/khusus (misal lupa tap), dicatat di audit log.
     */
    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'staff_id' => 'required|integer|exists:staff_profiles,id',
            'action' => 'nullable|in:check_in,check_out,both',
            'notes' => 'nullable|string|max:500',
            'date' => 'nullable|date',
            'check_in_time' => 'nullable|date_format:H:i',
            'check_out_time' => 'nullable|date_format:H:i',
            'status' => ['nullable', Rule::in(StaffAttendanceRecord::STATUSES)],
            'reason' => 'nullable|string|max:500',
        ]);

        $staff = StaffProfile::find($data['staff_id']);
        $explicit = !empty($data['check_in_time']) || !empty($data['check_out_time']) || !empty($data['status']);

        if (!$explicit) {
            $result = $this->service->scan($staff, 'manual', null, $request->user(), null, $data['notes'] ?? null);

            return response()->json(['success' => true, 'data' => $this->scanPayload($result)]);
        }

        if (empty($data['reason'])) {
            return ApiResponse::validationError(['reason' => ['Alasan pencatatan manual wajib diisi.']]);
        }

        $date = Carbon::parse($data['date'] ?? today()->toDateString())->startOfDay();
        $sch = $this->service->schedule($date);
        $at = fn (?string $hm) => $hm ? Carbon::parse($date->toDateString() . ' ' . $hm . ':00') : null;
        $action = $data['action'] ?? 'both';
        $in = in_array($action, ['check_in', 'both'], true) ? $at($data['check_in_time'] ?? null) : null;
        $out = in_array($action, ['check_out', 'both'], true) ? $at($data['check_out_time'] ?? null) : null;

        $record = StaffAttendanceRecord::where('staff_profile_id', $staff->id)->whereDate('attendance_date', $date)
            ->where('attendance_type', 'daily')->where('context_key', 'daily')->first()
            ?? new StaffAttendanceRecord(['staff_profile_id' => $staff->id, 'attendance_date' => $date->toDateString(), 'attendance_type' => 'daily', 'context_key' => 'daily']);
        $old = $record->exists ? $record->only(['status', 'check_in_at', 'check_out_at']) : null;

        $late = 0;
        if ($in && !empty($sch['late_after']) && $in->gt($at($sch['late_after']))) {
            $late = (int) floor($at($sch['scheduled_start_at'])->diffInMinutes($in, true));
        }
        $early = 0;
        if ($out && !empty($sch['scheduled_end_at']) && $out->lt($at($sch['scheduled_end_at']))) {
            $early = (int) floor($out->diffInMinutes($at($sch['scheduled_end_at']), true));
        }

        $record->fill(array_filter([
            'status' => $data['status'] ?? ($late > 0 ? 'late' : 'present'),
            'check_in_at' => $in,
            'check_in_method' => $in ? 'manual' : null,
            'check_out_at' => $out,
            'check_out_method' => $out ? 'manual' : null,
            'late_minutes' => $in ? min(65535, $late) : 0,
            'early_leave_minutes' => $out ? $early : null,
            'scheduled_start_at' => !empty($sch['scheduled_start_at']) ? $at($sch['scheduled_start_at']) : null,
            'scheduled_end_at' => !empty($sch['scheduled_end_at']) ? $at($sch['scheduled_end_at']) : null,
            'recorded_by' => $request->user()?->id,
            'recorded_by_name' => $request->user()?->name,
            'notes' => 'Manual: ' . $data['reason'],
        ], fn ($v) => $v !== null))->save();

        $this->audit('staff_attendance.manual_entry', $record->id, $old, $record->only(['status', 'check_in_at', 'check_out_at']), $data['reason'], $request);

        return response()->json(['success' => true, 'data' => [
            'success' => true,
            'code' => 'MANUAL_SAVED',
            'message' => "Presensi manual {$staff->name} tanggal {$date->toDateString()} berhasil disimpan.",
            'record' => SpaTransformer::staffRecord($record->fresh('staff')),
            'staff' => SpaTransformer::staff($staff),
        ]]);
    }

    /** Jadwal kerja mingguan SDM + hari libur 60 hari ke depan. */
    public function workSchedule(): JsonResponse
    {
        $from = today();
        $holidays = \App\Models\AcademicCalendarEvent::where('type', 'holiday')
            ->whereDate('end_date', '>=', $from->toDateString())
            ->whereDate('start_date', '<=', $from->copy()->addDays(60)->toDateString())
            ->orderBy('start_date')->get()
            ->map(fn ($e) => ['name' => $e->name, 'start_date' => $e->start_date?->toDateString(), 'end_date' => $e->end_date?->toDateString()])
            ->values();

        return response()->json(['success' => true, 'data' => [
            'days' => $this->service->weeklySchedule(),
            'upcoming_holidays' => $holidays,
            'customized' => \App\Models\AppSetting::get('staff_schedule') !== null,
        ]]);
    }

    /** Simpan jadwal kerja mingguan (berlaku untuk perhitungan terlambat di server). */
    public function updateWorkSchedule(Request $request): JsonResponse
    {
        $rules = [];
        foreach (StaffDailyAttendanceService::DAYS as $d) {
            $rules["days.$d"] = 'required|array';
            $rules["days.$d.working"] = 'required|boolean';
            foreach (StaffDailyAttendanceService::SCHEDULE_FIELDS as $f) {
                $rules["days.$d.$f"] = 'required|date_format:H:i';
            }
        }
        $data = $request->validate($rules);

        $labels = ['monday' => 'Senin', 'tuesday' => 'Selasa', 'wednesday' => 'Rabu', 'thursday' => 'Kamis', 'friday' => 'Jumat', 'saturday' => 'Sabtu', 'sunday' => 'Ahad'];
        $clean = [];
        foreach (StaffDailyAttendanceService::DAYS as $d) {
            $row = $data['days'][$d];
            $seq = array_map(fn ($f) => $row[$f], StaffDailyAttendanceService::SCHEDULE_FIELDS);
            $sorted = $seq;
            sort($sorted);
            if ($row['working'] && $seq !== $sorted) {
                return ApiResponse::error('INVALID_SCHEDULE', "Jadwal {$labels[$d]} tidak urut: buka presensi ≤ jam masuk ≤ batas terlambat ≤ jam pulang ≤ tutup presensi.", null, 422);
            }
            $clean[$d] = ['working' => (bool) $row['working']] + array_combine(StaffDailyAttendanceService::SCHEDULE_FIELDS, $seq);
        }

        $old = $this->service->weeklySchedule();
        \App\Models\AppSetting::put('staff_schedule', $clean, $request->user()?->id);
        AuditService::log(event: 'staff_work_schedule_updated', auditableType: 'StaffWorkSchedule', auditableId: 0, oldValues: $old, newValues: $clean, reason: 'Perubahan jadwal kerja SDM', userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => 'Jadwal kerja SDM disimpan dan langsung berlaku untuk presensi.', 'data' => ['days' => $this->service->weeklySchedule()]]);
    }

    /** Tandai alpa SDM yang wajib hadir tetapi tidak punya catatan pada tanggal tersebut. */
    public function finalize(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date|before_or_equal:today']);
        $date = Carbon::parse($data['date'])->startOfDay();

        $sch = $this->service->schedule($date);
        if (empty($sch['working'])) {
            return response()->json(['success' => true, 'data' => ['marked' => 0], 'message' => !empty($sch['holiday'])
                ? "Hari libur ({$sch['holiday']}); tidak ada yang ditandai alpa."
                : 'Bukan hari kerja; tidak ada yang ditandai alpa.']);
        }

        $done = StaffAttendanceRecord::whereDate('attendance_date', $date)->where('attendance_type', 'daily')->pluck('staff_profile_id');
        $missing = StaffProfile::where('is_active', true)->where('requires_daily_attendance', true)->whereNotIn('id', $done)->get();

        foreach ($missing as $staff) {
            StaffAttendanceRecord::create([
                'staff_profile_id' => $staff->id,
                'attendance_date' => $date->toDateString(),
                'attendance_type' => 'daily',
                'context_key' => 'daily',
                'status' => 'absent',
                'recorded_by' => $request->user()?->id,
                'recorded_by_name' => $request->user()?->name,
                'notes' => 'Finalisasi: tanpa keterangan',
            ]);
        }
        $this->audit('staff_attendance.finalized', 0, null, ['date' => $date->toDateString(), 'marked_absent' => $missing->count()], null, $request);

        return response()->json([
            'success' => true,
            'message' => "Finalisasi {$date->toDateString()}: {$missing->count()} SDM ditandai alpa.",
            'data' => ['marked' => $missing->count()],
        ]);
    }

    public function correct(Request $request, StaffAttendanceRecord $record): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(StaffAttendanceRecord::STATUSES)],
            'late_minutes' => 'nullable|integer|min:0|max:1440',
            'early_leave_minutes' => 'nullable|integer|min:0|max:1440',
            'check_in_at' => 'nullable|date',
            'check_out_at' => 'nullable|date',
            'notes' => 'required|string|min:3|max:500',
        ], ['notes.required' => 'Alasan koreksi wajib diisi.']);

        $old = $record->only(['status', 'late_minutes', 'early_leave_minutes', 'notes', 'check_in_at', 'check_out_at']);
        $record->update(array_filter([
            'status' => $data['status'],
            'late_minutes' => $data['late_minutes'] ?? $record->late_minutes,
            'early_leave_minutes' => $data['early_leave_minutes'] ?? $record->early_leave_minutes,
            'check_in_at' => !empty($data['check_in_at']) ? Carbon::parse($data['check_in_at']) : null,
            'check_out_at' => !empty($data['check_out_at']) ? Carbon::parse($data['check_out_at']) : null,
            'notes' => $data['notes'],
        ], fn ($v) => $v !== null));

        $this->audit('staff_attendance.corrected', $record->id, $old, $record->only(array_keys($old)), $data['notes'], $request);

        return response()->json(['success' => true, 'message' => 'Koreksi presensi harian berhasil disimpan.', 'data' => SpaTransformer::staffRecord($record->fresh('staff'))]);
    }

    // ------------------------------------------------------------------ Pengajuan izin SDM

    public function absences(Request $request): JsonResponse
    {
        $request->validate(['status' => 'nullable|in:pending,approved,rejected,cancelled', 'from' => 'nullable|date', 'to' => 'nullable|date']);
        $from = Carbon::parse($request->input('from', today()->subDays(60)->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', today()->addDays(60)->toDateString()))->endOfDay();

        $rows = StaffAbsenceRequest::with('staff')
            ->where('start_at', '<=', $to)->where('end_at', '>=', $from)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('created_at')->limit(1000)->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($a) => SpaTransformer::staffAbsence($a))->values()]);
    }

    public function storeAbsence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'staff_id' => 'required|integer|exists:staff_profiles,id',
            'type' => ['required', Rule::in(StaffAbsenceRequest::TYPES)],
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
            'reason' => 'required|string|max:500',
        ]);

        if (Carbon::parse($data['start_at'])->diffInDays(Carbon::parse($data['end_at']), true) > 92) {
            return ApiResponse::error('ABSENCE_TOO_LONG', 'Rentang pengajuan maksimal 92 hari.', null, 422);
        }

        $absence = StaffAbsenceRequest::create([
            'staff_profile_id' => $data['staff_id'],
            'type' => $data['type'],
            'start_at' => Carbon::parse($data['start_at']),
            'end_at' => Carbon::parse($data['end_at']),
            'reason' => $data['reason'],
            'status' => 'pending',
            'requested_by' => $request->user()?->id,
        ]);
        $absence->load('staff');

        return response()->json([
            'success' => true,
            'message' => "Pengajuan {$absence->type} untuk {$absence->staff?->name} berhasil diajukan.",
            'data' => SpaTransformer::staffAbsence($absence),
        ], 201);
    }

    public function approveAbsence(Request $request, StaffAbsenceRequest $absence): JsonResponse
    {
        $request->validate(['notes' => 'nullable|string|max:500']);
        if ($absence->status !== 'pending') {
            return ApiResponse::error('INVALID_ABSENCE_TRANSITION', "Pengajuan berstatus '{$absence->status}' tidak dapat disetujui.", null, 409);
        }

        $days = DB::transaction(function () use ($absence, $request) {
            $absence->update([
                'status' => 'approved',
                'decided_by' => $request->user()?->id,
                'decided_by_name' => $request->user()?->name,
                'decided_at' => now(),
                'decision_notes' => $request->input('notes'),
            ]);

            return $this->service->applyApprovedAbsence($absence, $request->user());
        });

        $this->audit('staff_absence.approved', $absence->id, null, ['days_marked' => $days], $request->input('notes'), $request);

        return response()->json([
            'success' => true,
            'message' => "Pengajuan {$absence->type} untuk {$absence->staff?->name} disetujui ({$days} hari kerja ditandai).",
            'data' => SpaTransformer::staffAbsence($absence->fresh('staff')),
        ]);
    }

    public function rejectAbsence(Request $request, StaffAbsenceRequest $absence): JsonResponse
    {
        $data = $request->validate(['rejection_reason' => 'required|string|max:500'], ['rejection_reason.required' => 'Alasan penolakan wajib diisi.']);
        if ($absence->status !== 'pending') {
            return ApiResponse::error('INVALID_ABSENCE_TRANSITION', "Pengajuan berstatus '{$absence->status}' tidak dapat ditolak.", null, 409);
        }

        $absence->update([
            'status' => 'rejected',
            'decided_by' => $request->user()?->id,
            'decided_by_name' => $request->user()?->name,
            'decided_at' => now(),
            'decision_notes' => $data['rejection_reason'],
        ]);
        $this->audit('staff_absence.rejected', $absence->id, null, null, $data['rejection_reason'], $request);

        return response()->json([
            'success' => true,
            'message' => "Pengajuan {$absence->type} untuk {$absence->staff?->name} telah ditolak.",
            'data' => SpaTransformer::staffAbsence($absence->fresh('staff')),
        ]);
    }

    // ------------------------------------------------------------------ Helper

    private function scanPayload(array $r): array
    {
        $record = $r['record'] ?? null;
        $staff = $r['staff'] ?? null;

        return [
            'success' => $r['success'],
            'code' => $r['code'],
            'message' => $r['message'],
            'mode' => $r['mode'] ?? null,
            'record' => $record ? SpaTransformer::staffRecord($record->loadMissing('staff')) : null,
            'staff' => $staff ? SpaTransformer::staff($staff) : null,
        ];
    }

    private function audit(string $event, int $id, ?array $old, ?array $new, ?string $reason, Request $request): void
    {
        try {
            AuditService::log(event: $event, auditableType: 'StaffAttendance', auditableId: $id, oldValues: $old, newValues: $new, reason: $reason, userId: $request->user()?->id);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
