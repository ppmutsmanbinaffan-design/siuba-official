<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Validation\Rules\Password;

/**
 * Kebijakan keamanan yang diatur admin (Audit Keamanan → Kebijakan Keamanan) dan ditegakkan server.
 */
class SecurityPolicy
{
    /** @return array<string, mixed> */
    public static function all(): array
    {
        return AppSetting::get('security');
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int) (self::all()[$key] ?? $default);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        return (bool) (self::all()[$key] ?? $default);
    }

    /** Aturan validasi kata sandi sesuai kebijakan. */
    public static function passwordRule(): Password
    {
        $rule = Password::min(max(6, self::int('min_password_length', 8)));
        if (self::bool('require_numbers')) {
            $rule->numbers();
        }
        if (self::bool('require_special_char')) {
            $rule->symbols();
        }

        return $rule;
    }

    /** Ringkasan aturan kata sandi untuk pesan kesalahan. */
    public static function passwordHint(): string
    {
        $parts = ['minimal ' . max(6, self::int('min_password_length', 8)) . ' karakter'];
        if (self::bool('require_numbers')) $parts[] = 'mengandung angka';
        if (self::bool('require_special_char')) $parts[] = 'mengandung simbol (mis. ! @ #)';

        return 'Kata sandi ' . implode(', ', $parts) . '.';
    }
}
