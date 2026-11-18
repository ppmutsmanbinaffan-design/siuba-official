<?php

namespace App\Services\Staff;

use App\Models\AcademicCalendarEvent;
use App\Models\AppSetting;
use App\Models\AttendanceDevice;
use App\Models\StaffAbsenceRequest;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Presensi harian SDM (check-in / check-out) — dipakai scanner QR, input manual, dan tap RFID ESP32.
 *
 * Kode hasil (sama dengan aplikasi React): CHECK_IN_SUCCESS, CHECK_OUT_SUCCESS, ALREADY_CHECKED_OUT,
 * STAFF_NOT_FOUND, STAFF_INACTIVE, NOT_WORKING_DAY, CHECK_IN_NOT_OPEN, CHECK_IN_CLOSED,
 * ON_APPROVED_ABSENCE, TOO_SOON_TO_CHECK_OUT.
 */
class StaffDailyAttendanceService
{
    public const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    public const SCHEDULE_FIELDS = ['check_in_open_at', 'scheduled_start_at', 'late_after', 'scheduled_end_at', 'check_out_close_at'];

    /**
     * Jadwal kerja mingguan efektif: bawaan config/siuba.php, ditimpa pengaturan yang disimpan admin
     * (menu Presensi SDM → Jadwal Kerja, tersimpan di app_settings "staff_schedule").
     *
     * @return array<string, array<string, mixed>>
     */
    public function weeklySchedule(): array
    {
        $custom = AppSetting::get('staff_schedule');
        $out = [];
        foreach (self::DAYS as $day) {
            $base = config("siuba.staff_schedule.{$day}") ?? ['working' => false];
            $override = is_array($custom) && is_array($custom[$day] ?? null) ? $custom[$day] : [];
            $out[$day] = array_merge($base, array_intersect_key($override, array_flip([...self::SCHEDULE_FIELDS, 'working'])));
            $out[$day]['working'] = (bool) ($out[$day]['working'] ?? false);
        }

        return $out;
    }

    /** Hari libur kalender akademik (tipe "holiday") yang mencakup tanggal ini. */
    public function holidayOn(Carbon $date): ?AcademicCalendarEvent
    {
        return AcademicCalendarEvent::where('type', 'holiday')
            ->whereDate('start_date', '<=', $date->toDateString())
            ->whereDate('end_date', '>=', $date->toDateString())
            ->orderBy('start_date')
            ->first();
    }

    public function schedule(Carbon $date): array
    {
        $day = strtolower($date->englishDayOfWeek);
        $sch = $this->weeklySchedule()[$day] ?? ['working' => false];
        if (!empty($sch['working']) && ($holiday = $this->holidayOn($date))) {
            $sch['working'] = false;
            $sch['holiday'] = $holiday->name;
        }

        return $sch;
    }

    /**
     * @return array{success: bool, code: string, message: string, mode?: string, record?: StaffAttendanceRecord, staff?: StaffProfile}
     */
    public function scan(
        ?StaffProfile $staff,
        string $method,
        ?Carbon $at = null,
        ?User $operator = null,
        ?AttendanceDevice $device = null,
        ?string $notes = null
    ): array {
        $at = $at ?? now();

        if (!$staff) {
            return $this->fail('STAFF_NOT_FOUND', 'Data SDM tidak ditemukan untuk kartu/QR yang dipindai.');
        }
        if (!$staff->is_active) {
            return $this->fail('STAFF_INACTIVE', "{$staff->name} berstatus tidak aktif.", $staff);
        }

        $date = $at->copy()->startOfDay();
        $sch = $this->schedule($date);
        $time = fn (string $hm) => Carbon::parse($date->toDateString() . ' ' . $hm . ':00');

        return DB::transaction(function () use ($staff, $method, $at, $operator, $device, $notes, $date, $sch, $time) {
            $record = StaffAttendanceRecord::where('staff_profile_id', $staff->id)
                ->whereDate('attendance_date', $date)
                ->where('attendance_type', 'daily')->where('context_key', 'daily')
                ->lockForUpdate()
                ->first();

            // ---------- CHECK-IN ----------
            if (!$record || !$record->check_in_at) {
                if (empty($sch['working'])) {
                    return $this->fail('NOT_WORKING_DAY', !empty($sch['holiday']) ? "Hari ini libur: {$sch['holiday']}." : 'Hari ini bukan hari kerja.', $staff);
                }
                $absence = StaffAbsenceRequest::where('staff_profile_id', $staff->id)->where('status', 'approved')
                    ->where('start_at', '<=', $date->copy()->endOfDay())->where('end_at', '>=', $date)->first();
                if ($absence) {
                    return $this->fail('ON_APPROVED_ABSENCE', "{$staff->name} sedang {$absence->type} (pengajuan disetujui).", $staff);
                }
                if ($at->lt($time($sch['check_in_open_at']))) {
                    return $this->fail('CHECK_IN_NOT_OPEN', "Presensi masuk baru dibuka pukul {$sch['check_in_open_at']}.", $staff);
                }
                if ($at->gt($time($sch['check_out_close_at']))) {
                    return $this->fail('CHECK_IN_CLOSED', 'Waktu presensi hari ini sudah ditutup.', $staff);
                }

                $start = $time($sch['scheduled_start_at']);
                $late = $at->gt($time($sch['late_after']));
                $lateMinutes = $late ? max(1, (int) floor($start->diffInMinutes($at, true))) : 0;

                $attrs = [
                    'status' => $late ? 'late' : 'present',
                    'scheduled_start_at' => $start,
                    'scheduled_end_at' => $time($sch['scheduled_end_at']),
                    'check_in_at' => $at,
                    'check_in_method' => $method,
                    'late_minutes' => min(65535, $lateMinutes),
                    'attendance_device_id' => $device?->id,
                    'recorded_by' => $operator?->id,
                    'recorded_by_name' => $operator?->name ?? ($device ? $device->device_code : 'Scanner'),
                    'notes' => $notes ?? ($late ? "Terlambat {$lateMinutes} menit" : 'Tepat waktu'),
                ];

                if ($record) {
                    $record->update($attrs);
                } else {
                    $record = StaffAttendanceRecord::create($attrs + [
                        'staff_profile_id' => $staff->id,
                        'attendance_date' => $date->toDateString(),
                        'attendance_type' => 'daily',
                        'context_key' => 'daily',
                    ]);
                }

                return [
                    'success' => true,
                    'code' => 'CHECK_IN_SUCCESS',
                    'mode' => 'CHECK_IN',
                    'message' => "Check-in berhasil: {$staff->name} (" . ($late ? "Terlambat {$lateMinutes}m" : 'Hadir Tepat Waktu') . ')',
                    'record' => $record->fresh('staff'),
                    'staff' => $staff,
                ];
            }

            // ---------- TAP OFFLINE YANG LEBIH AWAL DARI CHECK-IN TERCATAT ----------
            // Terjadi bila tap masuk dicatat offline lalu baru terkirim setelah tap lain di perangkat online.
            // Tap paling awal adalah jam masuk yang sebenarnya.
            if ($at->lt($record->check_in_at)) {
                if ($at->lt($time($sch['check_in_open_at'] ?? '00:00'))) {
                    return $this->fail('CHECK_IN_NOT_OPEN', "Presensi masuk baru dibuka pukul {$sch['check_in_open_at']}.", $staff, $record);
                }
                $start = $time($sch['scheduled_start_at'] ?? '07:00');
                $late = isset($sch['late_after']) && $at->gt($time($sch['late_after']));
                $lateMinutes = $late ? max(1, (int) floor($start->diffInMinutes($at, true))) : 0;
                $minGap = (int) config('siuba.staff_min_minutes_before_checkout', 30);
                $prevIn = $record->check_in_at->copy();
                $attrs = [
                    'status' => in_array($record->status, ['present', 'late', 'absent'], true) ? ($late ? 'late' : 'present') : $record->status,
                    'check_in_at' => $at,
                    'check_in_method' => $method,
                    'late_minutes' => min(65535, $lateMinutes),
                ];
                $mode = 'CHECK_IN';
                if (!$record->check_out_at && $at->diffInMinutes($prevIn, true) >= $minGap) {
                    // tap yang dulu dianggap "masuk" sebenarnya tap pulang
                    $end = $time($sch['scheduled_end_at'] ?? '16:00');
                    $early = $prevIn->lt($end) ? (int) floor($prevIn->diffInMinutes($end, true)) : 0;
                    $attrs += ['check_out_at' => $prevIn, 'check_out_method' => $record->check_in_method, 'early_leave_minutes' => min(65535, $early)];
                }
                $attrs['notes'] = trim(($record->notes ? $record->notes . ' | ' : '') . 'Jam masuk dikoreksi dari tap offline ' . $at->format('H:i'));
                $record->update($attrs);

                return [
                    'success' => true,
                    'code' => 'CHECK_IN_CORRECTED',
                    'mode' => $mode,
                    'message' => "Jam masuk {$staff->name} dikoreksi ke {$at->format('H:i')} (tap offline lebih awal)" . ($late ? " — terlambat {$lateMinutes}m" : '') . '.',
                    'record' => $record->fresh('staff'),
                    'staff' => $staff,
                ];
            }

            // ---------- CHECK-OUT ----------
            if ($record->check_out_at) {
                return $this->fail('ALREADY_CHECKED_OUT', "{$staff->name} sudah check-out pukul {$record->check_out_at->format('H:i')}.", $staff, $record);
            }
            $minGap = (int) config('siuba.staff_min_minutes_before_checkout', 30);
            if ($record->check_in_at->diffInMinutes($at, true) < $minGap) {
                return $this->fail('TOO_SOON_TO_CHECK_OUT', "{$staff->name} sudah check-in pukul {$record->check_in_at->format('H:i')}.", $staff, $record);
            }

            $end = $time($sch['scheduled_end_at'] ?? '16:00');
            $early = $at->lt($end) ? (int) floor($at->diffInMinutes($end, true)) : 0;
            $record->update([
                'check_out_at' => $at,
                'check_out_method' => $method,
                'early_leave_minutes' => min(65535, $early),
                'notes' => trim(($record->notes ? $record->notes . ' | ' : '') . ($early > 0 ? "Pulang cepat {$early} menit" : 'Pulang sesuai jadwal')),
            ]);

            return [
                'success' => true,
                'code' => 'CHECK_OUT_SUCCESS',
                'mode' => 'CHECK_OUT',
                'message' => "Check-out berhasil: {$staff->name} (" . ($early > 0 ? "Pulang awal {$early}m" : 'Selesai Jam Kerja') . ')',
                'record' => $record->fresh('staff'),
                'staff' => $staff,
            ];
        });
    }

    /** Tandai hari-hari dalam pengajuan yang disetujui sebagai izin/sakit/cuti/dinas. */
    public function applyApprovedAbsence(StaffAbsenceRequest $req, ?User $operator = null): int
    {
        $count = 0;
        $day = $req->start_at->copy()->startOfDay();
        $last = $req->end_at->copy()->startOfDay();
        $guard = 0;

        while ($day->lte($last) && $guard++ < 92) {
            if (!empty($this->schedule($day)['working'])) {
                $record = StaffAttendanceRecord::where('staff_profile_id', $req->staff_profile_id)
                    ->whereDate('attendance_date', $day)->where('attendance_type', 'daily')->where('context_key', 'daily')
                    ->first()
                    ?? new StaffAttendanceRecord([
                        'staff_profile_id' => $req->staff_profile_id,
                        'attendance_date' => $day->toDateString(),
                        'attendance_type' => 'daily',
                        'context_key' => 'daily',
                    ]);
                // Jangan timpa hari yang sudah benar-benar hadir
                if (!$record->exists || !$record->check_in_at) {
                    $record->fill([
                        'status' => $req->type,
                        'recorded_by' => $operator?->id,
                        'recorded_by_name' => $operator?->name,
                        'notes' => 'Pengajuan ' . strtoupper($req->type) . ': ' . $req->reason,
                    ])->save();
                    $count++;
                }
            }
            $day->addDay();
        }

        return $count;
    }

    /**
     * Presensi mengajar: dicatat saat guru membuka (masuk) dan menutup (selesai) sesi KBM.
     * Satu catatan per guru per sesi (attendance_type 'teaching', context_key = id sesi).
     */
    public function recordTeaching(\App\Models\AttendanceSession $session, string $action, ?User $operator = null): ?StaffAttendanceRecord
    {
        $context = \App\Models\AcademicSessionContext::where('attendance_session_id', $session->id)->first();
        if (!$context) {
            return null;
        }
        $teacherUserId = $context->teaching_teacher_id ?: $context->scheduled_teacher_id;
        $staff = StaffProfile::where('user_id', $teacherUserId)->first();
        if (!$staff) {
            return null; // guru belum punya profil SDM
        }

        $record = StaffAttendanceRecord::firstOrNew([
            'staff_profile_id' => $staff->id,
            'attendance_type' => 'teaching',
            'context_key' => 'session:' . $session->id,
        ]);
        $now = now();

        if ($action === 'open' && !$record->check_in_at) {
            $grace = 10;
            $late = $session->start_at && $now->gt($session->start_at->copy()->addMinutes($grace))
                ? (int) floor($session->start_at->diffInMinutes($now, true)) : 0;
            $record->fill([
                'attendance_date' => $session->session_date?->toDateString() ?? $now->toDateString(),
                'status' => $late > 0 ? 'late' : 'present',
                'scheduled_start_at' => $session->start_at,
                'scheduled_end_at' => $session->end_at,
                'check_in_at' => $now,
                'check_in_method' => 'manual',
                'late_minutes' => min(65535, $late),
                'recorded_by' => $operator?->id,
                'recorded_by_name' => $operator?->name,
                'notes' => ($context->teaching_teacher_id && $context->teaching_teacher_id !== $context->scheduled_teacher_id ? 'Guru pengganti. ' : '')
                    . ($late > 0 ? "Membuka kelas terlambat {$late} menit" : 'Membuka kelas tepat waktu'),
                'metadata' => ['session_id' => $session->id, 'session_code' => $session->session_code],
            ])->save();
        } elseif ($action === 'close' && $record->exists && !$record->check_out_at) {
            $early = $session->end_at && $now->lt($session->end_at) ? (int) floor($now->diffInMinutes($session->end_at, true)) : 0;
            $record->update(['check_out_at' => $now, 'check_out_method' => 'manual', 'early_leave_minutes' => min(65535, $early)]);
        }

        return $record->exists ? $record : null;
    }

    private function fail(string $code, string $message, ?StaffProfile $staff = null, ?StaffAttendanceRecord $record = null): array
    {
        return array_filter(['success' => false, 'code' => $code, 'message' => $message, 'staff' => $staff, 'record' => $record], fn ($v) => $v !== null);
    }
}
