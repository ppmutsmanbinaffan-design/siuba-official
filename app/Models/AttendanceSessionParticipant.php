<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSessionParticipant extends Model
{
    use HasFactory;

    protected $table = 'attendance_session_participants';

    protected $fillable = [
        'attendance_session_id',
        'student_id',
        'participant_source',
        'participant_source_id',
        'eligibility_status',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
