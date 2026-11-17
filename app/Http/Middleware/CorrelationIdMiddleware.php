<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CorrelationIdMiddleware
{
    /**
     * Handle an incoming request and assign/propagate correlation request ID.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-ID');

        if (empty($requestId)) {
            $requestId = 'REQ-' . date('Ymd') . '-' . strtoupper(Str::random(8));
        }

        $request->headers->set('X-Request-ID', $requestId);
        $request->attributes->set('request_id', $requestId);

        $response = $next($request);

        $response->headers->set('X-Request-ID', $requestId);
        // Jam server (milidetik) agar perangkat bisa mengukur selisih jamnya — dipakai mengoreksi waktu absensi offline
        $response->headers->set('X-Server-Time', (string) (int) floor(microtime(true) * 1000));

        return $response;
    }
}
