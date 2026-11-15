<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAttendanceRecord extends Model
{
    public const STATUSES = ['present', 'late', 'permission', 'sick', 'leave', 'official_duty', 'absent'];

    protected $fillable = [
        'staff_profile_id', 'attendance_date', 'attendance_type', 'context_key', 'status', 'scheduled_start_at',
        'scheduled_end_at', 'check_in_at', 'check_out_at', 'check_in_method', 'check_out_method', 'late_minutes',
        'early_leave_minutes', 'attendance_device_id', 'recorded_by', 'recorded_by_name', 'notes', 'metadata',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'scheduled_start_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'staff_profile_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'attendance_device_id');
    }
}
