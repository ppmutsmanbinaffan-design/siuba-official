<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Transformers\SpaTransformer;
use App\Models\StudentExcusal;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Izin / sakit / dispensasi santri (sebelumnya hanya disimpan di localStorage browser).
 */
class StudentExcusalApiController extends Controller
{
    private const WITH = ['student.classroom', 'student.dormitoryRoom', 'approver'];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'status' => ['nullable', Rule::in(StudentExcusal::STATUSES)],
            'student_id' => 'nullable|integer',
        ]);

        $from = Carbon::parse($request->input('from', today()->subDays(30)->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', today()->addDays(30)->toDateString()))->endOfDay();

        $rows = StudentExcusal::with(self::WITH)
            ->where('start_at', '<=', $to)->where('end_at', '>=', $from)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', (int) $request->input('student_id')))
            ->orderByDesc('start_at')
            ->limit(2000)
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn ($e) => SpaTransformer::excusal($e))->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'type' => ['required', Rule::in(StudentExcusal::TYPES)],
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
            'reason' => 'required|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'status' => ['nullable', Rule::in(['pending', 'approved'])],
        ], [
            'end_at.after_or_equal' => 'Waktu selesai izin harus sama atau setelah waktu mulai.',
        ]);

        $user = $request->user();
        // Petugas berwenang (izin attendance.excuses) -> langsung disetujui, kecuali diminta 'pending'
        $canApprove = $user?->can('attendance.excuses') ?? false;
        $status = ($data['status'] ?? 'approved') === 'approved' && $canApprove ? 'approved' : 'pending';

        $excusal = StudentExcusal::create([
            'student_id' => $data['student_id'],
            'type' => $data['type'],
            'start_at' => Carbon::parse($data['start_at']),
            'end_at' => Carbon::parse($data['end_at']),
            'reason' => $data['reason'],
            'notes' => $data['notes'] ?? null,
            'status' => $status,
            'approved_by' => $status === 'approved' ? $user?->id : null,
            'approved_at' => $status === 'approved' ? now() : null,
            'created_by' => $user?->id,
            'created_by_name' => $user?->name,
        ]);

        Log::info('Izin santri dibuat', ['excusal_id' => $excusal->id, 'status' => $status, 'user_id' => $user?->id]);

        return response()->json([
            'success' => true,
            'message' => $status === 'approved' ? 'Surat izin disimpan dan disetujui.' : 'Surat izin disimpan, menunggu persetujuan.',
            'data' => SpaTransformer::excusal($excusal->load(self::WITH)),
        ], 201);
    }

    public function approve(Request $request, StudentExcusal $excusal): JsonResponse
    {
        return $this->transition($request, $excusal, 'approved', ['pending', 'rejected']);
    }

    public function reject(Request $request, StudentExcusal $excusal): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string|max:500']);

        return $this->transition($request, $excusal, 'rejected', ['pending', 'approved']);
    }

    public function cancel(Request $request, StudentExcusal $excusal): JsonResponse
    {
        return $this->transition($request, $excusal, 'cancelled', ['pending', 'approved']);
    }

    private function transition(Request $request, StudentExcusal $excusal, string $to, array $allowedFrom): JsonResponse
    {
        if (!in_array($excusal->status, $allowedFrom, true)) {
            return ApiResponse::error('INVALID_EXCUSAL_TRANSITION', "Izin berstatus '{$excusal->status}' tidak dapat diubah menjadi '{$to}'.", null, 409);
        }

        $user = $request->user();
        $update = ['status' => $to];
        if ($to === 'approved') {
            $update += ['approved_by' => $user?->id, 'approved_at' => now()];
        }
        if ($to === 'rejected') {
            $reason = trim((string) $request->input('reason', ''));
            $update['notes'] = $reason !== '' ? "Ditolak: {$reason}" : ($excusal->notes ?: 'Ditolak oleh Musyrif/Admin');
        }
        $excusal->update($update);

        Log::info('Status izin santri diubah', ['excusal_id' => $excusal->id, 'to' => $to, 'user_id' => $user?->id]);

        return response()->json(['success' => true, 'data' => SpaTransformer::excusal($excusal->fresh(self::WITH))]);
    }
}
