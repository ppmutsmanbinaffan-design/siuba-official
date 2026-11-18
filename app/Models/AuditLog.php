<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;
    use Prunable;

    public $timestamps = false;

    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id',
        'attendance_device_id',
        'client_installation_id',
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'reason',
        'ip_address',
        'user_agent_summary',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    /** Log audit disimpan sesuai Kebijakan Keamanan (minimal 30 hari). Dibersihkan oleh `php artisan model:prune`. */
    public function prunable()
    {
        $days = max(30, \App\Support\SecurityPolicy::int('audit_retention_days', 365));

        return static::where('created_at', '<', now()->subDays($days));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'attendance_device_id');
    }
}
