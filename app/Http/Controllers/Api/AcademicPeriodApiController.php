<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AcademicCalendarEvent;
use App\Models\AcademicSchedule;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Models\TeachingAssignment;
use App\Services\Security\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Tahun Ajaran & Semester (tahap 27).
 *
 * Hanya SATU tahun ajaran dan SATU semester (di dalam tahun itu) yang aktif.
 * Pembuat sesi KBM, penugasan, dan jadwal memakai pasangan aktif ini.
 * Data yang sudah dipakai (penugasan/jadwal/kalender) tidak bisa dihapus —
 * relasi database memakai cascade, jadi penghapusan dijaga di sini.
 */
class AcademicPeriodApiController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->payload()]);
    }

    // ================================================================ Tahun ajaran

    public function storeYear(Request $request): JsonResponse
    {
        $data = $this->validateYear($request);
        $data += $request->validate([
            'create_semesters' => 'sometimes|boolean',
            'activate' => 'sometimes|boolean',
        ]);

        $year = DB::transaction(function () use ($data) {
            $year = AcademicYear::create([
                'name' => $data['name'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'is_active' => false,
            ]);
            if ($data['create_semesters'] ?? true) {
                foreach ($this->defaultSemesters($year) as $row) {
                    $year->semesters()->create($row);
                }
            }
            $first = ! AcademicYear::where('is_active', true)->exists();
            if (($data['activate'] ?? false) || $first) {
                $this->activateYear($year);
            }

            return $year;
        });

        AuditService::log(event: 'academic.year.created', auditableType: AcademicYear::class, auditableId: $year->id,
            newValues: $this->year($year->fresh()), reason: "Tahun ajaran {$year->name} dibuat");

        return response()->json(['success' => true, 'message' => "Tahun ajaran {$year->name} dibuat.", 'data' => $this->payload()], 201);
    }

    public function updateYear(Request $request, AcademicYear $year): JsonResponse
    {
        $data = $this->validateYear($request, $year);
        $outside = $year->semesters()
            ->where(fn ($q) => $q->where('start_date', '<', $data['start_date'])->orWhere('end_date', '>', $data['end_date']))
            ->pluck('name')->all();
        if ($outside) {
            return ApiResponse::error('SEMESTER_OUT_OF_RANGE',
                'Tanggal tahun ajaran harus mencakup semua semesternya. Ubah dulu tanggal: ' . implode(', ', $outside) . '.', null, 422);
        }

        $old = $this->year($year);
        $year->update($data);
        AuditService::log(event: 'academic.year.updated', auditableType: AcademicYear::class, auditableId: $year->id,
            oldValues: $old, newValues: $this->year($year), reason: "Tahun ajaran {$year->name} diubah");

        return response()->json(['success' => true, 'message' => 'Tahun ajaran diperbarui.', 'data' => $this->payload()]);
    }

    public function activate(AcademicYear $year): JsonResponse
    {
        $previous = AcademicYear::where('is_active', true)->value('name');
        DB::transaction(fn () => $this->activateYear($year));
        $sem = Semester::where('academic_year_id', $year->id)->where('is_active', true)->value('name');

        AuditService::log(event: 'academic.year.activated', auditableType: AcademicYear::class, auditableId: $year->id,
            oldValues: ['active_year' => $previous], newValues: ['active_year' => $year->name, 'active_semester' => $sem],
            reason: "Tahun ajaran aktif diganti ke {$year->name}");

        $msg = "Tahun ajaran {$year->name} sekarang aktif" . ($sem ? " ({$sem})." : '. Tambahkan semester agar jadwal KBM bisa dibuat.');

        return response()->json(['success' => true, 'message' => $msg, 'data' => $this->payload()]);
    }

    public function destroyYear(AcademicYear $year): JsonResponse
    {
        if ($year->is_active) {
            return ApiResponse::error('YEAR_ACTIVE', 'Tahun ajaran yang sedang aktif tidak bisa dihapus. Aktifkan tahun ajaran lain dahulu.', null, 422);
        }
        $usage = $this->yearUsage($year->id);
        if (array_sum($usage) > 0) {
            return ApiResponse::error('YEAR_IN_USE', 'Tahun ajaran ini sudah dipakai (' . $this->usageText($usage) . ') sehingga tidak bisa dihapus.', $usage, 422);
        }

        $old = $this->year($year);
        DB::transaction(function () use ($year) {
            $year->semesters()->delete();
            $year->delete();
        });
        AuditService::log(event: 'academic.year.deleted', auditableType: AcademicYear::class, auditableId: $old['id'],
            oldValues: $old, reason: "Tahun ajaran {$old['name']} dihapus");

        return response()->json(['success' => true, 'message' => "Tahun ajaran {$old['name']} dihapus.", 'data' => $this->payload()]);
    }

    // ================================================================ Semester

    public function storeSemester(Request $request): JsonResponse
    {
        $data = $this->validateSemester($request);
        $sem = Semester::create($data + ['is_active' => false]);
        $year = $sem->academicYear;
        if ($year->is_active && ! Semester::where('academic_year_id', $year->id)->where('is_active', true)->exists()) {
            $sem->update(['is_active' => true]);
        }
        AuditService::log(event: 'academic.semester.created', auditableType: Semester::class, auditableId: $sem->id,
            newValues: $this->semester($sem), reason: "{$sem->name} {$year->name} dibuat");

        return response()->json(['success' => true, 'message' => "{$sem->name} ditambahkan.", 'data' => $this->payload()], 201);
    }

    public function updateSemester(Request $request, Semester $semester): JsonResponse
    {
        $data = $this->validateSemester($request, $semester);
        $old = $this->semester($semester);
        $semester->update($data);
        AuditService::log(event: 'academic.semester.updated', auditableType: Semester::class, auditableId: $semester->id,
            oldValues: $old, newValues: $this->semester($semester), reason: "{$semester->name} diubah");

        return response()->json(['success' => true, 'message' => 'Semester diperbarui.', 'data' => $this->payload()]);
    }

    public function activateSemester(Semester $semester): JsonResponse
    {
        $year = $semester->academicYear;
        $previous = Semester::where('is_active', true)->with('academicYear')->get()
            ->map(fn ($s) => "{$s->name} {$s->academicYear?->name}")->implode(', ');
        DB::transaction(function () use ($semester, $year) {
            if (! $year->is_active) {
                AcademicYear::where('id', '!=', $year->id)->update(['is_active' => false]);
                $year->update(['is_active' => true]);
            }
            Semester::where('id', '!=', $semester->id)->update(['is_active' => false]);
            $semester->update(['is_active' => true]);
        });
        AuditService::log(event: 'academic.semester.activated', auditableType: Semester::class, auditableId: $semester->id,
            oldValues: ['active_semester' => $previous ?: null], newValues: ['active_semester' => "{$semester->name} {$year->name}"],
            reason: "Semester aktif diganti ke {$semester->name} {$year->name}");

        return response()->json(['success' => true, 'message' => "{$semester->name} {$year->name} sekarang aktif.", 'data' => $this->payload()]);
    }

    public function destroySemester(Semester $semester): JsonResponse
    {
        if ($semester->is_active) {
            return ApiResponse::error('SEMESTER_ACTIVE', 'Semester yang sedang aktif tidak bisa dihapus. Aktifkan semester lain dahulu.', null, 422);
        }
        $usage = [
            'assignments' => TeachingAssignment::where('semester_id', $semester->id)->count(),
            'schedules' => AcademicSchedule::where('semester_id', $semester->id)->count(),
        ];
        if (array_sum($usage) > 0) {
            return ApiResponse::error('SEMESTER_IN_USE', 'Semester ini sudah dipakai (' . $this->usageText($usage) . ') sehingga tidak bisa dihapus.', $usage, 422);
        }
        $old = $this->semester($semester);
        $semester->delete();
        AuditService::log(event: 'academic.semester.deleted', auditableType: Semester::class, auditableId: $old['id'],
            oldValues: $old, reason: "{$old['name']} dihapus");

        return response()->json(['success' => true, 'message' => "{$old['name']} dihapus.", 'data' => $this->payload()]);
    }

    // ================================================================ Helper

    private function validateYear(Request $request, ?AcademicYear $year = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:32', 'regex:/^\d{4}\/\d{4}$/', Rule::unique('academic_years', 'name')->ignore($year?->id)],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ], [
            'name.regex' => 'Format nama tahun ajaran: 2026/2027.',
            'name.unique' => 'Tahun ajaran dengan nama ini sudah ada.',
            'end_date.after' => 'Tanggal selesai harus setelah tanggal mulai.',
        ]);
        [$a, $b] = array_map('intval', explode('/', $data['name']));
        if ($b !== $a + 1) {
            abort(ApiResponse::error('VALIDATION_ERROR', 'Nama tahun ajaran harus dua tahun berurutan, misalnya 2026/2027.', ['name' => ['Tahun kedua harus tahun pertama + 1.']], 422));
        }
        $start = Carbon::parse($data['start_date']);
        $end = Carbon::parse($data['end_date']);
        if ($start->diffInDays($end) > 400) {
            abort(ApiResponse::error('VALIDATION_ERROR', 'Rentang tahun ajaran maksimal sekitar satu tahun.', ['end_date' => ['Rentang terlalu panjang.']], 422));
        }
        $overlap = AcademicYear::when($year, fn ($q) => $q->where('id', '!=', $year->id))
            ->where('start_date', '<=', $end->toDateString())->where('end_date', '>=', $start->toDateString())->value('name');
        if ($overlap) {
            abort(ApiResponse::error('YEAR_OVERLAP', "Tanggalnya bertabrakan dengan tahun ajaran {$overlap}.", ['start_date' => ["Bertabrakan dengan {$overlap}."]], 422));
        }

        return ['name' => $data['name'], 'start_date' => $start->toDateString(), 'end_date' => $end->toDateString()];
    }

    private function validateSemester(Request $request, ?Semester $semester = null): array
    {
        $rules = [
            'code' => ['required', Rule::in(['GANJIL', 'GENAP'])],
            'name' => 'nullable|string|max:32',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ];
        if (! $semester) {
            $rules['academic_year_id'] = 'required|integer|exists:academic_years,id';
        }
        $data = $request->validate($rules, ['end_date.after' => 'Tanggal selesai harus setelah tanggal mulai.']);
        $yearId = $semester?->academic_year_id ?? (int) $data['academic_year_id'];
        $year = AcademicYear::findOrFail($yearId);

        $dup = Semester::where('academic_year_id', $yearId)->where('code', $data['code'])
            ->when($semester, fn ($q) => $q->where('id', '!=', $semester->id))->exists();
        if ($dup) {
            abort(ApiResponse::error('SEMESTER_DUPLICATE', 'Semester ' . ucfirst(strtolower($data['code'])) . " sudah ada di {$year->name}.", ['code' => ['Sudah ada.']], 422));
        }
        $start = Carbon::parse($data['start_date'])->toDateString();
        $end = Carbon::parse($data['end_date'])->toDateString();
        if ($start < $year->start_date->toDateString() || $end > $year->end_date->toDateString()) {
            abort(ApiResponse::error('SEMESTER_OUT_OF_RANGE',
                "Tanggal semester harus di dalam tahun ajaran {$year->name} ({$year->start_date->format('d/m/Y')} – {$year->end_date->format('d/m/Y')}).",
                ['start_date' => ['Di luar tahun ajaran.']], 422));
        }
        $overlap = Semester::where('academic_year_id', $yearId)
            ->when($semester, fn ($q) => $q->where('id', '!=', $semester->id))
            ->where('start_date', '<=', $end)->where('end_date', '>=', $start)->value('name');
        if ($overlap) {
            abort(ApiResponse::error('SEMESTER_OVERLAP', "Tanggalnya bertabrakan dengan {$overlap}.", ['start_date' => ['Bertabrakan.']], 422));
        }

        return [
            'academic_year_id' => $yearId,
            'code' => $data['code'],
            'name' => filled($data['name'] ?? null) ? $data['name'] : ($data['code'] === 'GANJIL' ? 'Semester Ganjil' : 'Semester Genap'),
            'start_date' => $start,
            'end_date' => $end,
        ];
    }

    /** Bagi tahun ajaran menjadi Ganjil & Genap (batas 31 Des / 1 Jan bila tahun ajaran melewati pergantian tahun). */
    private function defaultSemesters(AcademicYear $year): array
    {
        $start = $year->start_date->copy();
        $end = $year->end_date->copy();
        $split = $start->copy()->endOfYear()->startOfDay();
        if ($split->gte($end) || $split->lt($start)) {
            $split = $start->copy()->addDays(intdiv($start->diffInDays($end), 2));
        }

        return [
            ['code' => 'GANJIL', 'name' => 'Semester Ganjil', 'start_date' => $start->toDateString(), 'end_date' => $split->toDateString(), 'is_active' => false],
            ['code' => 'GENAP', 'name' => 'Semester Genap', 'start_date' => $split->copy()->addDay()->toDateString(), 'end_date' => $end->toDateString(), 'is_active' => false],
        ];
    }

    /** Aktifkan tahun ajaran; pilih semester yang memuat hari ini (atau yang pertama) bila belum ada semester aktif di dalamnya. */
    private function activateYear(AcademicYear $year): void
    {
        AcademicYear::where('id', '!=', $year->id)->update(['is_active' => false]);
        $year->update(['is_active' => true]);
        Semester::where('academic_year_id', '!=', $year->id)->update(['is_active' => false]);

        $sems = Semester::where('academic_year_id', $year->id)->orderBy('start_date')->get();
        if ($sems->isEmpty() || $sems->contains('is_active', true)) {
            return;
        }
        $today = today()->toDateString();
        $pick = $sems->first(fn ($s) => $s->start_date->toDateString() <= $today && $s->end_date->toDateString() >= $today)
            ?? ($today > $year->end_date->toDateString() ? $sems->last() : $sems->first());
        $pick->update(['is_active' => true]);
    }

    private function yearUsage(int $yearId): array
    {
        return [
            'assignments' => TeachingAssignment::where('academic_year_id', $yearId)->count(),
            'schedules' => AcademicSchedule::where('academic_year_id', $yearId)->count(),
            'events' => AcademicCalendarEvent::where('academic_year_id', $yearId)->count(),
        ];
    }

    private function usageText(array $usage): string
    {
        $labels = ['assignments' => 'penugasan mengajar', 'schedules' => 'jadwal pelajaran', 'events' => 'agenda kalender'];

        return collect($usage)->filter()->map(fn ($n, $k) => "{$n} {$labels[$k]}")->implode(', ');
    }

    private function payload(): array
    {
        $years = AcademicYear::orderByDesc('start_date')->get();
        $sems = Semester::orderBy('start_date')->get();

        return [
            'academic_years' => $years->map(fn ($y) => $this->year($y) + ['usage' => $this->yearUsage($y->id)])->values(),
            'semesters' => $sems->map(fn ($s) => $this->semester($s))->values(),
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
}
