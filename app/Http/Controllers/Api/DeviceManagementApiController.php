<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Transformers\SpaTransformer;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;
use App\Models\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Kelola whitelist perangkat RFID / ESP32 (aktivasi, nonaktifkan, ganti nama & lokasi).
 */
class DeviceManagementApiController extends Controller
{
    public function index(): JsonResponse
    {
        $threshold = (int) config('services.nexabsen.offline_threshold_seconds', 60);

        $devices = AttendanceDevice::orderByDesc('is_active')->orderBy('device_code')->get()
            ->map(fn (AttendanceDevice $d) => [
                'id' => $d->id,
                'device_code' => $d->device_code,
                'device_name' => $d->device_name,
                'device_type' => $d->device_type?->value ?? $d->device_type,
                'location' => $d->location,
                'is_active' => (bool) $d->is_active,
                'status' => !$d->is_active ? 'menunggu_aktivasi_atau_nonaktif'
                    : ($d->last_seen_at && $d->last_seen_at->diffInSeconds(now(), true) <= $threshold ? 'online' : 'offline'),
                'ip_address' => $d->ip_address,
                'last_seen_at' => $d->last_seen_at?->format('Y-m-d H:i:s'),
            ]);

        return response()->json(['success' => true, 'devices' => $devices]);
    }

    public function update(Request $request, AttendanceDevice $device): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'device_name' => 'sometimes|string|max:100',
            'location' => 'sometimes|nullable|string|max:100',
        ]);

        $device->update($data);

        Log::info('Perangkat RFID diperbarui', [
            'device_code' => $device->device_code,
            'changes' => $data,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Perangkat {$device->device_code} berhasil diperbarui" . (isset($data['is_active']) ? ($data['is_active'] ? ' (AKTIF).' : ' (NONAKTIF).') : '.'),
            'device' => $device->fresh(),
        ]);
    }

    /**
     * Daftar perangkat dalam bentuk yang dibaca aplikasi React (halaman Perangkat / Monitoring RFID).
     * Route: GET /api/v1/attendance/devices
     */
    public function spaIndex(): JsonResponse
    {
        $taps = AttendanceRecord::whereDate('check_in_at', today())
            ->whereNotNull('attendance_device_id')
            ->selectRaw('attendance_device_id, COUNT(*) as total')
            ->groupBy('attendance_device_id')
            ->pluck('total', 'attendance_device_id');

        $devices = AttendanceDevice::orderByDesc('is_active')->orderBy('device_code')->get()
            ->map(fn (AttendanceDevice $d) => SpaTransformer::device($d, (int) ($taps[$d->id] ?? 0)))
            ->values();

        return response()->json(['success' => true, 'data' => $devices]);
    }

    /**
     * Riwayat kejadian perangkat (200 terbaru).
     * Route: GET /api/v1/attendance/devices/logs, GET /api/v1/attendance/devices/{device}/logs
     */
    public function logs(Request $request, ?AttendanceDevice $device = null): JsonResponse
    {
        $request->validate(['limit' => 'nullable|integer|min:1|max:1000', 'level' => 'nullable|in:info,warning,error']);

        $logs = AttendanceDeviceLog::query()
            ->when($device, fn ($q) => $q->where('attendance_device_id', $device->id))
            ->when($request->filled('level'), fn ($q) => $q->where('level', $request->input('level')))
            ->orderByDesc('id')
            ->limit((int) $request->input('limit', 200))
            ->get();

        return response()->json(['success' => true, 'data' => $logs->map(fn ($l) => SpaTransformer::deviceLog($l))->values()]);
    }
}
