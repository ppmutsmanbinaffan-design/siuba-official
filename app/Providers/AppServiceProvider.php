<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Schema::defaultStringLength(191);

        // Batas laju untuk perangkat RFID: 120 tap/menit per IP perangkat
        \Illuminate\Support\Facades\RateLimiter::for('iot', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(120)->by($request->ip());
        });

        // Kebijakan keamanan: sesi login berakhir bila tidak dipakai sekian menit (0 = nonaktif)
        \Laravel\Sanctum\Sanctum::authenticateAccessTokensUsing(function ($token, bool $isValid) {
            if (!$isValid) {
                return false;
            }
            $timeout = \App\Support\SecurityPolicy::int('session_timeout_minutes', 0);
            if ($timeout <= 0 || !$token->last_used_at) {
                return true;
            }
            if ($token->last_used_at->lt(now()->subMinutes($timeout))) {
                $token->delete();

                return false;
            }

            return true;
        });

        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('super-admin') ? true : null;
        });
    }
}
