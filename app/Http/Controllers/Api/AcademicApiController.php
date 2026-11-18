<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AcademicCalendarEvent;
use App\Models\AcademicSchedule;
use App\Models\AcademicSessionContext;
use App\Models\AcademicSubstitution;
use App\Models\AcademicYear;
use App\Models\AttendanceSession;
use App\Models\LessonPeriod;
use App\Models\Semester;
use App\Models\StaffProfile;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\Academic\AcademicSessionGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Master data KBM untuk aplikasi React (mapel, guru, jam pelajaran, penugasan, jadwal, kalender, guru pengganti)
 * — sebelumnya seluruhnya hanya tersimpan di browser.
 */
class AcademicApiController extends Controller
{
    private const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    private const DAY_TYPES = ['normal' => 'REGULAR', 'jumat' => 'FRIDAY', 'ramadan' => 'RAMADAN'];
    public const TEACHER_ROLES = ['guru', 'teacher', 'wali-kelas', 'academic', 'kepala-sekolah', 'pelatih'];

    // ================================================================== Ringkasan

    public function master(Request $request): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $from = Carbon::parse($request->input('from', today()->subDays(13)->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', today()->addDays(7)->toDateString()))->endOfDay();

        $contexts = AcademicSessionContext::with(['session', 'schedule'])
            ->whereHas('session', fn ($q) => $q->whereBetween('session_date', [$from->toDateString(), $to->toDateString()]))
            ->get();

        return response()->json(['success' => true, 'data' => [
            'academic_years' => AcademicYear::orderByDesc('start_date')->get()->map(fn ($y) => $this->year($y))->values(),
            'semesters' => Semester::orderByDesc('start_date')->get()->map(fn ($s) => $this->semester($s))->values(),
            'subjects' => Subject::orderBy('name')->get()->map(fn ($s) => $this->subject($s))->values(),
            'lesson_periods' => LessonPeriod::orderBy('sort_order')->orderBy('period_number')->get()->map(fn ($p) => $this->period($p))->values(),
            'teachers' => $this->teacherQuery()->get()->map(fn ($u) => $this->teacher($u))->values(),
            'teaching_assignments' => TeachingAssignment::orderBy('id')->get()->map(fn ($a) => $a->toArray())->values(),
            'academic_schedules' => AcademicSchedule::orderBy('day_of_week')->get()->map(fn ($s) => $this->schedule($s))->values(),
            'calendar_events' => AcademicCalendarEvent::orderBy('start_date')->get()->map(fn ($e) => $this->event($e))->values(),
            'session_contexts' => $contexts->map(fn ($c) => $this->context($c))->values(),
            'substitutions' => AcademicSubstitution::with('assignedBy')->whereBetween('date', [$from->toDateString(), $to->toDateString()])
                ->get()->map(fn ($s) => $this->substitution($s))->values(),
        ]]);
    }

    // ================================================================== Mata pelajaran

    public function storeSubject(Request $request): JsonResponse
    {
        $data = $this->validateSubject($request);

        return response()->json(['success' => true, 'data' => $this->subject(Subject::create($data))], 201);
    }

    public function updateSubject(Request $request, Subject $subject): JsonResponse
    {
        $subject->update($this->validateSubject($request, $subject));

        return response()->json(['success' => true, 'data' => $this->subject($subject->fresh())]);
    }

    public function deleteSubject(Subject $subject): JsonResponse
    {
        if (AcademicSchedule::where('subject_id', $subject->id)->exists() || AcademicSessionContext::where('subject_id', $subject->id)->exists()) {
            $subject->update(['is_active' => false]);

            return response()->json(['success' => true, 'message' => 'Mapel masih dipakai jadwal/riwayat, jadi dinonaktifkan (bukan dihapus).', 'data' => $this->subject($subject->fresh())]);
        }
        $subject->delete();

        return response()->json(['success' => true, 'message' => 'Mata pelajaran dihapus.']);
    }

    private function validateSubject(Request $request, ?Subject $subject = null): array
    {
        $req = $subject ? 'sometimes' : 'required';
        if ($request->has('code')) $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);

        return $request->validate([
            'code' => [$req, 'string', 'max:32', Rule::unique('subjects', 'code')->ignore($subject?->id)],
            'name' => [$req, 'string', 'max:100'],
            'short_name' => ['nullable', 'string', 'max:32'],
            'category' => ['nullable', Rule::in(['UMUM', 'DINYYAH', 'DINIYAH', 'TAHFIDZ', 'BAHASA', 'LOKAL'])],
            'is_active' => ['sometimes', 'boolean'],
        ], ['code.unique' => 'Kode mapel sudah dipakai.']);
    }

    // ================================================================== Jam pelajaran

    public function storePeriod(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->period(LessonPeriod::create($this->validatePeriod($request)))], 201);
    }

    public function updatePeriod(Request $request, LessonPeriod $period): JsonResponse
    {
        $period->update($this->validatePeriod($request, $period));

        return response()->json(['success' => true, 'data' => $this->period($period->fresh())]);
    }

    public function deletePeriod(LessonPeriod $period): JsonResponse
    {
        if (AcademicSchedule::where('lesson_period_id', $period->id)->exists()) {
            return ApiResponse::error('PERIOD_IN_USE', 'Jam pelajaran ini masih dipakai di jadwal. Hapus/ubah jadwalnya dulu.', null, 409);
        }
        $period->delete();

        return response()->json(['success' => true]);
    }

    private function validatePeriod(Request $request, ?LessonPeriod $period = null): array
    {
        $req = $period ? 'sometimes' : 'required';
        foreach (['start_time', 'end_time'] as $k) {
            if ($request->filled($k)) $request->merge([$k => substr((string) $request->input($k), 0, 5)]);
        }
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:16'],
            'name' => [$req, 'string', 'max:32'],
            'period_number' => ['nullable', 'integer', 'min:0', 'max:50'],
            'start_time' => [$req, 'date_format:H:i'],
            'end_time' => [$req, 'date_format:H:i', 'after:start_time'],
            'day_type' => ['nullable', Rule::in(array_keys(self::DAY_TYPES))],
            'is_break' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ], ['end_time.after' => 'Jam selesai harus setelah jam mulai.']);

        if (isset($data['day_type'])) $data['day_type'] = self::DAY_TYPES[$data['day_type']];
        if (!$period) {
            $next = (int) LessonPeriod::max('period_number') + 1;
            $data += ['period_number' => $next, 'sort_order' => (int) LessonPeriod::max('sort_order') + 1];
            $data['code'] = $data['code'] ?? sprintf('JP-%02d', $data['period_number']);
        }

        return $data;
    }

    // ================================================================== Guru

    public function storeTeacher(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'employee_number' => 'nullable|string|max:40|unique:staff_profiles,staff_number',
            'gender' => 'nullable|in:male,female,L,P',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:191|unique:users,email',
        ], ['employee_number.unique' => 'NIP sudah dipakai SDM lain.', 'email.unique' => 'Email sudah dipakai akun lain.']);

        $base = Str::slug($data['employee_number'] ?? $data['name'], '.') ?: 'guru';
        $username = $base;
        for ($i = 2; User::where('username', $username)->exists(); $i++) {
            $username = "{$base}{$i}";
        }
        $password = Str::password(10, symbols: false);

        [$user, $profile] = DB::transaction(function () use ($data, $username, $password) {
            $user = User::create([
                'username' => $username,
                'name' => $data['name'],
                'email' => $data['email'] ?? "{$username}@utsman.sch.id",
                'password' => $password,
                'is_active' => true,
            ]);
            $user->assignRole('guru');
            $profile = StaffProfile::create([
                'user_id' => $user->id,
                'staff_number' => $data['employee_number'] ?? strtoupper($username),
                'name' => $data['name'],
                'gender' => in_array($data['gender'] ?? 'L', ['female', 'P'], true) ? 'P' : 'L',
                'staff_type' => 'teacher',
                'phone' => $data['phone'] ?? null,
                'email' => $user->email,
            ]);

            return [$user, $profile];
        });

        return response()->json([
            'success' => true,
            'message' => "Guru {$user->name} dibuat dengan akun login '{$username}'. Password awal: {$password} (catat & bagikan, hanya ditampilkan sekali).",
            'data' => $this->teacher($user->load('staffProfile')) + ['username' => $username, 'initial_password' => $password],
        ], 201);
    }

    public function updateTeacher(Request $request, User $teacher): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:150',
            'phone' => 'nullable|string|max:30',
            'email' => ['nullable', 'email', 'max:191', Rule::unique('users', 'email')->ignore($teacher->id)],
            'is_active' => 'sometimes|boolean',
            'gender' => 'nullable|in:male,female,L,P',
        ]);
        if (\App\Http\Controllers\Api\AuthApiController::isSuperAdmin($teacher)) {
            return ApiResponse::error('FORBIDDEN', 'Akun Super Admin tidak bisa diubah dari menu guru.', null, 403);
        }

        $teacher->update(array_filter(['name' => $data['name'] ?? null, 'email' => $data['email'] ?? null, 'is_active' => $data['is_active'] ?? null], fn ($v) => $v !== null));
        $profile = $teacher->staffProfile;
        if ($profile) {
            $profile->update(array_filter([
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'is_active' => $data['is_active'] ?? null,
                'gender' => isset($data['gender']) ? (in_array($data['gender'], ['female', 'P'], true) ? 'P' : 'L') : null,
            ], fn ($v) => $v !== null));
        }

        return response()->json(['success' => true, 'data' => $this->teacher($teacher->fresh('staffProfile'))]);
    }

    /** Guru tidak dihapus (riwayat KBM tetap utuh) — akun & profilnya dinonaktifkan. */
    public function deactivateTeacher(Request $request, User $teacher): JsonResponse
    {
        if (\App\Http\Controllers\Api\AuthApiController::isSuperAdmin($teacher) || $teacher->id === $request->user()?->id) {
            return ApiResponse::error('FORBIDDEN', 'Akun ini tidak bisa dinonaktifkan dari menu guru.', null, 403);
        }
        $teacher->update(['is_active' => false]);
        $teacher->tokens()->delete();
        $teacher->staffProfile?->update(['is_active' => false]);

        return response()->json(['success' => true, 'message' => "Guru {$teacher->name} dinonaktifkan.", 'data' => $this->teacher($teacher->fresh('staffProfile'))]);
    }

    // ================================================================== Penugasan mengajar

    public function storeAssignment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'classroom_id' => 'required|integer|exists:classrooms,id',
            'subject_id' => 'required|integer|exists:subjects,id',
            'teacher_id' => 'required|integer|exists:users,id',
            'weekly_periods' => 'nullable|integer|min:1|max:40',
            'academic_year_id' => 'nullable|integer',
            'semester_id' => 'nullable|integer',
        ]);
        [$year, $sem] = $this->resolvePeriod($data['academic_year_id'] ?? null, $data['semester_id'] ?? null);

        $assignment = TeachingAssignment::firstOrCreate(
            ['academic_year_id' => $year->id, 'semester_id' => $sem->id, 'classroom_id' => $data['classroom_id'], 'subject_id' => $data['subject_id'], 'teacher_id' => $data['teacher_id']],
            ['weekly_periods' => $data['weekly_periods'] ?? 2, 'is_active' => true]
        );

        return response()->json(['success' => true, 'data' => $assignment->toArray()], $assignment->wasRecentlyCreated ? 201 : 200);
    }

    public function deleteAssignment(TeachingAssignment $assignment): JsonResponse
    {
        $assignment->delete();

        return response()->json(['success' => true]);
    }

    // ================================================================== Jadwal pelajaran

    public function storeSchedule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'day_of_week' => ['required', Rule::in(self::DAYS)],
            'classroom_id' => 'required|integer|exists:classrooms,id',
            'subject_id' => 'required|integer|exists:subjects,id',
            'teacher_id' => 'required|integer|exists:users,id',
            'lesson_period_id' => 'required|integer|exists:lesson_periods,id',
            'room_location' => 'nullable|string|max:64',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'academic_year_id' => 'nullable|integer',
            'semester_id' => 'nullable|integer',
        ]);
        [$year, $sem] = $this->resolvePeriod($data['academic_year_id'] ?? null, $data['semester_id'] ?? null);
        $day = array_search($data['day_of_week'], self::DAYS, true);

        $base = AcademicSchedule::where('semester_id', $sem->id)->where('day_of_week', $day)
            ->where('lesson_period_id', $data['lesson_period_id'])->where('is_active', true);
        if ((clone $base)->where('classroom_id', $data['classroom_id'])->exists()) {
            return ApiResponse::error('CLASSROOM_CONFLICT', 'Kelas ini sudah punya jadwal pada hari & jam pelajaran tersebut.', null, 409);
        }
        if ((clone $base)->where('teacher_id', $data['teacher_id'])->exists()) {
            return ApiResponse::error('TEACHER_CONFLICT', 'Guru ini sudah mengajar di kelas lain pada hari & jam pelajaran tersebut.', null, 409);
        }

        $schedule = AcademicSchedule::create([
            'academic_year_id' => $year->id,
            'semester_id' => $sem->id,
            'day_of_week' => $day,
            'classroom_id' => $data['classroom_id'],
            'subject_id' => $data['subject_id'],
            'teacher_id' => $data['teacher_id'],
            'lesson_period_id' => $data['lesson_period_id'],
            'room_location' => $data['room_location'] ?? null,
            'effective_start_date' => $data['effective_start_date'] ?? null,
            'effective_end_date' => $data['effective_end_date'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['success' => true, 'data' => $this->schedule($schedule)], 201);
    }

    public function deleteSchedule(AcademicSchedule $schedule): JsonResponse
    {
        // Riwayat sesi yang sudah dibuat tetap ada; jadwal dihapus agar tidak dibuat sesi baru
        $schedule->delete();

        return response()->json(['success' => true]);
    }

    public function generate(Request $request, AcademicSessionGenerator $generator): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date', 'until' => 'nullable|date|after_or_equal:date']);
        $this->resolvePeriod(null, null); // pastikan ada tahun ajaran & semester aktif
        $date = Carbon::parse($data['date']);
        $until = isset($data['until']) ? Carbon::parse($data['until']) : $date->copy();
        if ($date->diffInDays($until, true) > 31) {
            return ApiResponse::error('RANGE_TOO_LONG', 'Maksimal 31 hari sekali generate.', null, 422);
        }

        $total = ['created' => 0, 'existing' => 0, 'holidays' => [], 'messages' => []];
        for ($d = $date->copy(); $d->lte($until); $d->addDay()) {
            $r = $generator->generateForDate($d->copy());
            $total['created'] += (int) ($r['sessions_created'] ?? 0);
            $total['existing'] += (int) ($r['sessions_existing'] ?? 0);
            if (!empty($r['is_holiday'])) $total['holidays'][] = $d->toDateString();
            if (empty($r['success']) && !empty($r['message'])) $total['messages'][] = $r['message'];
        }

        return response()->json(['success' => true, 'data' => $total]);
    }

    // ================================================================== Kalender akademik

    public function storeEvent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'type' => ['required', Rule::in(['holiday', 'exam', 'school_event', 'pesantren_event', 'special_schedule'])],
            'date_start' => 'required|date',
            'date_end' => 'required|date|after_or_equal:date_start',
            'description' => 'nullable|string|max:1000',
            'affects_academic_schedule' => 'sometimes|boolean',
            'academic_year_id' => 'nullable|integer',
        ]);
        [$year] = $this->resolvePeriod($data['academic_year_id'] ?? null, null);

        $event = AcademicCalendarEvent::create([
            'academic_year_id' => $year->id,
            'name' => $data['name'],
            'type' => $data['type'],
            'start_date' => $data['date_start'],
            'end_date' => $data['date_end'],
            'description' => $data['description'] ?? null,
            'affects_academic_schedule' => $data['affects_academic_schedule'] ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $this->event($event)], 201);
    }

    public function deleteEvent(AcademicCalendarEvent $event): JsonResponse
    {
        $event->delete();

        return response()->json(['success' => true]);
    }

    // ================================================================== Guru pengganti

    public function storeSubstitution(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_schedule_id' => 'required|integer|exists:academic_schedules,id',
            'substitute_teacher_id' => 'required|integer|exists:users,id',
            'date' => 'required|date',
            'reason' => 'nullable|string|max:255',
        ]);
        $schedule = AcademicSchedule::findOrFail($data['academic_schedule_id']);
        if ((int) $data['substitute_teacher_id'] === (int) $schedule->teacher_id) {
            return ApiResponse::error('SAME_TEACHER', 'Guru pengganti tidak boleh sama dengan guru terjadwal.', null, 422);
        }

        $sub = DB::transaction(function () use ($data, $schedule, $request) {
            $context = AcademicSessionContext::where('academic_schedule_id', $schedule->id)
                ->whereHas('session', fn ($q) => $q->whereDate('session_date', $data['date']))->first();

            $sub = AcademicSubstitution::updateOrCreate(
                ['academic_schedule_id' => $schedule->id, 'date' => Carbon::parse($data['date'])->toDateString()],
                [
                    'attendance_session_id' => $context?->attendance_session_id,
                    'original_teacher_id' => $schedule->teacher_id,
                    'substitute_teacher_id' => $data['substitute_teacher_id'],
                    'reason' => $data['reason'] ?? null,
                    'assigned_by' => $request->user()?->id,
                ]
            );
            // Sesi yang sudah dibuat ikut diperbarui
            $context?->update(['teaching_teacher_id' => $data['substitute_teacher_id']]);

            return $sub;
        });

        return response()->json(['success' => true, 'message' => 'Guru pengganti ditetapkan.', 'data' => $this->substitution($sub->load('assignedBy'))], 201);
    }

    // ================================================================== Helper

    /** @return array{0: AcademicYear, 1: Semester} tahun ajaran & semester aktif (dibuat otomatis jika belum ada) */
    private function resolvePeriod(?int $yearId, ?int $semesterId): array
    {
        $year = ($yearId ? AcademicYear::find($yearId) : null) ?? AcademicYear::where('is_active', true)->first();
        if (!$year) {
            $startYear = now()->month >= 7 ? now()->year : now()->year - 1;
            $year = AcademicYear::create([
                'name' => "{$startYear}/" . ($startYear + 1),
                'start_date' => "{$startYear}-07-01",
                'end_date' => ($startYear + 1) . '-06-30',
                'is_active' => true,
            ]);
        }

        $sem = ($semesterId ? Semester::where('academic_year_id', $year->id)->find($semesterId) : null)
            ?? Semester::where('academic_year_id', $year->id)->where('is_active', true)->first();
        if (!$sem) {
            $y = (int) substr($year->name, 0, 4);
            $ganjil = now()->month >= 7;
            $sem = Semester::create([
                'academic_year_id' => $year->id,
                'code' => $ganjil ? 'GANJIL' : 'GENAP',
                'name' => $ganjil ? 'Semester Ganjil' : 'Semester Genap',
                'start_date' => $ganjil ? "{$y}-07-01" : ($y + 1) . '-01-01',
                'end_date' => $ganjil ? "{$y}-12-31" : ($y + 1) . '-06-30',
                'is_active' => true,
            ]);
        }

        return [$year, $sem];
    }

    private function teacherQuery()
    {
        return User::with('staffProfile')
            ->where(function ($q) {
                $q->whereHas('roles', fn ($r) => $r->whereIn('name', self::TEACHER_ROLES))
                    ->orWhereHas('staffProfile', fn ($p) => $p->whereIn('staff_type', ['teacher', 'trainer']));
            })
            ->orderBy('name');
    }

    private function teacher(User $u): array
    {
        $p = $u->staffProfile;

        return [
            'id' => $u->id,
            'user_id' => $u->id,
            'staff_id' => $p?->id,
            'employee_number' => $p?->staff_number ?? $u->username,
            'name' => $u->name,
            'gender' => $p && $p->gender === 'P' ? 'female' : 'male',
            'is_active' => (bool) $u->is_active,
            'phone' => $p?->phone,
            'email' => $u->email,
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }

    private function year(AcademicYear $y): array
    {
        return ['id' => $y->id, 'name' => $y->name, 'start_date' => $y->start_date?->toDateString(), 'end_date' => $y->end_date?->toDateString(), 'is_active' => (bool) $y->is_active];
    }

    private function semester(Semester $s): array
    {
        return ['id' => $s->id, 'academic_year_id' => $s->academic_year_id, 'code' => $s->code, 'name' => $s->name,
            'start_date' => $s->start_date?->toDateString(), 'end_date' => $s->end_date?->toDateString(), 'is_active' => (bool) $s->is_active];
    }

    private function subject(Subject $s): array
    {
        return ['id' => $s->id, 'code' => $s->code, 'name' => $s->name, 'short_name' => $s->short_name,
            'category' => $s->category === 'DINIYAH' ? 'DINYYAH' : $s->category, 'is_active' => (bool) $s->is_active];
    }

    private function period(LessonPeriod $p): array
    {
        return [
            'id' => $p->id, 'code' => $p->code, 'name' => $p->name, 'period_number' => (int) $p->period_number,
            'start_time' => substr((string) $p->start_time, 0, 5), 'end_time' => substr((string) $p->end_time, 0, 5),
            'day_type' => array_search($p->day_type, self::DAY_TYPES, true) ?: 'normal',
            'is_break' => (bool) $p->is_break, 'is_active' => (bool) $p->is_active, 'sort_order' => (int) $p->sort_order,
        ];
    }

    private function schedule(AcademicSchedule $s): array
    {
        return [
            'id' => $s->id, 'academic_year_id' => $s->academic_year_id, 'semester_id' => $s->semester_id,
            'day_of_week' => self::DAYS[(int) $s->day_of_week] ?? 'monday',
            'classroom_id' => $s->classroom_id, 'subject_id' => $s->subject_id, 'teacher_id' => $s->teacher_id,
            'lesson_period_id' => $s->lesson_period_id, 'room_location' => $s->room_location, 'is_active' => (bool) $s->is_active,
            'effective_start_date' => $s->effective_start_date ? Carbon::parse($s->effective_start_date)->toDateString() : null,
            'effective_end_date' => $s->effective_end_date ? Carbon::parse($s->effective_end_date)->toDateString() : null,
        ];
    }

    private function event(AcademicCalendarEvent $e): array
    {
        return ['id' => $e->id, 'academic_year_id' => $e->academic_year_id, 'date_start' => $e->start_date?->toDateString(),
            'date_end' => $e->end_date?->toDateString(), 'type' => $e->type, 'name' => $e->name, 'description' => $e->description,
            'affects_academic_schedule' => (bool) $e->affects_academic_schedule];
    }

    private function context(AcademicSessionContext $c): array
    {
        $teaching = $c->teaching_teacher_id;

        return [
            'id' => $c->id,
            'attendance_session_id' => $c->attendance_session_id,
            'academic_schedule_id' => $c->academic_schedule_id,
            'lesson_period_id' => $c->lesson_period_id,
            'classroom_id' => $c->classroom_id,
            'subject_id' => $c->subject_id,
            'teacher_id' => $c->scheduled_teacher_id,
            'substitute_teacher_id' => $teaching && $teaching !== $c->scheduled_teacher_id ? $teaching : null,
            'period_count' => 1,
            'scheduled_start_time' => $c->session?->start_at?->format('H:i'),
            'scheduled_end_time' => $c->session?->end_at?->format('H:i'),
            'room_location' => $c->schedule?->room_location,
            'topic' => $c->topic,
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }

    private function substitution(AcademicSubstitution $s): array
    {
        return ['id' => $s->id, 'academic_schedule_id' => $s->academic_schedule_id, 'attendance_session_id' => $s->attendance_session_id,
            'original_teacher_id' => $s->original_teacher_id, 'substitute_teacher_id' => $s->substitute_teacher_id,
            'date' => $s->date?->toDateString(), 'reason' => $s->reason, 'assigned_by' => $s->assignedBy?->name ?? '',
            'created_at' => $s->created_at?->toIso8601String()];
    }
}
