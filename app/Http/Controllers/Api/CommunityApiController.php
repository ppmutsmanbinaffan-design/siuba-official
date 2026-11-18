<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\ActivityParticipantRule;
use App\Models\DutyRoster;
use App\Models\Event;
use App\Models\EventAttendanceSessionContext;
use App\Models\EventOrganizer;
use App\Models\EventRegistration;
use App\Models\EventSession;
use App\Models\Extracurricular;
use App\Models\ExtracurricularMember;
use App\Models\Halaqah;
use App\Models\HalaqahMember;
use App\Models\StudentGroup;
use App\Models\StudentGroupMember;
use App\Services\Event\EventSessionGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Ekstrakurikuler, halaqah, piket, dan event khusus untuk aplikasi React
 * (sebelumnya hanya di memori browser — hilang setiap halaman dimuat ulang).
 */
class CommunityApiController extends Controller
{
    // ================================================================== Ringkasan

    public function master(): JsonResponse
    {
        $eventActivityIds = Activity::where('code', 'like', 'EVENT-%')->pluck('id');

        return response()->json(['success' => true, 'data' => [
            'activities' => Activity::with('category')->where('is_active', true)->orderBy('name')->get()->map(fn ($a) => $this->activity($a))->values(),
            'extracurriculars' => Extracurricular::with(['coach', 'assistantCoach'])->orderBy('name')->get()->map(fn ($e) => $this->ekskul($e))->values(),
            'extracurricular_members' => ExtracurricularMember::with('student.classroom')->get()->map(fn ($m) => $this->ekskulMember($m))->values(),
            'halaqahs' => Halaqah::with('supervisor')->withCount(['members as student_count' => fn ($q) => $q->where('is_active', true)])
                ->orderBy('name')->get()->map(fn ($h) => $this->halaqah($h))->values(),
            'halaqah_members' => HalaqahMember::with('student')->get()->map(fn ($m) => $this->halaqahMember($m))->values(),
            'duty_rosters' => DutyRoster::with(['student', 'activity', 'creator'])->whereDate('date', '>=', today()->subDays(30))
                ->orderBy('date')->get()->map(fn ($d) => $this->duty($d))->values(),
            'events' => Event::with('creator')->orderByDesc('start_at')->limit(300)->get()->map(fn ($e) => $this->event($e))->values(),
            'event_sessions' => EventSession::orderBy('event_id')->orderBy('sort_order')->get()->map(fn ($s) => $this->eventSession($s))->values(),
            'event_registrations' => EventRegistration::with(['student.classroom', 'approver'])->get()->map(fn ($r) => $this->registration($r))->values(),
            'event_organizers' => EventOrganizer::with('user')->get()->map(fn ($o) => [
                'id' => $o->id, 'event_id' => $o->event_id, 'user_id' => $o->user_id, 'user_name' => $o->user?->name, 'role' => $o->role, 'is_active' => (bool) $o->is_active,
            ])->values(),
            'student_groups' => StudentGroup::withCount('members')->orderBy('name')->get()->map(fn ($g) => [
                'id' => $g->id, 'code' => $g->code, 'name' => $g->name, 'description' => $g->description ?? '',
                'is_active' => (bool) $g->is_active, 'member_count' => (int) $g->members_count,
            ])->values(),
            'student_group_members' => StudentGroupMember::with('student')->get()->map(fn ($m) => [
                'id' => $m->id, 'student_group_id' => $m->student_group_id, 'student_id' => $m->student_id,
                'student_name' => $m->student?->name, 'student_number' => $m->student?->student_number,
                'joined_at' => $m->joined_at?->toDateString() ?? '',
            ])->values(),
            'participant_rules' => ActivityParticipantRule::with(['activity', 'creator'])->whereIn('activity_id', $eventActivityIds)
                ->get()->map(fn ($r) => $this->rule($r))->values(),
        ]]);
    }

    // ================================================================== Ekstrakurikuler

    public function storeEkskul(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'nullable|string|max:32|unique:extracurriculars,code',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:2000',
            'coach_id' => 'nullable|integer|exists:users,id',
            'assistant_coach_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:64',
            'capacity' => 'nullable|integer|min:1|max:2000',
            'approval_required' => 'sometimes|boolean',
            'waitlist_enabled' => 'sometimes|boolean',
        ]);
        $data = array_filter($data, fn ($v) => $v !== null);
        $data['code'] = strtoupper($data['code'] ?? ('EKS-' . Str::upper(Str::random(4))));
        $ekskul = Extracurricular::create($data + ['is_active' => true]);

        return response()->json(['success' => true, 'message' => "Ekstrakurikuler '{$ekskul->name}' ditambahkan.", 'data' => $this->ekskul($ekskul->load(['coach', 'assistantCoach']))], 201);
    }

    public function updateEkskul(Request $request, Extracurricular $ekskul): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:2000',
            'coach_id' => 'nullable|integer|exists:users,id',
            'assistant_coach_id' => 'nullable|integer|exists:users,id',
            'location' => 'nullable|string|max:64',
            'capacity' => 'nullable|integer|min:1|max:2000',
            'is_active' => 'sometimes|boolean',
        ]);
        $ekskul->update($data);

        return response()->json(['success' => true, 'data' => $this->ekskul($ekskul->fresh(['coach', 'assistantCoach']))]);
    }

    public function addEkskulMember(Request $request, Extracurricular $ekskul): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'membership_status' => ['nullable', Rule::in(['pending', 'active', 'waitlisted'])],
            'notes' => 'nullable|string|max:500',
        ]);

        $activeCount = ExtracurricularMember::where('extracurricular_id', $ekskul->id)->where('membership_status', 'active')->count();
        $status = $data['membership_status'] ?? 'active';
        if ($status === 'active' && $ekskul->capacity && $activeCount >= $ekskul->capacity) {
            if (!$ekskul->waitlist_enabled) {
                return ApiResponse::error('EKSKUL_FULL', "Kuota {$ekskul->name} sudah penuh ({$ekskul->capacity}).", null, 409);
            }
            $status = 'waitlisted';
        }

        $member = ExtracurricularMember::updateOrCreate(
            ['extracurricular_id' => $ekskul->id, 'student_id' => $data['student_id']],
            [
                'membership_status' => $status,
                'joined_at' => now(),
                'left_at' => null,
                'registration_source' => 'admin_assignment',
                'approved_by' => $status === 'active' ? $request->user()?->id : null,
                'approved_at' => $status === 'active' ? now() : null,
                'notes' => $data['notes'] ?? null,
                'is_active' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => $status === 'waitlisted' ? 'Kuota penuh: santri masuk daftar tunggu.' : 'Anggota ekstrakurikuler ditambahkan.',
            'data' => $this->ekskulMember($member->load('student.classroom')),
        ], 201);
    }

    public function removeEkskulMember(ExtracurricularMember $member): JsonResponse
    {
        $member->update(['membership_status' => 'removed', 'is_active' => false, 'left_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Anggota ekstrakurikuler dinonaktifkan.']);
    }

    // ================================================================== Kelompok santri khusus

    public function storeGroup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'nullable|string|max:32|unique:student_groups,code',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:2000',
        ]);
        $g = StudentGroup::create([
            'code' => strtoupper($data['code'] ?? ('GRP-' . Str::upper(Str::random(4)))),
            'name' => $data['name'], 'description' => $data['description'] ?? null, 'is_active' => true,
        ]);

        return response()->json(['success' => true, 'message' => "Kelompok '{$g->name}' berhasil dibuat.", 'data' => ['id' => $g->id, 'code' => $g->code]], 201);
    }

    public function addGroupMember(Request $request, StudentGroup $group): JsonResponse
    {
        $data = $request->validate(['student_id' => 'required|integer|exists:students,id']);
        StudentGroupMember::firstOrCreate(['student_group_id' => $group->id, 'student_id' => $data['student_id']], ['joined_at' => today()]);

        return response()->json(['success' => true, 'message' => 'Santri berhasil didaftarkan ke kelompok.'], 201);
    }

    public function removeGroupMember(StudentGroupMember $member): JsonResponse
    {
        $member->delete();

        return response()->json(['success' => true, 'message' => 'Santri dikeluarkan dari kelompok.']);
    }

    // ================================================================== Halaqah (sinkron dari tampilan Halaqah Manager)

    public function syncHalaqahs(Request $request): JsonResponse
    {
        $data = $request->validate([
            'halaqahs' => 'present|array|max:500',
            'halaqahs.*.code' => 'required|string|max:32',
            'halaqahs.*.name' => 'required|string|max:100',
            'halaqahs.*.supervisor_id' => 'nullable|integer',
            'halaqahs.*.location' => 'nullable|string|max:64',
            'halaqahs.*.is_active' => 'nullable|boolean',
            'halaqahs.*.id' => 'nullable|integer',
            'members' => 'nullable|array|max:20000',
        ]);

        $stats = DB::transaction(function () use ($data) {
            $idMap = [];
            $seenIds = [];
            foreach ($data['halaqahs'] as $row) {
                $code = strtoupper(trim($row['code']));
                $supervisor = isset($row['supervisor_id']) && \App\Models\User::whereKey($row['supervisor_id'])->exists() ? $row['supervisor_id'] : null;
                $attrs = ['code' => $code, 'name' => $row['name'], 'supervisor_id' => $supervisor, 'location' => $row['location'] ?? null, 'is_active' => $row['is_active'] ?? true];
                $h = (isset($row['id']) ? Halaqah::find($row['id']) : null) ?? Halaqah::firstOrNew(['code' => $code]);
                $h->fill($attrs)->save();
                $idMap[(string) ($row['id'] ?? $code)] = $h->id;
                $seenIds[] = $h->id;
            }
            // Halaqah yang dihapus di tampilan -> dinonaktifkan (riwayat aman)
            Halaqah::whereNotIn('id', $seenIds ?: [0])->update(['is_active' => false]);

            if (isset($data['members'])) {
                $seen = [];
                foreach ($data['members'] as $m) {
                    $hid = $idMap[(string) ($m['halaqah_id'] ?? '')] ?? null;
                    $sid = (int) ($m['student_id'] ?? 0);
                    if (!$hid || !\App\Models\Student::whereKey($sid)->exists()) continue;
                    $hm = HalaqahMember::updateOrCreate(['halaqah_id' => $hid, 'student_id' => $sid], [
                        'joined_at' => $m['joined_at'] ?? today()->toDateString(),
                        'left_at' => $m['left_at'] ?? null,
                        'is_active' => $m['is_active'] ?? true,
                    ]);
                    $seen[] = $hm->id;
                }
                HalaqahMember::whereNotIn('id', $seen ?: [0])->where('is_active', true)->update(['is_active' => false, 'left_at' => today()]);
            }

            return ['halaqahs' => count($seenIds)];
        });

        return response()->json(['success' => true, 'message' => 'Data halaqah tersimpan di server.', 'data' => $stats]);
    }

    // ================================================================== Piket (sinkron dari Duty Roster Manager)

    public function syncDutyRosters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rosters' => 'present|array|max:20000',
            'rosters.*.activity_id' => 'required|integer|exists:activities,id',
            'rosters.*.date' => 'required|date',
            'rosters.*.student_id' => 'required|integer|exists:students,id',
            'rosters.*.role' => 'nullable|string|max:64',
            'rosters.*.is_active' => 'nullable|boolean',
        ], ['rosters.*.activity_id.exists' => 'Kegiatan piket tidak ditemukan di server. Muat ulang halaman lalu coba lagi.']);

        $count = DB::transaction(function () use ($data, $request) {
            $keep = [];
            $dates = [];
            foreach ($data['rosters'] as $r) {
                $date = Carbon::parse($r['date'])->toDateString();
                $dates[$date] = true;
                $row = DutyRoster::where('activity_id', $r['activity_id'])->whereDate('date', $date)->where('student_id', $r['student_id'])->first()
                    ?? new DutyRoster(['activity_id' => $r['activity_id'], 'date' => $date, 'student_id' => $r['student_id'], 'created_by' => $request->user()?->id]);
                $row->fill(['role' => $r['role'] ?? null, 'is_active' => $r['is_active'] ?? true])->save();
                $keep[] = $row->id;
            }
            // Jadwal piket 30 hari terakhir ke depan yang dihapus di tampilan ikut dihapus
            DutyRoster::whereDate('date', '>=', today()->subDays(30))->whereNotIn('id', $keep ?: [0])->delete();

            return count($keep);
        });

        return response()->json(['success' => true, 'message' => "Jadwal piket tersimpan ({$count} penugasan).", 'data' => ['count' => $count]]);
    }

    // ================================================================== Event khusus

    public function storeEvent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'nullable|string|max:32|unique:events,code',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:5000',
            'event_type' => 'nullable|string|max:32',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
            'registration_open_at' => 'nullable|date',
            'registration_close_at' => 'nullable|date',
            'location' => 'nullable|string|max:100',
            'capacity' => 'nullable|integer|min:1',
            'participant_mode' => 'nullable|string|max:32',
            'status' => ['nullable', Rule::in(['draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'])],
        ], ['end_at.after_or_equal' => 'Waktu selesai event harus setelah waktu mulai.']);

        $event = Event::create(array_merge([
            'event_type' => 'pesantren_event',
            'participant_mode' => 'registration',
            'status' => 'published',
        ], array_filter($data, fn ($v) => $v !== null), [
            'code' => strtoupper($data['code'] ?? ('EVT-' . now()->format('ymd') . '-' . Str::upper(Str::random(3)))),
            'attendance_enabled' => true,
            'created_by' => $request->user()?->id,
        ]));
        $this->eventActivity($event);

        return response()->json(['success' => true, 'message' => "Event \"{$event->name}\" berhasil dibuat.", 'data' => $this->event($event->load('creator'))], 201);
    }

    public function updateEventStatus(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'])]]);
        $event->update($data);

        return response()->json(['success' => true, 'message' => 'Status event diperbarui menjadi ' . strtoupper($data['status']) . '.', 'data' => $this->event($event->fresh('creator'))]);
    }

    /** Tambah sesi event + langsung buat sesi absensinya (peserta = pendaftar yang disetujui). */
    public function storeEventSession(Request $request, Event $event, EventSessionGenerator $generator): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'present_until' => 'nullable|string|max:25',
            'late_until' => 'nullable|string|max:25',
            'location' => 'nullable|string|max:100',
            'attendance_required' => 'sometimes|boolean',
        ]);
        $start = Carbon::parse($data['start_at']);
        $end = Carbon::parse($data['end_at']);
        $toTime = function (?string $v, Carbon $fallback) use ($start) {
            if (!$v) return $fallback;
            return strlen($v) <= 5 ? Carbon::parse($start->toDateString() . ' ' . $v) : Carbon::parse($v);
        };

        $es = EventSession::create([
            'event_id' => $event->id,
            'name' => $data['name'],
            'start_at' => $start,
            'present_until' => $toTime($data['present_until'] ?? null, $start->copy()->addMinutes(15)),
            'late_until' => $toTime($data['late_until'] ?? null, $start->copy()->addMinutes(30)),
            'end_at' => $end,
            'location' => $data['location'] ?? $event->location,
            'attendance_required' => $data['attendance_required'] ?? true,
            'sort_order' => (int) EventSession::where('event_id', $event->id)->max('sort_order') + 1,
        ]);
        $generator->generateForEvent($event);

        return response()->json(['success' => true, 'message' => "Sesi \"{$es->name}\" ditambahkan beserta sesi absensinya.", 'data' => $this->eventSession($es->fresh())], 201);
    }

    public function storeRegistration(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'status' => ['nullable', Rule::in(['pending', 'approved', 'waitlisted'])],
            'notes' => 'nullable|string|max:500',
        ]);
        $status = $data['status'] ?? 'approved';
        if ($status === 'approved' && $event->capacity && EventRegistration::where('event_id', $event->id)->where('status', 'approved')->count() >= $event->capacity) {
            $status = 'waitlisted';
        }

        $reg = EventRegistration::updateOrCreate(['event_id' => $event->id, 'student_id' => $data['student_id']], [
            'status' => $status,
            'registered_at' => now(),
            'registration_source' => 'internal',
            'approved_by' => $status === 'approved' ? $request->user()?->id : null,
            'approved_at' => $status === 'approved' ? now() : null,
            'cancelled_at' => null,
            'notes' => $data['notes'] ?? null,
        ]);
        if ($status === 'approved') {
            $this->addToEventSessions($event, (int) $data['student_id']);
        }

        return response()->json([
            'success' => true,
            'message' => $status === 'waitlisted' ? 'Kuota event penuh: santri masuk daftar tunggu.' : 'Santri berhasil terdaftar di event.',
            'data' => $this->registration($reg->load(['student.classroom', 'approver'])),
        ], 201);
    }

    public function updateRegistrationStatus(Request $request, EventRegistration $registration): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'waitlisted', 'rejected', 'cancelled'])]]);
        $registration->update([
            'status' => $data['status'],
            'approved_by' => $data['status'] === 'approved' ? $request->user()?->id : $registration->approved_by,
            'approved_at' => $data['status'] === 'approved' ? now() : $registration->approved_at,
            'cancelled_at' => $data['status'] === 'cancelled' ? now() : null,
        ]);
        if ($data['status'] === 'approved') {
            $this->addToEventSessions($registration->event, $registration->student_id);
        }

        return response()->json(['success' => true, 'message' => 'Status registrasi diubah menjadi ' . strtoupper($data['status']) . '.', 'data' => $this->registration($registration->fresh(['student.classroom', 'approver']))]);
    }

    public function storeRule(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate([
            'rule_type' => 'required|string|max:32',
            'rule_operator' => 'nullable|in:include,exclude',
            'rule_value' => 'nullable',
            'rule_description' => 'nullable|string|max:255',
        ]);
        $activity = $this->eventActivity($event);
        $value = $data['rule_value'] ?? null;
        $rule = ActivityParticipantRule::create([
            'activity_id' => $activity->id,
            'rule_type' => $data['rule_type'],
            'rule_operator' => $data['rule_operator'] ?? 'include',
            'source_id' => is_numeric($value) ? (int) $value : null,
            'rule_value' => ['value' => $value, 'description' => $data['rule_description'] ?? null],
            'is_active' => true,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Rule peserta ditambahkan.', 'data' => $this->rule($rule->load(['activity', 'creator']))], 201);
    }

    public function deleteRule(ActivityParticipantRule $rule): JsonResponse
    {
        $rule->delete();

        return response()->json(['success' => true, 'message' => 'Rule peserta dihapus.']);
    }

    // ================================================================== Helper

    private function eventActivity(Event $event): Activity
    {
        return Activity::firstOrCreate(['code' => "EVENT-{$event->code}"], [
            'name' => "Event: {$event->name}",
            'activity_category_id' => ActivityCategory::firstOrCreate(['code' => 'EVENT'], ['name' => 'Event Khusus'])->id,
            'allow_manual' => true, 'allow_qr' => true, 'allow_rfid' => true,
            'location' => $event->location,
        ]);
    }

    /** Pendaftar baru yang disetujui ikut dimasukkan ke sesi absensi event yang belum ditutup. */
    private function addToEventSessions(Event $event, int $studentId): void
    {
        $sessionIds = EventAttendanceSessionContext::where('event_id', $event->id)->pluck('attendance_session_id');
        $open = \App\Models\AttendanceSession::whereIn('id', $sessionIds)->whereIn('status', ['draft', 'open'])->pluck('id');
        foreach ($open as $sid) {
            \App\Models\AttendanceSessionParticipant::firstOrCreate(
                ['attendance_session_id' => $sid, 'student_id' => $studentId],
                ['participant_source' => 'event_registration', 'participant_source_id' => $event->id, 'eligibility_status' => 'ELIGIBLE']
            );
        }
    }

    private function activity(Activity $a): array
    {
        return [
            'id' => $a->id, 'activity_category_id' => $a->activity_category_id, 'category_name' => $a->category?->name ?? '', 'category_code' => $a->category?->code ?? '',
            'code' => $a->code, 'name' => $a->name, 'description' => $a->description ?? '', 'location' => $a->location ?? '',
            'participant_type' => 'all_students', 'attendance_enabled' => (bool) $a->attendance_enabled,
            'allow_manual' => (bool) $a->allow_manual, 'allow_qr' => (bool) $a->allow_qr, 'allow_rfid' => (bool) $a->allow_rfid,
            'late_tolerance_minutes' => \App\Services\Attendance\SessionService::toleranceFor($a), 'is_active' => (bool) $a->is_active,
        ];
    }

    private function ekskul(Extracurricular $e): array
    {
        return [
            'id' => $e->id, 'code' => $e->code, 'name' => $e->name, 'description' => $e->description ?? '',
            'coach_id' => $e->coach_id, 'coach_name' => $e->coach?->name ?? '', 'assistant_coach_id' => $e->assistant_coach_id,
            'assistant_coach_name' => $e->assistantCoach?->name, 'location' => $e->location, 'capacity' => $e->capacity,
            'registration_open_at' => $e->registration_open_at?->toIso8601String(), 'registration_close_at' => $e->registration_close_at?->toIso8601String(),
            'waitlist_enabled' => (bool) $e->waitlist_enabled, 'approval_required' => (bool) $e->approval_required, 'is_active' => (bool) $e->is_active,
        ];
    }

    private function ekskulMember(ExtracurricularMember $m): array
    {
        return [
            'id' => $m->id, 'extracurricular_id' => $m->extracurricular_id, 'student_id' => $m->student_id,
            'student_name' => $m->student?->name, 'student_number' => $m->student?->student_number, 'classroom_name' => $m->student?->classroom?->name,
            'membership_status' => $m->membership_status, 'registration_source' => $m->registration_source,
            'approved_at' => $m->approved_at?->toIso8601String(), 'joined_at' => $m->joined_at?->toDateString() ?? '',
            'left_at' => $m->left_at?->toDateString(), 'notes' => $m->notes, 'is_active' => (bool) $m->is_active,
        ];
    }

    private function halaqah(Halaqah $h): array
    {
        return ['id' => $h->id, 'code' => $h->code, 'name' => $h->name, 'supervisor_id' => $h->supervisor_id, 'supervisor_name' => $h->supervisor?->name,
            'location' => $h->location, 'is_active' => (bool) $h->is_active, 'student_count' => (int) ($h->student_count ?? 0)];
    }

    private function halaqahMember(HalaqahMember $m): array
    {
        return ['id' => $m->id, 'halaqah_id' => $m->halaqah_id, 'student_id' => $m->student_id, 'student_name' => $m->student?->name,
            'student_number' => $m->student?->student_number, 'joined_at' => $m->joined_at?->toDateString() ?? '', 'left_at' => $m->left_at?->toDateString(),
            'is_active' => (bool) $m->is_active];
    }

    private function duty(DutyRoster $d): array
    {
        return ['id' => $d->id, 'activity_id' => $d->activity_id, 'activity_name' => $d->activity?->name, 'date' => $d->date?->toDateString(),
            'student_id' => $d->student_id, 'student_name' => $d->student?->name, 'student_number' => $d->student?->student_number,
            'role' => $d->role, 'is_active' => (bool) $d->is_active, 'created_by' => $d->creator?->name, 'created_at' => $d->created_at?->toIso8601String()];
    }

    private function event(Event $e): array
    {
        return [
            'id' => $e->id, 'code' => $e->code, 'name' => $e->name, 'description' => $e->description ?? '', 'event_type' => $e->event_type,
            'start_at' => $e->start_at?->format('Y-m-d H:i'), 'end_at' => $e->end_at?->format('Y-m-d H:i'),
            'registration_open_at' => $e->registration_open_at?->format('Y-m-d H:i'), 'registration_close_at' => $e->registration_close_at?->format('Y-m-d H:i'),
            'location' => $e->location, 'capacity' => $e->capacity, 'participant_mode' => $e->participant_mode,
            'attendance_enabled' => (bool) $e->attendance_enabled, 'allow_manual' => true, 'allow_qr' => true, 'allow_rfid' => true,
            'status' => $e->status, 'finalization_policy' => 'required',
            'activity_id' => Activity::where('code', "EVENT-{$e->code}")->value('id'),
            'created_by' => $e->creator?->name, 'created_at' => $e->created_at?->toDateString(),
        ];
    }

    private function eventSession(EventSession $s): array
    {
        return ['id' => $s->id, 'event_id' => $s->event_id, 'name' => $s->name, 'start_at' => $s->start_at?->format('Y-m-d H:i'),
            'present_until' => $s->present_until?->format('H:i'), 'late_until' => $s->late_until?->format('H:i'), 'end_at' => $s->end_at?->format('Y-m-d H:i'),
            'location' => $s->location, 'attendance_required' => (bool) $s->attendance_required, 'sort_order' => (int) $s->sort_order,
            'attendance_session_id' => EventAttendanceSessionContext::where('event_session_id', $s->id)->value('attendance_session_id')];
    }

    private function registration(EventRegistration $r): array
    {
        return ['id' => $r->id, 'event_id' => $r->event_id, 'student_id' => $r->student_id, 'student_name' => $r->student?->name,
            'student_number' => $r->student?->student_number, 'classroom_name' => $r->student?->classroom?->name, 'status' => $r->status,
            'registered_at' => $r->registered_at?->toDateString() ?? '', 'registration_source' => $r->registration_source,
            'approved_by' => $r->approver?->name, 'approved_at' => $r->approved_at?->toDateString(), 'cancelled_at' => $r->cancelled_at?->toDateString(),
            'notes' => $r->notes];
    }

    private function rule(ActivityParticipantRule $r): array
    {
        $v = $r->rule_value;

        return ['id' => $r->id, 'activity_id' => $r->activity_id, 'activity_name' => $r->activity?->name, 'rule_type' => $r->rule_type,
            'rule_operator' => $r->rule_operator, 'rule_value' => (string) (is_array($v) ? ($v['value'] ?? json_encode($v)) : $v),
            'rule_description' => is_array($v) ? ($v['description'] ?? '') : '', 'is_active' => (bool) $r->is_active,
            'created_by' => $r->creator?->name, 'created_at' => $r->created_at?->toDateString()];
    }
}
