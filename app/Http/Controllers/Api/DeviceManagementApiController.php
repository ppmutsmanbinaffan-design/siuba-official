<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
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
}
