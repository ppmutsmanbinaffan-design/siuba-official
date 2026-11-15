<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Master data santri (dipakai halaman Data Santri di aplikasi React).
 */
class StudentApiController extends Controller
{
    private const STATUSES = ['active', 'inactive', 'graduated', 'transferred', 'resigned'];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
            'search' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'classroom_id' => 'nullable|integer',
            'dormitory_room_id' => 'nullable|integer',
            'gender' => 'nullable|string|in:male,female,L,P',
            'sort' => 'nullable|string|in:name_asc,name_desc,nis_asc,nis_desc,newest',
        ]);

        $query = Student::query()->with(['classroom', 'dormitoryRoom']);

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%")
                    ->orWhere('nisn', 'like', "%{$search}%")
                    ->orWhere('guardian_name', 'like', "%{$search}%");
            });
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($request->filled('classroom_id')) {
            $query->where('classroom_id', (int) $request->input('classroom_id'));
        }
        if ($request->filled('dormitory_room_id')) {
            $query->where('dormitory_room_id', (int) $request->input('dormitory_room_id'));
        }
        if ($gender = $request->input('gender')) {
            $query->where('gender', in_array($gender, ['male', 'L'], true) ? 'L' : 'P');
        }

        match ($request->input('sort', 'name_asc')) {
            'name_desc' => $query->orderByDesc('name'),
            'nis_asc' => $query->orderBy('student_number'),
            'nis_desc' => $query->orderByDesc('student_number'),
            'newest' => $query->orderByDesc('id'),
            default => $query->orderBy('name'),
        };

        $perPage = (int) $request->input('per_page', 10);
        $page = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => collect($page->items())->map(fn (Student $s) => SpaTransformer::student($s))->values(),
            'meta' => [
                'total' => $page->total(),
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'last_page' => $page->lastPage(),
                'pagination' => [
                    'current_page' => $page->currentPage(),
                    'last_page' => $page->lastPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                ],
            ],
        ]);
    }

    public function show(Student $student): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => SpaTransformer::student($student->load(['classroom', 'dormitoryRoom'])),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['status'] = $data['status'] ?? 'active';
        $data['is_active'] = $data['status'] === 'active';
        $data['generation_year'] = $data['generation_year'] ?? ($data['entry_year'] ?? (int) now()->format('Y'));

        $student = Student::create($data);
        Log::info('Santri dibuat', ['student_id' => $student->id, 'user_id' => $request->user()?->id]);

        return response()->json([
            'success' => true,
            'message' => "Santri {$student->name} berhasil ditambahkan.",
            'data' => SpaTransformer::student($student->fresh(['classroom', 'dormitoryRoom'])),
        ], 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $this->validated($request, $student);

        if (array_key_exists('status', $data)) {
            $data['is_active'] = $data['status'] === 'active';
        } elseif (array_key_exists('is_active', $data)) {
            $data['status'] = $data['is_active'] ? 'active' : 'inactive';
        }

        $student->update($data);
        Log::info('Santri diperbarui', ['student_id' => $student->id, 'fields' => array_keys($data), 'user_id' => $request->user()?->id]);

        return response()->json([
            'success' => true,
            'message' => "Data santri {$student->name} berhasil diperbarui.",
            'data' => SpaTransformer::student($student->fresh(['classroom', 'dormitoryRoom'])),
        ]);
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $student->delete(); // soft delete: riwayat absensi tetap aman
        Log::warning('Santri dihapus (soft delete)', ['student_id' => $student->id, 'user_id' => $request->user()?->id]);

        return response()->json(['success' => true, 'message' => "Santri {$student->name} dipindahkan ke arsip."]);
    }

    private function validated(Request $request, ?Student $student = null): array
    {
        $isUpdate = $student !== null;
        $req = $isUpdate ? 'sometimes' : 'required';

        // Terima gender male/female dari frontend, simpan sebagai L/P
        if ($request->has('gender')) {
            $g = $request->input('gender');
            $request->merge(['gender' => in_array($g, ['male', 'L'], true) ? 'L' : (in_array($g, ['female', 'P'], true) ? 'P' : $g)]);
        }
        // String kosong dari form -> null
        foreach (['classroom_id', 'dormitory_room_id', 'rfid_uid', 'birth_date', 'nisn'] as $k) {
            if ($request->has($k) && $request->input($k) === '') {
                $request->merge([$k => null]);
            }
        }
        if ($request->filled('rfid_uid')) {
            $request->merge(['rfid_uid' => Student::normalizeRfidUid((string) $request->input('rfid_uid'))]);
        }

        $data = $request->validate([
            'student_number' => [$req, 'string', 'max:30', Rule::unique('students', 'student_number')->ignore($student?->id)],
            'nisn' => ['nullable', 'string', 'max:20'],
            'name' => [$req, 'string', 'max:150'],
            'nickname' => ['nullable', 'string', 'max:100'],
            'gender' => [$req, 'in:L,P'],
            'birth_place' => ['nullable', 'string', 'max:100'],
            'birth_date' => ['nullable', 'date'],
            'classroom_id' => ['nullable', 'integer', 'exists:classrooms,id'],
            'dormitory_room_id' => ['nullable', 'integer', 'exists:dormitory_rooms,id'],
            'generation_year' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'entry_year' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'photo' => ['nullable', 'string', 'max:2048'],
            'guardian_name' => ['nullable', 'string', 'max:150'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'is_active' => ['sometimes', 'boolean'],
            'rfid_uid' => ['nullable', 'string', 'max:64', Rule::unique('students', 'rfid_uid')->ignore($student?->id),
                function ($attr, $value, $fail) {
                    if ($value && \App\Models\StaffProfile::withTrashed()->where('rfid_uid', $value)->exists()) {
                        $fail('Kartu RFID ini sudah terdaftar pada seorang guru/SDM.');
                    }
                }],
        ], [
            'student_number.unique' => 'NIS ini sudah digunakan oleh santri lain.',
            'rfid_uid.unique' => 'Kartu RFID ini sudah terdaftar pada santri lain.',
        ]);

        // Foto base64 besar tidak disimpan di kolom teks
        if (isset($data['photo']) && str_starts_with((string) $data['photo'], 'data:')) {
            unset($data['photo']);
        }

        return $data;
    }
}
