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

        if ($providedKey === '' || !hash_equals($configuredKey, $providedKey)) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_API_KEY',
                'message' => 'API Key Salah!',
            ], 401);
        }

        return $next($request);
    }
}
