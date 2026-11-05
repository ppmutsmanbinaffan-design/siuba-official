<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Services\Sync\OfflineSyncService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OfflineSyncApiController extends Controller
{
    public function __construct(
        protected OfflineSyncService $syncService
    ) {}

    /**
     * Health & Connectivity Check Endpoint
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'server_time' => Carbon::now('Asia/Jakarta')->toIso8601String(),
            'app_version' => 'v1.10.0-pwa',
            'database' => 'connected',
            'timezone' => 'Asia/Jakarta',
        ]);
    }

    /**
     * Prepare & Preload Session for Offline Use in PWA IndexedDB
     */
    public function prepareSession(AttendanceSession $session): JsonResponse
    {
        $session->load(['activity.category']);

        $participants = AttendanceSessionParticipant::where('attendance_session_id', $session->id)
            ->where('eligibility_status', '!=', 'ineligible')
            ->with(['student.classroom', 'student.dormitoryRoom'])
            ->get()
            ->map(fn($p) => [
                'session_id' => $session->id,
                'student_id' => $p->student_id,
                'student_number' => $p->student->student_number ?? '',
                'name' => $p->student->name ?? '',
                'classroom_name' => $p->student->classroom->name ?? '',
                'dormitory_room_name' => $p->student->dormitoryRoom->name ?? '',
                'qr_token' => $p->student->qr_token ?? "UBA-STU-{$p->student->student_number}-{$p->student_id}",
                'rfid_uid' => $p->student->rfid_uid ?? null,
                'status_at_cache' => $p->current_status ?? 'present',
            ]);

        $cachedSession = [
            'session_id' => $session->id,
            'session_code' => $session->session_code,
            'activity_id' => $session->activity_id,
            'activity_name' => $session->activity->name ?? 'Kegiatan',
            'category_name' => $session->activity->category->name ?? 'Umum',
            'start_at' => $session->start_at?->toIso8601String(),
            'present_until' => $session->present_until?->toIso8601String(),
            'late_until' => $session->late_until?->toIso8601String(),
            'end_at' => $session->end_at?->toIso8601String(),
            'status_at_cache_time' => $session->status->value,
            'allow_manual' => $session->activity->allow_manual ?? true,
            'allow_qr' => $session->activity->allow_qr ?? true,
            'allow_rfid' => $session->activity->allow_rfid ?? true,
            'participant_count' => $participants->count(),
            'cached_at' => Carbon::now('Asia/Jakarta')->toIso8601String(),
            'snapshot_version' => "v_{$session->id}_" . time(),
        ];

        return response()->json([
            'success' => true,
            'session' => $cachedSession,
            'participants' => $participants,
        ]);
    }

    /**
     * Batch Sync Offline Attendance Items
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.client_request_id' => 'required|string',
            'items.*.local_id' => 'required|string',
            'items.*.session_id' => 'required|integer',
            'items.*.student_id' => 'required|integer',
            'items.*.method' => 'nullable|string',
            'items.*.status' => 'nullable|string',
            'items.*.captured_at_client' => 'nullable|string',
            'items.*.estimated_server_time' => 'nullable|string',
            'items.*.clock_offset_ms' => 'nullable|integer',
            'items.*.notes' => 'nullable|string',
            'items.*.installation_id' => 'nullable|string',
        ]);

        $batchResult = $this->syncService->processBatchSync($validated['items'], Auth::user());

        return response()->json($batchResult, $batchResult['success'] ? 200 : 207);
    }
}
