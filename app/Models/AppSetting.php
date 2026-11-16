<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value', 'updated_by'];

    /** Nilai bawaan bila belum pernah disimpan. */
    public const DEFAULTS = [
        'institution' => [
            'foundation_name' => 'Yayasan Pendidikan Islam Utsman Bin Affan',
            'name' => 'Pondok Pesantren Utsman Bin Affan',
            'short_name' => 'Utsman Bin Affan',
            'slogan' => 'Sistem Informasi Manajemen Presensi & Disiplin Santri',
            'address' => '',
            'phone' => '',
            'email' => '',
            'website' => '',
            'leader_name' => '',
            'leader_title' => 'Pimpinan Pondok',
            'city' => '',
            'active_academic_year' => '2026/2027',
            'active_semester' => 'Ganjil',
            'time_format' => '24h',
        ],
        'attendance' => [
            'late_tolerance_minutes' => 15,
            'auto_close_session_minutes' => 30,
            'rfid_debounce_seconds' => 5,
            'allow_self_excusal' => true,
            'enable_kiosk_fullscreen' => false,
            'enable_audio_chime' => true,
        ],
    ];

    public static function get(string $key): mixed
    {
        $raw = Cache::remember("app_setting:$key", 300, fn () => static::where('key', $key)->value('value'));
        $value = $raw !== null ? json_decode($raw, true) : null;
        if (isset(self::DEFAULTS[$key])) {
            return array_merge(self::DEFAULTS[$key], is_array($value) ? $value : []);
        }

        return $value;
    }

    public static function put(string $key, mixed $value, ?int $userId = null): void
    {
        static::updateOrCreate(['key' => $key], ['value' => json_encode($value, JSON_UNESCAPED_UNICODE), 'updated_by' => $userId]);
        Cache::forget("app_setting:$key");
    }
}
