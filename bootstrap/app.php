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
