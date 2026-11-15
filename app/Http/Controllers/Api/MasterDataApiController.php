<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use Illuminate\Http\JsonResponse;
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
}
