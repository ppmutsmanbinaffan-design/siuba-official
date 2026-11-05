<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineScheduleOverride extends Model
{
    use HasFactory;

    protected $table = 'routine_schedule_overrides';

    protected $fillable = [
        'activity_schedule_id',
        'date',
        'type',
        'new_start_time',
        'new_present_until',
        'new_late_until',
        'new_end_time',
        'new_location',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ActivitySchedule::class, 'activity_schedule_id');
    }
}
