<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingSession extends Model
{
    protected $fillable = ['extracurricular_id', 'extracurricular_schedule_id', 'session_date', 'start_time', 'end_time', 'location', 'primary_staff_profile_id', 'actual_staff_profile_id', 'trainer_substitution_id', 'status', 'realization_status', 'topic', 'student_present_count', 'activity_notes', 'submitted_by'];

    protected $casts = ['session_date' => 'date', 'student_present_count' => 'integer'];

    public function extracurricular(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Extracurricular::class);
    }

    public function primaryStaff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'primary_staff_profile_id');
    }

    public function actualStaff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'actual_staff_profile_id');
    }

    public function substitution(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(TrainerSubstitution::class, 'trainer_substitution_id');
    }
}
