<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivitySchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'day_of_week', // 0 = Sunday, 1 = Monday, ... 6 = Saturday
        'start_time',
        'present_until',
        'late_until',
        'end_time',
        'auto_generate_session',
        'is_active',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'auto_generate_session' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }
}
