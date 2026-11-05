<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicSessionContext extends Model
{
    use HasFactory;

    protected $table = 'academic_session_contexts';

    protected $fillable = [
        'attendance_session_id',
        'academic_schedule_id',
        'lesson_period_id',
        'classroom_id',
        'subject_id',
        'scheduled_teacher_id',
        'teaching_teacher_id',
        'topic',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function scheduledTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_teacher_id');
    }

    public function teachingTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teaching_teacher_id');
    }
}
