<?php

namespace App\Models;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'attendance_session_id',
        'student_id',
        'status',
        'method',
        'check_in_at',
        'late_minutes',
        'attendance_device_id',
        'recorded_by',
        'notes',
        'metadata',
        'client_request_id',
        'client_installation_id',
        'was_offline',
        'sync_delay_seconds',
        'record_source',
    ];

    protected $casts = [
        'status' => AttendanceStatus::class,
        'method' => AttendanceMethod::class,
        'check_in_at' => 'datetime',
        'late_minutes' => 'integer',
        'metadata' => 'array',
        'was_offline' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function attendanceSession(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(AttendanceDevice::class, 'attendance_device_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
