<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Log audit server (perubahan peran, backup/restore, reset, koreksi, perangkat, dll.) untuk halaman Audit Keamanan.
 */
class AuditLogApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'limit' => 'nullable|integer|min:1|max:1000',
            'event' => 'nullable|string|max:60',
        ]);

        $logs = AuditLog::with('user')
            ->when($request->filled('event'), fn ($q) => $q->where('event', $request->input('event')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($request->integer('limit', 500))
            ->get()
            ->map(fn (AuditLog $l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'user_name' => $l->user?->name ?? ($l->attendance_device_id ? 'Perangkat' : 'Sistem'),
                'role' => $l->user?->getRoleNames()->first(),
                'attendance_device_id' => $l->attendance_device_id,
                'client_installation_id' => $l->client_installation_id,
                'event' => $l->event,
                'auditable_type' => class_basename((string) $l->auditable_type) ?: '-',
                'auditable_id' => $l->auditable_id,
                'old_values' => $l->old_values,
                'new_values' => $l->new_values,
                'reason' => $l->reason,
                'ip_address' => $l->ip_address,
                'user_agent_summary' => $l->user_agent_summary,
                'created_at' => $l->created_at?->toIso8601String(),
                'source' => 'server',
            ])
            ->values();

        return response()->json(['success' => true, 'data' => $logs]);
    }
}
