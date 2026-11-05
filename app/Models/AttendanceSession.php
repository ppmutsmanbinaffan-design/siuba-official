<?php

namespace App\Models;

use App\Enums\SessionStatus;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'activity_schedule_id',
        'session_code',
        'session_date',
        'start_at',
        'present_until',
        'late_until',
        'end_at',
        'status',
        'location',
        'opened_by',
        'closed_by',
        'opened_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'session_date' => 'date',
        'start_at' => 'datetime',
        'present_until' => 'datetime',
        'late_until' => 'datetime',
        'end_at' => 'datetime',
        'status' => SessionStatus::class,
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ActivitySchedule::class, 'activity_schedule_id');
    }

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(AttendanceSessionParticipant::class, 'attendance_session_id');
    }

    public function isOpen(): bool
    {
        return $this->status === SessionStatus::OPEN;
    }

    public function isClosed(): bool
    {
        return $this->status === SessionStatus::CLOSED;
    }

    public function isDraft(): bool
    {
        return $this->status === SessionStatus::DRAFT;
    }

    public function canAcceptAttendance(?Carbon $time = null): bool
    {
        if (!$this->isOpen()) {
            return false;
        }

        $now = $time ?? Carbon::now('Asia/Jakarta');

        if ($this->end_at && $now->greaterThan($this->end_at)) {
            return false;
        }

        return true;
    }
}
