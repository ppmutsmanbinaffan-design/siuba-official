<?php

namespace App\Models;

use App\Enums\AttendanceMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activity extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'activity_category_id',
        'code',
        'name',
        'description',
        'location',
        'attendance_enabled',
        'allow_manual',
        'allow_qr',
        'allow_rfid',
        'late_tolerance_minutes',
        'is_active',
    ];

    protected $casts = [
        'attendance_enabled' => 'boolean',
        'allow_manual' => 'boolean',
        'allow_qr' => 'boolean',
        'allow_rfid' => 'boolean',
        'late_tolerance_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ActivityCategory::class, 'activity_category_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ActivitySchedule::class);
    }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function allowsMethod(AttendanceMethod $method): bool
    {
        return match ($method) {
            AttendanceMethod::MANUAL => $this->allow_manual,
            AttendanceMethod::QR => $this->allow_qr,
            AttendanceMethod::RFID => $this->allow_rfid,
            default => false,
        };
    }
}
