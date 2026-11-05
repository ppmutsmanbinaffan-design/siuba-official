<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcademicSchedule extends Model
{
    use HasFactory;

    protected $table = 'academic_schedules';

    protected $fillable = [
        'academic_year_id',
        'semester_id',
        'day_of_week',
        'classroom_id',
        'subject_id',
        'teacher_id',
        'lesson_period_id',
        'activity_id',
        'room_location',
        'effective_start_date',
        'effective_end_date',
        'is_active',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'effective_start_date' => 'date',
        'effective_end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function lessonPeriod(): BelongsTo
    {
        return $this->belongsTo(LessonPeriod::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
