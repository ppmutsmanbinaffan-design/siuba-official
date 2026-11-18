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
            'device_type' => ['sometimes', \Illuminate\Validation\Rule::in(['manual', 'qr_scanner', 'rfid_reader', 'kiosk'])],
            'mode' => 'sometimes|in:attendance,enrollment,maintenance',
            'current_session_id' => 'sometimes|nullable|integer|exists:attendance_sessions,id',
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
     * Log perangkat terbaru untuk halaman Laporan Perangkat & monitoring (maks. 500, terbaru dulu).
     */
    public function spaLogs(Request $request): JsonResponse
    {
        $request->validate([
            'limit' => 'nullable|integer|min:1|max:500',
            'device_id' => 'nullable|integer',
        ]);

        $logs = \App\Models\AttendanceDeviceLog::query()
            ->when($request->filled('device_id'), fn ($q) => $q->where('attendance_device_id', $request->integer('device_id')))
            ->orderByDesc('id')
            ->limit($request->integer('limit', 300))
            ->get()
            ->map(fn ($l) => SpaTransformer::deviceLog($l))
            ->values();

        return response()->json(['success' => true, 'data' => $logs]);
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

    /**
     * Daftarkan alat dari aplikasi (langsung aktif = masuk whitelist).
     * Token alat opsional: bila dikirim, disimpan sebagai hash dan bisa dipakai alat lewat header X-DEVICE-TOKEN
     * (kunci global X-GLOBAL-KEY tetap berlaku untuk firmware lama).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_code' => 'required|string|max:50|regex:/^[A-Za-z0-9._-]+$/|unique:attendance_devices,device_code',
            'device_name' => 'required|string|max:100',
            'device_type' => ['nullable', \Illuminate\Validation\Rule::in(['manual', 'qr_scanner', 'rfid_reader', 'kiosk'])],
            'location' => 'nullable|string|max:100',
            'device_token' => 'nullable|string|min:24|max:200',
        ], [
            'device_code.unique' => 'Kode perangkat sudah dipakai.',
            'device_code.regex' => 'Kode perangkat hanya boleh huruf, angka, titik, garis bawah, dan tanda minus.',
        ]);
        $device = AttendanceDevice::create([
            'device_code' => strtoupper($data['device_code']),
            'device_name' => $data['device_name'],
            'device_type' => $data['device_type'] ?? 'rfid_reader',
            'location' => $data['location'] ?? null,
            'api_token_hash' => !empty($data['device_token']) ? hash('sha256', $data['device_token']) : null,
            'is_active' => true,
            'mode' => 'attendance',
        ]);
        \App\Models\AttendanceDeviceLog::record($device, $device->device_code, 'DEVICE_REGISTERED', 'info',
            "Perangkat '{$device->device_name}' didaftarkan oleh " . ($request->user()?->name ?? 'admin') . '.', [], $request->ip());

        return response()->json(['success' => true, 'message' => "Perangkat {$device->device_code} berhasil didaftarkan.", 'data' => SpaTransformer::device($device)], 201);
    }

    /**
     * Mesin Absensindo: lepas pasangan unit (MAC) dan cabut tokennya. Mesin akan meminta aktivasi ulang saat restart.
     * Dipakai bila unit diganti/diperbaiki atau muncul "MAC MISMATCH" / "TOKEN INVALID".
     */
    public function resetPairing(Request $request, AttendanceDevice $device): JsonResponse
    {
        $device->forceFill(['mac_address' => null, 'api_token_hash' => null, 'activated_at' => null])->save();
        \App\Models\AttendanceDeviceLog::record($device, $device->device_code, 'PAIRING_RESET', 'warning',
            'Pasangan mesin direset oleh ' . ($request->user()?->name ?? 'admin') . '; mesin perlu aktivasi ulang (restart).', [], $request->ip());

        return response()->json(['success' => true, 'message' => "Pasangan mesin {$device->device_code} direset. Restart mesin agar aktivasi ulang.",
            'data' => \App\Http\Transformers\SpaTransformer::device($device->fresh())]);
    }

    /** Ganti token alat (token lama langsung tidak berlaku). */
    public function rotateToken(Request $request, AttendanceDevice $device): JsonResponse
    {
        $data = $request->validate(['device_token' => 'required|string|min:24|max:200']);
        $device->update(['api_token_hash' => hash('sha256', $data['device_token'])]);
        \App\Models\AttendanceDeviceLog::record($device, $device->device_code, 'TOKEN_ROTATED', 'warning',
            'Token perangkat diganti oleh ' . ($request->user()?->name ?? 'admin') . '.', [], $request->ip());

        return response()->json(['success' => true, 'message' => "Token perangkat {$device->device_code} diperbarui."]);
    }
}
