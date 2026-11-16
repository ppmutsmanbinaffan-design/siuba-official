<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wajibkan header X-GLOBAL-KEY untuk semua endpoint perangkat RFID/ESP32.
 * Jika NEXABSEN_GLOBAL_KEY belum diisi di .env, endpoint DITOLAK (fail-closed).
 */
class VerifyIotKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $configuredKey = (string) config('services.nexabsen.key', '');
        $providedKey = (string) ($request->header('X-GLOBAL-KEY') ?? '');

        if ($configuredKey === '') {
            return response()->json([
                'success' => false,
                'code' => 'IOT_KEY_NOT_CONFIGURED',
                'message' => 'Server Blm Diset!',
            ], 503);
        }

        // Alternatif: token per alat (didaftarkan dari halaman Perangkat), dikirim lewat header X-DEVICE-TOKEN
        if (($providedKey === '' || !hash_equals($configuredKey, $providedKey)) && $this->validDeviceToken($request)) {
            return $next($request);
        }

        if ($providedKey === '' || !hash_equals($configuredKey, $providedKey)) {
            \App\Models\AttendanceDeviceLog::record(
                null,
                (string) ($request->input('device_id') ?? $request->input('device_code') ?? 'TIDAK-DIKENAL'),
                'AUTH_FAILED', 'error', 'Permintaan perangkat ditolak: API key salah atau kosong.', [], $request->ip()
            );
            return response()->json([
                'success' => false,
                'code' => 'INVALID_API_KEY',
                'message' => 'API Key Salah!',
            ], 401);
        }

        return $next($request);
    }

    private function validDeviceToken(Request $request): bool
    {
        $token = (string) ($request->header('X-DEVICE-TOKEN') ?? '');
        if (strlen($token) < 24) {
            return false;
        }
        $json = json_decode($request->getContent(), true);
        $code = (string) ($request->input('device_id') ?? $request->input('device_code')
            ?? (is_array($json) ? ($json['device_id'] ?? $json['device_code'] ?? '') : ''));
        if ($code === '') {
            return false;
        }
        $hash = \App\Models\AttendanceDevice::where('device_code', $code)->where('is_active', true)->value('api_token_hash');

        return $hash !== null && hash_equals($hash, hash('sha256', $token));
    }
}
