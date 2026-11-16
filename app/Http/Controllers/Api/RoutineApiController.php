<?php

namespace App\Http\Controllers\Api;

use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Transformers\SpaTransformer;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivityParticipantRule;
use App\Models\ActivitySchedule;
use App\Models\ActivitySupervisor;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\PrayerTimeCalendar;
use App\Models\RoutineScheduleOverride;
use App\Services\Participant\ActivityParticipantResolver;
use App\Services\Routine\RoutineSessionGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Master kegiatan, jadwal rutin, kalender shalat, penanggung jawab kegiatan,
 * generate sesi rutin dan pembuatan sesi manual untuk aplikasi React.
 */
class RoutineApiController extends Controller
{
    private const DAYS = ['sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6];

    private const PARTICIPANT_TYPES = ['all_students', 'classroom', 'dormitory', 'room', 'individual', 'extracurricular', 'custom_group', 'halaqah', 'duty_roster'];

    /** Kolom target di objek Activity versi aplikasi untuk tiap jenis peserta. */
    private const TARGET_FIELDS = [
        'classroom' => 'classroom_id', 'dormitory' => 'dormitory_id', 'room' => 'dormitory_room_id',
        'extracurricular' => 'extracurricular_id', 'custom_group' => 'student_group_id', 'halaqah' => 'halaqah_id',
    ];

    // ================================================================== Ringkasan

    public function master(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => [
            'categories' => ActivityCategory::orderBy('sort_order')->orderBy('id')->get()->map(fn ($c) => [
                'id' => $c->id, 'code' => $c->code, 'name' => $c->name, 'description' => $c->description ?? '',
                'icon' => $c->icon ?? 'calendar', 'is_active' => (bool) $c->is_active, 'sort_order' => (int) $c->sort_order,
            ])->values(),
            'activities' => Activity::with('category')->orderBy('name')->get()->map(fn ($a) => $this->activity($a))->values(),
            'routine_schedules' => ActivitySchedule::with('activity')->orderBy('start_time')->get()->map(fn ($s) => $this->schedule($s))->values(),
            'routine_overrides' => RoutineScheduleOverride::whereDate('date', '>=', today()->subDays(30))->orderBy('date')->get()
                ->map(fn ($o) => $this->override($o))->values(),
            'prayer_calendars' => PrayerTimeCalendar::whereDate('date', '>=', today()->subDays(30))->orderBy('date')->limit(400)->get()
                ->map(fn ($p) => $this->prayer($p))->values(),
            'supervisors' => ActivitySupervisor::with('user')->get()->map(fn ($s) => [
                'id' => $s->id, 'activity_id' => $s->activity_id, 'user_id' => $s->user_id, 'user_name' => $s->user?->name,
                'role_type' => $s->role_type, 'is_active' => (bool) $s->is_active, 'created_at' => $s->created_at?->toDateString(),
            ])->values(),
        ]]);
    }

    // ================================================================== Kegiatan

    public function storeActivity(Request $request): JsonResponse
    {
        $data = $this->validateActivity($request, true);
        $activity = DB::transaction(function () use ($data) {
            $a = Activity::create($data['attributes']);
            $this->syncManagedRule($a);

            return $a;
        });

        return response()->json(['success' => true, 'message' => "Kegiatan '{$activity->name}' berhasil didaftarkan.", 'data' => $this->activity($activity->load('category'))], 201);
    }

    public function updateActivity(Request $request, Activity $activity): JsonResponse
    {
        $data = $this->validateActivity($request, false, $activity);
        DB::transaction(function () use ($activity, $data) {
            $activity->update($data['attributes']);
            $this->syncManagedRule($activity);
        });

        return response()->json(['success' => true, 'message' => 'Kegiatan berhasil diperbarui.', 'data' => $this->activity($activity->fresh('category'))]);
    }

    public function deleteActivity(Activity $activity): JsonResponse
    {
        if ($activity->attendanceSessions()->exists()) {
            // Riwayat absensi tetap utuh: kegiatan hanya dinonaktifkan
            $activity->update(['is_active' => false]);
            ActivitySchedule::where('activity_id', $activity->id)->update(['is_active' => false]);

            return response()->json(['success' => true, 'message' => "Kegiatan '{$activity->name}' sudah punya riwayat absensi, jadi dinonaktifkan (tidak dihapus)."]);
        }
        $activity->delete();

        return response()->json(['success' => true, 'message' => "Kegiatan '{$activity->name}' dihapus."]);
    }

    private function validateActivity(Request $request, bool $creating, ?Activity $activity = null): array
    {
        $v = $request->validate([
            'code' => [$creating ? 'nullable' : 'sometimes', 'string', 'max:50', Rule::unique('activities', 'code')->ignore($activity?->id)],
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:150'],
            'activity_category_id' => 'nullable|integer',
            'category_name' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'location' => 'nullable|string|max:150',
            'participant_type' => ['nullable', Rule::in(self::PARTICIPANT_TYPES)],
            'participant_gender' => 'nullable|in:all,male,female',
            'classroom_id' => 'nullable|integer', 'dormitory_id' => 'nullable|integer', 'dormitory_room_id' => 'nullable|integer',
            'extracurricular_id' => 'nullable|integer', 'student_group_id' => 'nullable|integer', 'halaqah_id' => 'nullable|integer',
            'attendance_enabled' => 'sometimes|boolean',
            'allow_manual' => 'sometimes|boolean', 'allow_qr' => 'sometimes|boolean', 'allow_rfid' => 'sometimes|boolean',
            'late_tolerance_minutes' => 'nullable|integer|min:0|max:240',
            'is_active' => 'sometimes|boolean',
            'default_start_time' => 'nullable|date_format:H:i', 'default_present_until' => 'nullable|date_format:H:i',
            'default_late_until' => 'nullable|date_format:H:i', 'default_end_time' => 'nullable|date_format:H:i',
        ]);

        $attrs = array_intersect_key($v, array_flip(['name', 'description', 'location', 'attendance_enabled', 'allow_manual', 'allow_qr', 'allow_rfid',
            'late_tolerance_minutes', 'is_active', 'default_start_time', 'default_present_until', 'default_late_until', 'default_end_time']));
        $attrs = array_filter($attrs, fn ($x) => $x !== null);

        if ($creating || array_key_exists('code', $v)) {
            $attrs['code'] = strtoupper($v['code'] ?? ('KEG-' . Str::upper(Str::random(5))));
        }
        if (array_key_exists('activity_category_id', $v) || array_key_exists('category_name', $v) || $creating) {
            $cat = isset($v['activity_category_id']) ? ActivityCategory::find($v['activity_category_id']) : null;
            if (!$cat && !empty($v['category_name'])) {
                $cat = ActivityCategory::where('name', $v['category_name'])->first();
            }
            $cat ??= $activity?->category ?? ActivityCategory::firstOrCreate(['code' => 'KEGIATAN_KHUSUS'], ['name' => 'Kegiatan Khusus']);
            $attrs['activity_category_id'] = $cat->id;
        }
        if (array_key_exists('participant_type', $v) || $creating) {
            $type = $v['participant_type'] ?? 'all_students';
            $field = self::TARGET_FIELDS[$type] ?? null;
            $attrs['participant_type'] = $type;
            $attrs['participant_target_id'] = $field ? ($v[$field] ?? null) : null;
        }
        if (array_key_exists('participant_gender', $v)) {
            $attrs['participant_gender'] = in_array($v['participant_gender'], ['male', 'female'], true) ? $v['participant_gender'] : null;
        }

        return ['attributes' => $attrs];
    }

    /** Peserta kegiatan dari aplikasi disimpan sebagai satu rule "dikelola kegiatan" (rule lain tidak disentuh). */
    private function syncManagedRule(Activity $a): void
    {
        ActivityParticipantRule::where('activity_id', $a->id)->where('rule_value->managed', 'activity')->delete();
        $gender = ['male' => 'L', 'female' => 'P'][$a->participant_gender ?? ''] ?? null;
        $type = $a->participant_type ?: 'all_students';
        if ($type === 'all_students' && !$gender) {
            return; // tanpa rule = semua santri aktif
        }
        if ($type === 'individual') {
            return; // peserta perorangan diatur per sesi; tanpa rule = semua santri aktif
        }
        ActivityParticipantRule::create([
            'activity_id' => $a->id,
            'rule_type' => $type,
            'rule_operator' => 'include',
            'source_id' => $a->participant_target_id,
            'rule_value' => array_filter(['managed' => 'activity', 'gender' => $gender]),
            'priority' => 1,
            'is_active' => true,
        ]);
    }

    // ================================================================== Jadwal rutin & kawan-kawan (sinkron dari halaman Jadwal Rutin)

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'schedules' => 'nullable|array|max:2000',
            'schedules.*.activity_id' => 'required|integer|exists:activities,id',
            'schedules.*.frequency' => 'nullable|in:daily,weekly,selected_days',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.present_until' => 'required|date_format:H:i',
            'schedules.*.late_until' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
            'overrides' => 'nullable|array|max:5000',
            'prayer_calendars' => 'nullable|array|max:800',
            'prayer_calendars.*.date' => 'required|date',
            'prayer_calendars.*.subuh' => 'required|date_format:H:i',
            'prayer_calendars.*.dzuhur' => 'required|date_format:H:i',
            'prayer_calendars.*.ashar' => 'required|date_format:H:i',
            'prayer_calendars.*.maghrib' => 'required|date_format:H:i',
            'prayer_calendars.*.isya' => 'required|date_format:H:i',
            'supervisors' => 'nullable|array|max:2000',
        ], ['schedules.*.activity_id.exists' => 'Kegiatan pada jadwal rutin tidak ditemukan di server. Muat ulang halaman lalu coba lagi.']);
        // validate() hanya mengembalikan kolom yang punya aturan; baris lengkap diambil dari input
        $data = array_filter($request->only(['schedules', 'overrides', 'prayer_calendars', 'supervisors']), fn ($v) => is_array($v));

        $stats = DB::transaction(function () use ($data, $request) {
            $stats = [];
            $idMap = [];

            if (isset($data['schedules'])) {
                $keep = [];
                foreach ($data['schedules'] as $row) {
                    $s = (isset($row['id']) ? ActivitySchedule::find($row['id']) : null) ?? new ActivitySchedule();
                    $freq = $row['frequency'] ?? 'weekly';
                    $days = array_values(array_unique(array_filter(array_map(fn ($d) => self::DAYS[$d] ?? null, $row['days_of_week'] ?? []), fn ($d) => $d !== null)));
                    $s->fill([
                        'activity_id' => $row['activity_id'],
                        'frequency' => $freq,
                        'day_of_week' => $freq === 'weekly' ? (self::DAYS[$row['day_of_week'] ?? ''] ?? null) : null,
                        'days_of_week' => $freq === 'selected_days' ? $days : null,
                        'start_time' => $row['start_time'], 'present_until' => $row['present_until'],
                        'late_until' => $row['late_until'], 'end_time' => $row['end_time'],
                        'effective_start_date' => $row['effective_start_date'] ?? null,
                        'effective_end_date' => $row['effective_end_date'] ?? null,
                        'auto_generate_session' => $row['auto_generate_session'] ?? true,
                        'auto_open' => $row['auto_open'] ?? false,
                        'auto_close' => $row['auto_close'] ?? false,
                        'schedule_set_code' => $row['schedule_set_code'] ?? 'NORMAL',
                        'location' => $row['location'] ?? null,
                        'participant_type' => in_array($row['participant_type'] ?? null, self::PARTICIPANT_TYPES, true) ? $row['participant_type'] : null,
                        'participant_target_id' => $row['participant_target_id'] ?? null,
                        'participant_gender' => in_array($row['participant_gender'] ?? null, ['male', 'female'], true) ? $row['participant_gender'] : null,
                        'is_active' => $row['is_active'] ?? true,
                    ])->save();
                    $idMap[(string) ($row['id'] ?? '')] = $s->id;
                    $keep[] = $s->id;
                }
                // Jadwal yang dihapus di aplikasi ikut dihapus (sesi lama tetap ada, hanya lepas tautannya)
                ActivitySchedule::whereNotIn('id', $keep ?: [0])->delete();
                $stats['schedules'] = count($keep);
            }

            if (isset($data['overrides'])) {
                $keep = [];
                foreach ($data['overrides'] as $row) {
                    $sid = $idMap[(string) ($row['routine_schedule_id'] ?? '')] ?? (ActivitySchedule::whereKey($row['routine_schedule_id'] ?? 0)->exists() ? (int) $row['routine_schedule_id'] : null);
                    if (!$sid || empty($row['override_date'])) continue;
                    $date = Carbon::parse($row['override_date'])->toDateString();
                    $o = (isset($row['id']) ? RoutineScheduleOverride::find($row['id']) : null)
                        ?? RoutineScheduleOverride::where('activity_schedule_id', $sid)->whereDate('date', $date)->first()
                        ?? new RoutineScheduleOverride(['created_by' => $request->user()?->id]);
                    $o->fill([
                        'activity_schedule_id' => $sid, 'date' => $date, 'type' => $row['override_type'] ?? 'cancelled',
                        'new_start_time' => $row['new_start_time'] ?? null, 'new_end_time' => $row['new_end_time'] ?? null,
                        'new_location' => $row['new_location'] ?? null, 'reason' => $row['reason'] ?? null,
                    ])->save();
                    $keep[] = $o->id;
                }
                RoutineScheduleOverride::whereDate('date', '>=', today()->subDays(30))->whereNotIn('id', $keep ?: [0])->delete();
                $stats['overrides'] = count($keep);
            }

            if (isset($data['prayer_calendars'])) {
                $dates = [];
                foreach ($data['prayer_calendars'] as $row) {
                    $date = Carbon::parse($row['date'])->toDateString();
                    $p = PrayerTimeCalendar::whereDate('date', $date)->first() ?? new PrayerTimeCalendar(['date' => $date]);
                    $p->fill(array_intersect_key($row, array_flip(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'])))->save();
                    $dates[] = $p->id;
                }
                PrayerTimeCalendar::whereDate('date', '>=', today()->subDays(30))->whereNotIn('id', $dates ?: [0])->delete();
                $stats['prayer_calendars'] = count($dates);
            }

            if (isset($data['supervisors'])) {
                $keep = [];
                foreach ($data['supervisors'] as $row) {
                    $aid = (int) ($row['activity_id'] ?? 0);
                    $uid = (int) ($row['user_id'] ?? 0);
                    if (!Activity::whereKey($aid)->exists() || !\App\Models\User::whereKey($uid)->exists()) continue;
                    $sv = ActivitySupervisor::updateOrCreate(
                        ['activity_id' => $aid, 'user_id' => $uid, 'role_type' => mb_substr($row['role_type'] ?? 'SUPERVISOR', 0, 32)],
                        ['is_active' => $row['is_active'] ?? true]
                    );
                    $keep[] = $sv->id;
                }
                ActivitySupervisor::whereNotIn('id', $keep ?: [0])->delete();
                $stats['supervisors'] = count($keep);
            }

            return $stats;
        });

        return response()->json(['success' => true, 'message' => 'Jadwal rutin tersimpan di server.', 'data' => $stats]);
    }

    // ================================================================== Sesi

    public function generate(Request $request, RoutineSessionGenerator $generator): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date']);
        $r = $generator->generateForDate(Carbon::parse($data['date'], 'Asia/Jakarta'));

        return response()->json(['success' => true, 'data' => [
            'date' => Carbon::parse($data['date'])->toDateString(),
            'schedules_found' => $r['schedules_found'] ?? 0,
            'created' => $r['sessions_created'] ?? 0,
            'existing' => $r['sessions_existing'] ?? ($r['existing'] ?? 0),
            'skipped' => $r['sessions_skipped'] ?? ($r['skipped'] ?? 0),
        ]]);
    }

    /** Membuat satu sesi absensi manual beserta snapshot pesertanya. */
    public function storeSession(Request $request, ActivityParticipantResolver $resolver): JsonResponse
    {
        $data = $request->validate([
            'activity_id' => 'required|integer|exists:activities,id',
            'session_date' => 'nullable|date',
            'start_at' => 'nullable|date', 'present_until' => 'nullable|date', 'late_until' => 'nullable|date', 'end_at' => 'nullable|date',
            'location' => 'nullable|string|max:150',
            'notes' => 'nullable|string|max:1000',
            'session_code' => 'nullable|string|max:80|unique:attendance_sessions,session_code',
        ], ['activity_id.exists' => 'Kegiatan tidak ditemukan di server. Muat ulang halaman lalu coba lagi.']);

        $activity = Activity::findOrFail($data['activity_id']);
        $date = Carbon::parse($data['session_date'] ?? today()->toDateString())->toDateString();
        $at = function (?string $value, ?string $default, string $fallback) use ($date) {
            if ($value) return Carbon::parse($value);
            return Carbon::parse($date . ' ' . ($default ? substr($default, 0, 5) : $fallback));
        };
        $start = $at($data['start_at'] ?? null, $activity->default_start_time, '07:00');
        $present = $at($data['present_until'] ?? null, $activity->default_present_until, $start->copy()->addMinutes(15)->format('H:i'));
        $late = $at($data['late_until'] ?? null, $activity->default_late_until, $start->copy()->addMinutes(30)->format('H:i'));
        $end = $at($data['end_at'] ?? null, $activity->default_end_time, $start->copy()->addHour()->format('H:i'));
        foreach ([&$present, &$late, &$end] as &$t) {
            if ($t->lt($start)) $t->addDay(); // lewat tengah malam
        }
        unset($t);
        if (!($start->lte($present) && $present->lte($late) && $late->lte($end))) {
            return ApiResponse::error('INVALID_TIME_WINDOW', 'Urutan waktu harus: mulai ≤ batas hadir ≤ batas terlambat ≤ selesai.', null, 422);
        }

        $session = DB::transaction(function () use ($data, $activity, $date, $start, $present, $late, $end, $resolver) {
            $session = AttendanceSession::create([
                'activity_id' => $activity->id,
                'session_code' => $data['session_code'] ?? ('ATT-' . str_replace('-', '', $date) . '-' . $activity->code . '-' . Str::upper(Str::random(4))),
                'session_date' => $date,
                'start_at' => $start, 'present_until' => $present, 'late_until' => $late, 'end_at' => $end,
                'status' => SessionStatus::DRAFT,
                'location' => $data['location'] ?? $activity->location,
                'notes' => $data['notes'] ?? null,
            ]);
            foreach ($resolver->resolve($activity, Carbon::parse($date, 'Asia/Jakarta')) as $item) {
                AttendanceSessionParticipant::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $item['student_id'],
                    'participant_source' => $item['primary_source'] ?? 'activity',
                    'participant_source_id' => $item['primary_source_id'] ?? null,
                    'eligibility_status' => 'ELIGIBLE',
                ]);
            }

            return $session;
        });
        $count = AttendanceSessionParticipant::where('attendance_session_id', $session->id)->count();

        return response()->json([
            'success' => true,
            'message' => "Sesi '{$session->session_code}' dibuat dengan {$count} santri peserta.",
            'data' => SpaTransformer::session($session->load('activity.category')),
        ], 201);
    }

    // ================================================================== Bentuk data aplikasi

    private function hm(?string $t): ?string
    {
        return $t ? substr($t, 0, 5) : null;
    }

    private function activity(Activity $a): array
    {
        $type = $a->participant_type ?: 'all_students';
        $row = [
            'id' => $a->id, 'activity_category_id' => $a->activity_category_id, 'category_name' => $a->category?->name ?? '',
            'code' => $a->code, 'name' => $a->name, 'description' => $a->description ?? '', 'location' => $a->location ?? '',
            'participant_type' => $type, 'participant_gender' => $a->participant_gender ?? 'all',
            'classroom_id' => null, 'dormitory_id' => null, 'dormitory_room_id' => null, 'extracurricular_id' => null,
            'student_group_id' => null, 'halaqah_id' => null,
            'attendance_enabled' => (bool) $a->attendance_enabled, 'allow_manual' => (bool) $a->allow_manual,
            'allow_qr' => (bool) $a->allow_qr, 'allow_rfid' => (bool) $a->allow_rfid,
            'late_tolerance_minutes' => (int) $a->late_tolerance_minutes, 'is_active' => (bool) $a->is_active,
            'default_start_time' => $this->hm($a->default_start_time) ?? '07:00',
            'default_present_until' => $this->hm($a->default_present_until) ?? '07:15',
            'default_late_until' => $this->hm($a->default_late_until) ?? '07:30',
            'default_end_time' => $this->hm($a->default_end_time) ?? '08:00',
        ];
        if (isset(self::TARGET_FIELDS[$type])) {
            $row[self::TARGET_FIELDS[$type]] = $a->participant_target_id;
        }

        return $row;
    }

    private function schedule(ActivitySchedule $s): array
    {
        $names = array_flip(self::DAYS);

        return [
            'id' => $s->id, 'activity_id' => $s->activity_id, 'activity_name' => $s->activity?->name,
            'frequency' => $s->frequency ?: ($s->day_of_week === null ? 'daily' : 'weekly'),
            'day_of_week' => $s->day_of_week === null ? null : ($names[$s->day_of_week] ?? null),
            'days_of_week' => array_values(array_map(fn ($d) => $names[(int) $d] ?? 'monday', $s->days_of_week ?? [])),
            'start_time' => $this->hm($s->start_time), 'present_until' => $this->hm($s->present_until),
            'late_until' => $this->hm($s->late_until), 'end_time' => $this->hm($s->end_time),
            'effective_start_date' => $s->effective_start_date?->toDateString(), 'effective_end_date' => $s->effective_end_date?->toDateString(),
            'auto_generate_session' => (bool) $s->auto_generate_session, 'auto_open' => (bool) $s->auto_open, 'auto_close' => (bool) $s->auto_close,
            'schedule_set_code' => $s->schedule_set_code ?? 'NORMAL', 'location' => $s->location,
            'participant_type' => $s->participant_type, 'participant_target_id' => $s->participant_target_id,
            'participant_gender' => $s->participant_gender ?? 'all', 'is_active' => (bool) $s->is_active,
            'created_at' => $s->created_at?->toIso8601String(), 'updated_at' => $s->updated_at?->toIso8601String(),
        ];
    }

    private function override(RoutineScheduleOverride $o): array
    {
        return ['id' => $o->id, 'routine_schedule_id' => $o->activity_schedule_id, 'override_date' => $o->date?->toDateString(),
            'override_type' => $o->type, 'new_start_time' => $this->hm($o->new_start_time), 'new_end_time' => $this->hm($o->new_end_time),
            'new_location' => $o->new_location, 'reason' => $o->reason, 'created_at' => $o->created_at?->toIso8601String()];
    }

    private function prayer(PrayerTimeCalendar $p): array
    {
        return ['date' => $p->date?->toDateString(), 'subuh' => $this->hm($p->subuh), 'dzuhur' => $this->hm($p->dzuhur),
            'ashar' => $this->hm($p->ashar), 'maghrib' => $this->hm($p->maghrib), 'isya' => $this->hm($p->isya)];
    }
}
