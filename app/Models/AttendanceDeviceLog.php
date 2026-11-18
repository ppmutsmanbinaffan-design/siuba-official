<?php

namespace App\Models;

use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceDeviceLog extends Model
{
    use MassPrunable;

    public const UPDATED_AT = null;

    protected $fillable = ['attendance_device_id', 'device_code', 'event_type', 'level', 'message', 'metadata', 'ip_address', 'created_at'];

    protected $casts = ['metadata' => 'array', 'created_at' => 'datetime'];

    /** Log perangkat disimpan 60 hari (dibersihkan otomatis oleh `php artisan model:prune`). */
    public function prunable()
    {
        return static::where('created_at', '<', now()->subDays(60));
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'attendance_device_id');
    }

    public static function record(?AttendanceDevice $device, string $deviceCode, string $event, string $level, string $message, array $meta = [], ?string $ip = null): void
    {
        try {
            static::create([
                'attendance_device_id' => $device?->id,
                'device_code' => mb_substr($deviceCode, 0, 50),
                'event_type' => $event,
                'level' => $level,
                'message' => mb_substr($message, 0, 255),
                'metadata' => $meta ?: null,
                'ip_address' => $ip,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // logging perangkat tidak boleh menggagalkan tap absensi
            report($e);
        }
    }
}
