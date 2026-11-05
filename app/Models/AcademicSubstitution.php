<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicSubstitution extends Model
{
    use HasFactory;

    protected $table = 'academic_substitutions';

    protected $fillable = [
        'academic_schedule_id',
        'attendance_session_id',
        'original_teacher_id',
        'substitute_teacher_id',
        'date',
        'reason',
        'assigned_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(AcademicSchedule::class, 'academic_schedule_id');
    }

    public function originalTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'original_teacher_id');
    }

    public function substituteTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'substitute_teacher_id');
    }
}
