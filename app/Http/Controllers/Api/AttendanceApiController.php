<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attendance\RecordAttendance;
use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
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
            'method' => ['required', \Illuminate\Validation\Rule::enum(AttendanceMethod::class)],
            'status' => ['nullable', \Illuminate\Validation\Rule::enum(AttendanceStatus::class)],
            'device_id' => 'nullable|exists:attendance_devices,id',
            'notes' => 'nullable|string|max:1000',
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
     * Hasil bisnis (sudah absen, bukan peserta, dsb.) dikirim HTTP 200 dengan bentuk
     * QrAttendanceResponse di `data`, supaya layar scanner React menampilkan alasannya.
     */
    public function recordByQr(Request $request, AttendanceSession $session): JsonResponse
    {
        $validated = $request->validate([
            'qr_token' => 'required|string|max:100',
            'device_id' => 'nullable|exists:attendance_devices,id',
        ]);

        $device = isset($validated['device_id']) ? AttendanceDevice::find($validated['device_id']) : null;

        // Waktu scan selalu jam server (operator online); antrean offline lewat /offline/attendance/sync
        $result = $this->attendanceService->recordByQrToken(
            session: $session->load('activity'),
            qrToken: $validated['qr_token'],
            device: $device,
            operator: Auth::user(),
        );

        $student = $result->student?->loadMissing(['classroom', 'dormitoryRoom']);
        $record = $result->attendanceRecord?->loadMissing(['device', 'recordedBy', 'student.classroom', 'student.dormitoryRoom']);
        $code = match ($result->code) {
            \App\Enums\AttendanceResultCode::STUDENT_NOT_FOUND => 'INVALID_QR',
            \App\Enums\AttendanceResultCode::SYSTEM_ERROR => 'SERVER_ERROR',
            default => $result->code->value,
        };

        $payload = [
            'success' => $result->success,
            'code' => $code,
            'message' => $result->message,
            'student' => $student ? [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'classroom' => $student->classroom?->name,
                'dormitory_room' => $student->dormitoryRoom?->name,
                'photo_path' => $student->photo,
            ] : null,
        ];

        if ($record && $result->success) {
            $payload['attendance'] = [
                'id' => $record->id,
                'status' => SpaTransformer::val($record->status),
                'method' => SpaTransformer::val($record->method),
                'check_in_at' => $record->check_in_at?->toIso8601String(),
                'late_minutes' => (int) $record->late_minutes,
                'device_name' => $record->device?->device_name,
                'recorded_by' => $record->recordedBy?->name,
            ];
            $payload['newRecord'] = SpaTransformer::record($record);
        } elseif ($record) {
            $payload['existingAttendance'] = [
                'status' => SpaTransformer::val($record->status),
                'method' => SpaTransformer::val($record->method),
                'check_in_at' => $record->check_in_at?->toIso8601String(),
                'recorded_by' => $record->recordedBy?->name,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $payload,
            // kompatibilitas klien lama
            'code' => $code,
            'message' => $result->message,
        ]);
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
