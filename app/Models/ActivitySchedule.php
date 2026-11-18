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
        'frequency',
        'days_of_week',
        'effective_start_date',
        'effective_end_date',
        'location',
        'participant_type',
        'participant_target_id',
        'participant_gender',
        'auto_open',
        'auto_close',
        'schedule_set_code',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'auto_generate_session' => 'boolean',
        'is_active' => 'boolean',
        'days_of_week' => 'array',
        'effective_start_date' => 'date',
        'effective_end_date' => 'date',
        'auto_open' => 'boolean',
        'auto_close' => 'boolean',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(RoutineScheduleOverride::class, 'activity_schedule_id');
    }

    /** Apakah jadwal ini berlaku pada tanggal tersebut (hari & masa berlaku). */
    public function appliesOn(\Carbon\Carbon $date): bool
    {
        if ($this->effective_start_date && $date->lt($this->effective_start_date->copy()->startOfDay())) return false;
        if ($this->effective_end_date && $date->gt($this->effective_end_date->copy()->endOfDay())) return false;
        $dow = $date->dayOfWeek;
        return match ($this->frequency) {
            'daily' => true,
            'selected_days' => in_array($dow, array_map('intval', $this->days_of_week ?? []), true),
            default => $this->day_of_week === null || (int) $this->day_of_week === $dow,
        };
    }
}
