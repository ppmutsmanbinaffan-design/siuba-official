<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeachingAssignment extends Model
{
    protected $fillable = ['academic_year_id', 'semester_id', 'classroom_id', 'subject_id', 'teacher_id', 'weekly_periods', 'is_active'];

    protected $casts = ['weekly_periods' => 'integer', 'is_active' => 'boolean'];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
