<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attendance\RecordAttendance;
use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\SessionService;
use App\Services\Identity\StudentIdentityResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceApiController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected SessionService $sessionService,
        protected StudentIdentityResolver $identityResolver
    ) {}

    /**
     * Standard Attendance Recording by student ID.
     */
    public function record(Request $request, AttendanceSession $session, RecordAttendance $action): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'method' => 'required|string',
            'status' => 'nullable|string',
            'device_id' => 'nullable|exists:attendance_devices,id',
            'notes' => 'nullable|string',
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $method = AttendanceMethod::from($validated['method']);
        $overrideStatus = isset($validated['status']) ? AttendanceStatus::from($validated['status']) : null;
        $device = isset($validated['device_id']) ? AttendanceDevice::find($validated['device_id']) : null;

        $result = $action->execute(
            session: $session,
            student: $student,
            method: $method,
            device: $device,
            operator: Auth::user(),
            overrideStatus: $overrideStatus,
            notes: $validated['notes'] ?? null
        );

        return response()->json([
            'success' => $result->success,
            'code' => $result->code->value,
            'message' => $result->message,
            'record' => $result->attendanceRecord,
            'student' => $result->student,
        ], $result->success ? 200 : 422);
    }

    /**
     * Record Attendance via QR Token Scan.
     */
    public function recordByQr(Request $request, AttendanceSession $session): JsonResponse
    {
        $validated = $request->validate([
            'qr_token' => 'required|string',
            'device_id' => 'nullable|exists:attendance_devices,id',
            'timestamp' => 'nullable|date',
        ]);

        $device = isset($validated['device_id']) ? AttendanceDevice::find($validated['device_id']) : null;
        $checkInTime = isset($validated['timestamp']) ? Carbon::parse($validated['timestamp']) : null;

        $result = $this->attendanceService->recordByQrToken(
            session: $session,
            qrToken: $validated['qr_token'],
            device: $device,
            operator: Auth::user(),
            checkInTime: $checkInTime
        );

        return response()->json([
            'success' => $result->success,
            'code' => $result->code->value,
            'message' => $result->message,
            'record' => $result->attendanceRecord,
            'student' => $result->student,
        ], $result->success ? 200 : 422);
    }

    /**
     * Get real-time stats for an active session.
     */
    public function sessionStats(AttendanceSession $session): JsonResponse
    {
        $stats = $this->sessionService->getSessionStats($session);

        return response()->json([
            'session_id' => $session->id,
            'session_code' => $session->session_code,
            'status' => $session->status->value,
            'stats' => $stats,
        ]);
    }
}
