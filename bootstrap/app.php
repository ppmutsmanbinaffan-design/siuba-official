<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(\App\Http\Middleware\CorrelationIdMiddleware::class);
        // HTTPS LAN (tahap 29): Apache XAMPP di komputer yang sama meneruskan https://IP:8443 ke port 8000.
        // Percayai header X-Forwarded-* hanya dari mesin ini agar Laravel tahu permintaan aslinya HTTPS.
        // Hosting di belakang CDN/proxy (mis. CDN Hostinger): isi TRUSTED_PROXIES=* di .env agar IP & HTTPS asli terbaca.
        $proxies = trim((string) env('TRUSTED_PROXIES', ''));
        $middleware->trustProxies(at: $proxies === '*' ? '*' : array_merge(['127.0.0.1', '::1'], array_filter(array_map('trim', explode(',', $proxies)))));
        $middleware->validateCsrfTokens(except: [
            'tap.php',
            'api/tap.php',
            'api/*',
            'iot/*',
        ]);
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'iot.key' => \App\Http\Middleware\VerifyIotKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::error(
                    'UNAUTHENTICATED',
                    'Sesi autentikasi telah berakhir atau tidak valid. Silakan login kembali.',
                    null,
                    401
                );
            }
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::error(
                    'FORBIDDEN',
                    'Anda tidak memiliki izin untuk mengakses resource ini.',
                    null,
                    403
                );
            }
        });

        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::error(
                    'FORBIDDEN',
                    'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                    null,
                    403
                );
            }
        });

        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::error(
                    'RESOURCE_NOT_FOUND',
                    'Data atau resource yang diminta tidak ditemukan.',
                    null,
                    404
                );
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::validationError(
                    $e->errors(),
                    'Data yang diberikan tidak valid.'
                );
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::error(
                    'RATE_LIMITED',
                    'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.',
                    null,
                    429
                );
            }
        });

        // Error HTTP biasa (rute tidak ada, metode salah, abort(403/404), upload terlalu besar) tetap memakai
        // kode statusnya — sebelumnya semuanya tertangkap di bawah dan dilaporkan sebagai 500 "kesalahan internal".
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = $e->getStatusCode();
                [$code, $message] = match ($status) {
                    403 => ['FORBIDDEN', $e->getMessage() ?: 'Anda tidak memiliki hak akses untuk tindakan ini.'],
                    404 => ['NOT_FOUND', 'Alamat atau data yang diminta tidak ditemukan.'],
                    405 => ['METHOD_NOT_ALLOWED', 'Metode permintaan tidak didukung untuk alamat ini.'],
                    413 => ['PAYLOAD_TOO_LARGE', 'Data yang dikirim terlalu besar.'],
                    419 => ['SESSION_EXPIRED', 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.'],
                    503 => ['SERVICE_UNAVAILABLE', 'Server sedang dalam perawatan. Coba lagi beberapa saat lagi.'],
                    default => ['HTTP_ERROR', $e->getMessage() ?: 'Permintaan tidak dapat diproses.'],
                };

                return \App\Http\Responses\ApiResponse::error($code, $message, null, $status);
            }
        });

        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                \Illuminate\Support\Facades\Log::error('API Unhandled Exception', [
                    'request_id' => $request->header('X-Request-ID'),
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);

                return \App\Http\Responses\ApiResponse::error(
                    'INTERNAL_ERROR',
                    'Terjadi kesalahan internal pada server pesantren. Silakan hubungi tim IT dengan menyertakan Request ID.',
                    null,
                    500
                );
            }
        });
    })->create();
