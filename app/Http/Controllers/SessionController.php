<?php

namespace App\Http\Controllers;

use App\Actions\Attendance\GenerateAttendanceSession;
use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Services\Attendance\SessionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SessionController extends Controller
{
    public function __construct(
        protected SessionService $sessionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = AttendanceSession::with(['activity', 'openedByUser', 'closedByUser'])
            ->withCount('records')
            ->latest('session_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date')) {
            $query->whereDate('session_date', $request->date);
        }

        return response()->json($query->paginate(20));
    }

    public function create()
    {
        return response()->json([
            'statuses' => SessionStatus::cases(),
        ]);
    }

    public function store(Request $request, GenerateAttendanceSession $action): JsonResponse
    {
        $validated = $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'session_date' => 'required|date',
            'start_at' => 'required|date',
            'present_until' => 'required|date|after_or_equal:start_at',
            'late_until' => 'required|date|after_or_equal:present_until',
            'end_at' => 'required|date|after_or_equal:late_until',
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'auto_open' => 'nullable|boolean',
        ]);

        $date = Carbon::parse($validated['session_date'], 'Asia/Jakarta');
        $customAttributes = [
            'start_at' => Carbon::parse($validated['start_at'], 'Asia/Jakarta'),
            'present_until' => Carbon::parse($validated['present_until'], 'Asia/Jakarta'),
            'late_until' => Carbon::parse($validated['late_until'], 'Asia/Jakarta'),
            'end_at' => Carbon::parse($validated['end_at'], 'Asia/Jakarta'),
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];

        $session = $action->execute(
            activityId: $validated['activity_id'],
            date: $date,
            customAttributes: $customAttributes,
            creator: Auth::user(),
            autoOpen: $validated['auto_open'] ?? false
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Sesi absensi berhasil dibuat.',
            'data' => $session->load('activity'),
        ], 201);
    }

    public function show(AttendanceSession $session): JsonResponse
    {
        $session->load([
            'activity',
            'openedByUser',
            'closedByUser',
            'participants.student',
            'records.student',
            'records.device'
        ]);

        return response()->json([
            'session' => $session,
            'stats' => $this->sessionService->getSessionStats($session),
        ]);
    }

    public function open(AttendanceSession $session): JsonResponse
    {
        $session = $this->sessionService->openSession($session, Auth::user());

        return response()->json([
            'status' => 'success',
            'message' => "Sesi {$session->session_code} berhasil dibuka.",
            'data' => $session,
        ]);
    }

    public function close(AttendanceSession $session): JsonResponse
    {
        $session = $this->sessionService->closeSession($session, Auth::user());

        return response()->json([
            'status' => 'success',
            'message' => "Sesi {$session->session_code} berhasil ditutup.",
            'data' => $session,
        ]);
    }

    public function cancel(AttendanceSession $session): JsonResponse
    {
        $session = $this->sessionService->cancelSession($session, Auth::user());

        return response()->json([
            'status' => 'success',
            'message' => "Sesi {$session->session_code} telah dibatalkan.",
            'data' => $session,
        ]);
    }
}
