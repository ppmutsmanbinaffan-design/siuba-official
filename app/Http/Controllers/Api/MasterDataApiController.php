<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Responses\ApiResponse;
use Illuminate\Support\Facades\DB;

/**
 * Data referensi kelas, asrama, dan kamar.
 */
class MasterDataApiController extends Controller
{
    public function classrooms(): JsonResponse
    {
        $rows = Classroom::query()
            ->select('classrooms.*', DB::raw('users.name as homeroom_teacher_name'))
            ->withCount('students')
            ->leftJoin('users', 'users.id', '=', 'classrooms.homeroom_teacher_id')
            ->orderBy('grade_level')->orderBy('classrooms.name')
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($c) => SpaTransformer::classroom($c))->values()]);
    }

    public function dormitories(): JsonResponse
    {
        $rows = Dormitory::withCount('rooms')->orderBy('name')->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($d) => SpaTransformer::dormitory($d))->values()]);
    }

    public function dormitoryRooms(): JsonResponse
    {
        $rows = DormitoryRoom::query()
            ->select('dormitory_rooms.*', DB::raw('users.name as supervisor_name'))
            ->with('dormitory')
            ->withCount('students')
            ->leftJoin('users', 'users.id', '=', 'dormitory_rooms.supervisor_id')
            ->orderBy('dormitory_rooms.name')
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($r) => SpaTransformer::dormitoryRoom($r))->values()]);
    }

    // ================================================================== Tulis (dari halaman Kelas & Asrama)

    /** Nama wali kelas / pembina kamar diketik bebas di aplikasi: dicocokkan ke akun pengguna bila ada. */
    private function userIdFor(Request $request, string $idField, string $nameField): ?int
    {
        if ($request->filled($idField) && \App\Models\User::whereKey($request->input($idField))->exists()) {
            return (int) $request->input($idField);
        }
        $name = trim((string) $request->input($nameField, ''));

        return $name !== '' ? \App\Models\User::where('name', $name)->value('id') : null;
    }

    public function storeClassroom(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:30',
            'grade_level' => 'required|integer|between:1,12',
            'academic_year' => 'nullable|string|max:20',
            'capacity' => 'nullable|integer|min:1|max:200',
        ]);
        if (Classroom::where('name', $data['name'])->where('academic_year', $data['academic_year'] ?? '2026/2027')->exists()) {
            return ApiResponse::error('DUPLICATE_CLASSROOM', "Kelas '{$data['name']}' sudah ada pada tahun ajaran itu.", null, 409);
        }
        $c = Classroom::create(array_filter($data, fn ($v) => $v !== null) + [
            'homeroom_teacher_id' => $this->userIdFor($request, 'homeroom_teacher_id', 'homeroom_teacher'),
            'is_active' => true,
        ]);

        return response()->json(['success' => true, 'message' => "Kelas '{$c->name}' berhasil ditambahkan.", 'data' => ['id' => $c->id]], 201);
    }

    public function updateClassroom(Request $request, Classroom $classroom): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'grade_level' => 'sometimes|integer|between:1,12',
            'academic_year' => 'sometimes|nullable|string|max:20',
            'capacity' => 'sometimes|nullable|integer|min:1|max:200',
            'is_active' => 'sometimes|boolean',
        ]);
        if ($request->hasAny(['homeroom_teacher', 'homeroom_teacher_id'])) {
            $data['homeroom_teacher_id'] = $this->userIdFor($request, 'homeroom_teacher_id', 'homeroom_teacher');
        }
        $classroom->update($data);

        return response()->json(['success' => true, 'message' => 'Data kelas berhasil diperbarui.']);
    }

    public function deleteClassroom(Classroom $classroom): JsonResponse
    {
        // Kelas yang dipakai jadwal/riwayat KBM tidak dihapus (akan ikut menghapus jadwal & riwayat): dinonaktifkan
        $inUse = \App\Models\AcademicSchedule::where('classroom_id', $classroom->id)->exists()
            || \App\Models\AcademicSessionContext::where('classroom_id', $classroom->id)->exists()
            || \App\Models\TeachingAssignment::where('classroom_id', $classroom->id)->exists();
        if ($inUse) {
            $classroom->update(['is_active' => false]);

            return response()->json(['success' => true, 'message' => "Kelas '{$classroom->name}' masih dipakai jadwal/riwayat KBM, jadi dinonaktifkan (tidak dihapus)."]);
        }
        $classroom->delete(); // santri di kelas ini menjadi tanpa kelas

        return response()->json(['success' => true, 'message' => "Kelas '{$classroom->name}' dihapus. Santri di kelas itu kini tanpa kelas."]);
    }

    public function storeDormitory(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:150', 'gender' => 'required|in:L,P']);
        $d = Dormitory::create($data + ['is_active' => true]);

        return response()->json(['success' => true, 'message' => "Gedung asrama '{$d->name}' berhasil ditambahkan.", 'data' => ['id' => $d->id]], 201);
    }

    public function updateDormitory(Request $request, Dormitory $dormitory): JsonResponse
    {
        $dormitory->update($request->validate(['name' => 'sometimes|string|max:150', 'gender' => 'sometimes|in:L,P', 'is_active' => 'sometimes|boolean']));

        return response()->json(['success' => true, 'message' => 'Data gedung asrama berhasil diperbarui.']);
    }

    public function deleteDormitory(Dormitory $dormitory): JsonResponse
    {
        $students = \App\Models\Student::whereIn('dormitory_room_id', $dormitory->rooms()->pluck('id'))->count();
        if ($students > 0) {
            return ApiResponse::error('DORMITORY_NOT_EMPTY', "Asrama '{$dormitory->name}' masih dihuni {$students} santri. Pindahkan santrinya dulu, atau nonaktifkan asrama.", null, 409);
        }
        $dormitory->delete(); // kamar ikut terhapus

        return response()->json(['success' => true, 'message' => "Gedung asrama '{$dormitory->name}' dan kamarnya dihapus."]);
    }

    public function storeRoom(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dormitory_id' => 'required|integer|exists:dormitories,id',
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:30',
            'capacity' => 'nullable|integer|min:1|max:500',
        ]);
        $r = DormitoryRoom::create(array_filter($data, fn ($v) => $v !== null) + [
            'supervisor_id' => $this->userIdFor($request, 'supervisor_id', 'supervisor'),
            'is_active' => true,
        ]);

        return response()->json(['success' => true, 'message' => "Kamar '{$r->name}' berhasil ditambahkan.", 'data' => ['id' => $r->id]], 201);
    }

    public function updateRoom(Request $request, DormitoryRoom $room): JsonResponse
    {
        $data = $request->validate([
            'dormitory_id' => 'sometimes|integer|exists:dormitories,id',
            'name' => 'sometimes|string|max:150',
            'capacity' => 'sometimes|nullable|integer|min:1|max:500',
            'is_active' => 'sometimes|boolean',
        ]);
        if ($request->hasAny(['supervisor', 'supervisor_id'])) {
            $data['supervisor_id'] = $this->userIdFor($request, 'supervisor_id', 'supervisor');
        }
        $room->update($data);

        return response()->json(['success' => true, 'message' => 'Data kamar berhasil diperbarui.']);
    }

    public function deleteRoom(DormitoryRoom $room): JsonResponse
    {
        $room->delete(); // santri di kamar ini menjadi tanpa kamar

        return response()->json(['success' => true, 'message' => "Kamar '{$room->name}' dihapus. Santri di kamar itu kini tanpa kamar."]);
    }
}
