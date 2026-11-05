<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventAttendanceSessionContext extends Model
{
    use HasFactory;

    protected $table = 'event_attendance_session_contexts';

    protected $fillable = [
        'attendance_session_id',
        'event_id',
        'event_session_id',
        'finalization_policy',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function eventSession(): BelongsTo
    {
        return $this->belongsTo(EventSession::class, 'event_session_id');
    }
}
