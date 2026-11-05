<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LessonPeriod extends Model
{
    use HasFactory;

    protected $table = 'lesson_periods';

    protected $fillable = [
        'code',
        'name',
        'period_number',
        'start_time',
        'end_time',
        'day_type',
        'is_break',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'period_number' => 'integer',
        'is_break' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
