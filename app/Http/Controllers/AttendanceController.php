<?php

namespace App\Http\Controllers;

use App\Actions\Attendance\BulkRecordAttendance;
use App\Actions\Attendance\RecordAttendance;
use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Models\Activity;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AttendanceController extends Controller
{
    public function dashboard()
    {
        $today = now('Asia/Jakarta')->toDateString();
        $totalStudents = Student::where('is_active', true)->count();
        $activeSessions = AttendanceSession::where('status', 'open')->count();
        $todayRecords = AttendanceRecord::whereDate('check_in_at', $today)->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_students' => $totalStudents,
                'active_sessions' => $activeSessions,
                'today_records' => $todayRecords,
            ],
        ]);
    }

    public function students(Request $request)
    {
        $query = Student::with(['classroom', 'dormitoryRoom']);
        if ($request->has('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }
        return response()->json($query->paginate(25));
    }

    public function classrooms()
    {
        return response()->json(Classroom::withCount('students')->get());
    }

    public function dormitories()
    {
        return response()->json(Dormitory::with('rooms.students')->get());
    }

    public function activities()
    {
        return response()->json(Activity::with('category')->get());
    }

    public function manualSheet(AttendanceSession $session)
    {
        $session->load(['activity', 'participants.student', 'records.student']);
        return response()->json([
            'session' => $session,
            'participants' => $session->participants,
            'records' => $session->records,
        ]);
    }

    public function record(Request $request, AttendanceSession $session, RecordAttendance $action): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'method' => 'required|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'device_id' => 'nullable|exists:attendance_devices,id',
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $method = AttendanceMethod::from($validated['method']);
        $status = isset($validated['status']) ? AttendanceStatus::from($validated['status']) : null;
        $device = isset($validated['device_id']) ? AttendanceDevice::find($validated['device_id']) : null;

        $result = $action->execute(
            session: $session,
            student: $student,
            method: $method,
            device: $device,
            operator: Auth::user(),
            overrideStatus: $status,
            notes: $validated['notes'] ?? null
        );

        return response()->json([
            'success' => $result->success,
            'code' => $result->code->value,
            'message' => $result->message,
            'data' => $result->attendanceRecord,
        ], $result->success ? 200 : 422);
    }

    public function bulkRecord(Request $request, AttendanceSession $session, BulkRecordAttendance $action): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.student_id' => 'required|exists:students,id',
            'items.*.status' => 'required|string',
            'items.*.notes' => 'nullable|string',
        ]);

        $results = $action->execute(
            session: $session,
            items: $validated['items'],
            operator: Auth::user()
        );

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    public function history(Request $request)
    {
        $query = AttendanceRecord::with(['student', 'session.activity', 'device', 'operator'])
            ->latest('check_in_at');

        if ($request->filled('date')) {
            $query->whereDate('check_in_at', $request->date);
        }
        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        return response()->json($query->paginate(30));
    }

    public function devices()
    {
        return response()->json(AttendanceDevice::all());
    }

    public function users()
    {
        return response()->json(User::with('roles')->get());
    }

    public function roles()
    {
        return response()->json(Role::with('permissions')->get());
    }

    public function permissions()
    {
        return response()->json(Permission::all());
    }

    public function settings()
    {
        return response()->json([
            'app_name' => config('app.name'),
            'timezone' => config('app.timezone'),
            'locale' => config('app.locale'),
            'version' => '1.0.0-PROD',
        ]);
    }
}
