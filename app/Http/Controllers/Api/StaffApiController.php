<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\StaffProfile;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Master data SDM: guru, pelatih, musyrif, staf (aplikasi React — sebelumnya hanya localStorage).
 */
class StaffApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:500',
            'search' => 'nullable|string|max:100',
            'staff_type' => ['nullable', Rule::in(StaffProfile::TYPES)],
            'employment_status' => ['nullable', Rule::in(StaffProfile::EMPLOYMENT)],
            'is_active' => 'nullable|in:true,false,1,0,active,inactive',
            'sort' => 'nullable|string|in:name_asc,name_desc,number_asc,number_desc,newest',
        ]);

        $q = StaffProfile::query()->with('user');

        if ($search = trim((string) $request->input('search', ''))) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('staff_number', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            });
        }
        if ($t = $request->input('staff_type')) $q->where('staff_type', $t);
        if ($e = $request->input('employment_status')) $q->where('employment_status', $e);
        if ($request->filled('is_active')) {
            $q->where('is_active', in_array($request->input('is_active'), ['true', '1', 'active'], true));
        }

        match ($request->input('sort', 'name_asc')) {
            'name_desc' => $q->orderByDesc('name'),
            'number_asc' => $q->orderBy('staff_number'),
            'number_desc' => $q->orderByDesc('staff_number'),
            'newest' => $q->orderByDesc('id'),
            default => $q->orderBy('name'),
        };

        $page = $q->paginate((int) $request->input('per_page', 10));

        return response()->json([
            'success' => true,
            'data' => collect($page->items())->map(fn ($s) => SpaTransformer::staff($s))->values(),
            'meta' => [
                'total' => $page->total(), 'page' => $page->currentPage(),
                'per_page' => $page->perPage(), 'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(StaffProfile $staff): JsonResponse
    {
        return response()->json(['success' => true, 'data' => SpaTransformer::staff($staff->load('user'))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $staff = StaffProfile::create($data);
        Log::info('SDM dibuat', ['staff_id' => $staff->id, 'user_id' => $request->user()?->id]);

        return response()->json([
            'success' => true,
            'message' => "Data SDM {$staff->name} berhasil ditambahkan.",
            'data' => SpaTransformer::staff($staff->fresh('user')),
        ], 201);
    }

    public function update(Request $request, StaffProfile $staff): JsonResponse
    {
        $data = $this->validated($request, $staff);
        if (array_key_exists('is_active', $data) && !$data['is_active'] && empty($staff->leave_date) && empty($data['leave_date'])) {
            $data['leave_date'] = now()->toDateString();
        }
        $staff->update($data);
        Log::info('SDM diperbarui', ['staff_id' => $staff->id, 'fields' => array_keys($data), 'user_id' => $request->user()?->id]);

        return response()->json([
            'success' => true,
            'message' => "Data SDM {$staff->name} berhasil diperbarui.",
            'data' => SpaTransformer::staff($staff->fresh('user')),
        ]);
    }

    /** Buat QR baru (QR lama tidak berlaku lagi — misal kartu hilang). */
    public function regenerateQr(Request $request, StaffProfile $staff): JsonResponse
    {
        $staff->update(['qr_token' => StaffProfile::generateUniqueQrToken()]);
        Log::warning('QR SDM diganti', ['staff_id' => $staff->id, 'user_id' => $request->user()?->id]);

        return response()->json(['success' => true, 'message' => "QR {$staff->name} berhasil diganti.", 'data' => SpaTransformer::staff($staff->fresh('user'))]);
    }

    private function validated(Request $request, ?StaffProfile $staff = null): array
    {
        $req = $staff ? 'sometimes' : 'required';

        if ($request->has('gender')) {
            $g = $request->input('gender');
            $request->merge(['gender' => in_array($g, ['female', 'P'], true) ? 'P' : 'L']);
        }
        foreach (['user_id', 'rfid_uid', 'join_date', 'leave_date', 'email'] as $k) {
            if ($request->has($k) && $request->input($k) === '') $request->merge([$k => null]);
        }
        if ($request->filled('rfid_uid')) {
            $request->merge(['rfid_uid' => Student::normalizeRfidUid((string) $request->input('rfid_uid'))]);
        }

        $data = $request->validate([
            'staff_number' => [$req, 'string', 'max:40', Rule::unique('staff_profiles', 'staff_number')->ignore($staff?->id)],
            'name' => [$req, 'string', 'max:150'],
            'gender' => [$req, 'in:L,P'],
            'staff_type' => [$req, Rule::in(StaffProfile::TYPES)],
            'employment_status' => [$req, Rule::in(StaffProfile::EMPLOYMENT)],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:191'],
            'department' => ['nullable', 'string', 'max:100'],
            'position' => ['nullable', 'string', 'max:100'],
            'join_date' => ['nullable', 'date'],
            'leave_date' => ['nullable', 'date'],
            'requires_daily_attendance' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'user_id' => ['nullable', 'integer', 'exists:users,id', Rule::unique('staff_profiles', 'user_id')->ignore($staff?->id)],
            'rfid_uid' => [
                'nullable', 'string', 'max:64',
                Rule::unique('staff_profiles', 'rfid_uid')->ignore($staff?->id),
                function ($attr, $value, $fail) {
                    if ($value && Student::withTrashed()->where('rfid_uid', $value)->exists()) {
                        $fail('Kartu RFID ini sudah terdaftar pada seorang santri.');
                    }
                },
            ],
            'photo' => ['nullable', 'string', 'max:2048'],
        ], [
            'staff_number.unique' => 'Nomor SDM / NIP ini sudah digunakan.',
            'user_id.unique' => 'Akun login ini sudah terhubung ke data SDM lain.',
            'rfid_uid.unique' => 'Kartu RFID ini sudah terdaftar pada SDM lain.',
        ]);

        if (isset($data['photo']) && str_starts_with((string) $data['photo'], 'data:')) {
            unset($data['photo']);
        }

        return $data;
    }
}
