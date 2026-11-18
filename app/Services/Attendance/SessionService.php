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

        // Batas "hadir tepat waktu" belum ditentukan → pakai toleransi kegiatan / toleransi global
        if ($startAt && !$presentUntil) {
            $presentUntil = Carbon::parse($startAt, 'Asia/Jakarta')->addMinutes(self::toleranceFor($activity));
        }
        if ($presentUntil && !$lateUntil && $endAt) {
            $lateUntil = Carbon::parse($endAt, 'Asia/Jakarta');
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
    public function closeSession(AttendanceSession $session, ?User $operator = null): AttendanceSession
    {
        if (!$session->status->canTransitionTo(SessionStatus::CLOSED)) {
            throw new InvalidArgumentException(
                "Sesi dalam status '{$session->status->label()}' tidak dapat ditutup."
            );
        }

        $session->update([
            'status' => SessionStatus::CLOSED,
            'closed_by' => $operator?->id,
            'closed_at' => Carbon::now('Asia/Jakarta'),
        ]);

        return $session->fresh();
    }

    /**
     * Saat sesi ditutup: peserta yang belum tercatat otomatis diberi status — sesuai izin yang disetujui
     * (sakit/izin/dispensasi) atau alpa. Sama seperti perilaku aplikasi lama, kini di server.
     */
    public function finalizeUnrecorded(AttendanceSession $session, ?User $operator = null): int
    {
        $recorded = \App\Models\AttendanceRecord::where('attendance_session_id', $session->id)->pluck('student_id');
        $pending = \App\Models\AttendanceSessionParticipant::where('attendance_session_id', $session->id)
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
                \App\Models\AttendanceRecord::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => $exc ? (\App\Enums\AttendanceStatus::tryFrom($exc->type) ?? \App\Enums\AttendanceStatus::ABSENT) : \App\Enums\AttendanceStatus::ABSENT,
                    'method' => \App\Enums\AttendanceMethod::MANUAL,
                    'check_in_at' => null,
                    'late_minutes' => 0,
                    'recorded_by' => $operator?->id,
                    'notes' => $exc ? 'Otomatis saat sesi ditutup (izin disetujui)' : ($operator ? 'Otomatis saat sesi ditutup (tanpa keterangan)' : 'Otomatis saat sesi ditutup otomatis oleh sistem (tanpa keterangan)'),
                    'metadata' => ['auto_finalized' => true],
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException) {
                // sudah tercatat oleh proses lain
            }
        }

        return $pending->count();
    }


    /**
     * Toleransi terlambat (menit) yang berlaku: milik kegiatan bila ada, selain itu
     * Pengaturan Sistem → Aturan Absensi → Toleransi Terlambat.
     */
    public static function toleranceFor(?Activity $activity = null): int
    {
        if ($activity && $activity->late_tolerance_minutes !== null) {
            return max(0, (int) $activity->late_tolerance_minutes);
        }

        return max(0, (int) (\App\Models\AppSetting::get('attendance')['late_tolerance_minutes'] ?? 15));
    }

    /**
     * Penutupan otomatis (Pengaturan → Aturan Absensi → Auto-Close).
     * Sesi berstatus "dibuka" yang waktu selesainya sudah lewat N menit ditutup,
     * dan peserta yang belum tercatat ditandai Alpa (atau sesuai izin yang disetujui).
     * N = 0 berarti fitur nonaktif.
     *
     * @return array{closed:int, finalized:int, sessions:array<int,string>}
     */
    /**
     * Buka otomatis sesi DRAF dari Jadwal Rutin yang jam mulainya sudah tiba dan belum selesai.
     * Berlaku bila Pengaturan → Aturan Absensi "Buka sesi otomatis" aktif, atau jadwalnya ditandai auto_open.
     * Sesi KBM/event (tanpa jadwal rutin) tidak disentuh — dibuka oleh guru/panitia.
     *
     * @return array{opened:int, sessions:string[]}
     */
    public function autoOpenDue(?Carbon $now = null): array
    {
        $now ??= Carbon::now('Asia/Jakarta');
        $global = (bool) (\App\Models\AppSetting::get('attendance')['auto_open_scheduled_sessions'] ?? true);
        $result = ['opened' => 0, 'sessions' => []];

        $sessions = AttendanceSession::with('schedule')
            ->where('status', SessionStatus::DRAFT)
            ->whereNotNull('activity_schedule_id')
            ->where('start_at', '<=', $now)
            ->where('end_at', '>', $now)
            ->orderBy('start_at')
            ->limit(200)
            ->get();

        foreach ($sessions as $session) {
            if (!$global && !($session->schedule?->auto_open)) {
                continue;
            }
            $session->update(['status' => SessionStatus::OPEN, 'opened_by' => null, 'opened_at' => $now->copy()]);
            $result['opened']++;
            $result['sessions'][] = $session->session_code;
        }

        if ($result['opened'] > 0) {
            try {
                \App\Models\AuditLog::create([
                    'event' => 'attendance.session.auto_opened',
                    'auditable_type' => AttendanceSession::class,
                    'new_values' => $result,
                    'reason' => "Sistem membuka otomatis {$result['opened']} sesi sesuai jam mulai jadwal.",
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // audit tidak boleh menggagalkan pembukaan
            }
        }

        return $result;
    }

    public function autoCloseExpired(?int $minutes = null, ?Carbon $now = null): array
    {
        $minutes ??= (int) (\App\Models\AppSetting::get('attendance')['auto_close_session_minutes'] ?? 0);
        $result = ['closed' => 0, 'finalized' => 0, 'sessions' => []];
        if ($minutes <= 0) {
            return $result;
        }
        $cutoff = ($now ?? Carbon::now('Asia/Jakarta'))->copy()->subMinutes($minutes);

        $sessions = AttendanceSession::where('status', SessionStatus::OPEN)
            ->whereNotNull('end_at')
            ->where('end_at', '<=', $cutoff)
            ->orderBy('end_at')
            ->limit(200)
            ->get();

        foreach ($sessions as $session) {
            try {
                $closed = DB::transaction(function () use ($session) {
                    $closed = $this->closeSession($session, null);
                    $finalized = $this->finalizeUnrecorded($closed, null);
                    return [$closed, $finalized];
                });
                app(\App\Services\Staff\StaffDailyAttendanceService::class)->recordTeaching($closed[0], 'close', null);
                $result['closed']++;
                $result['finalized'] += $closed[1];
                $result['sessions'][] = $session->session_code;
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Auto-close sesi gagal', ['session' => $session->id, 'error' => $e->getMessage()]);
            }
        }

        if ($result['closed'] > 0) {
            try {
                \App\Models\AuditLog::create([
                    'event' => 'attendance.session.auto_closed',
                    'auditable_type' => AttendanceSession::class,
                    'new_values' => $result,
                    'reason' => "Sistem menutup otomatis {$result['closed']} sesi; {$result['finalized']} peserta ditandai sesuai izin/Alpa.",
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // audit tidak boleh menggagalkan penutupan
            }
        }

        return $result;
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
            'closed_by' => $operator?->id,
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
