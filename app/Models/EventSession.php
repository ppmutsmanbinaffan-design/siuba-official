<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventSession extends Model
{
    use HasFactory;

    protected $table = 'event_sessions';

    protected $fillable = [
        'event_id',
        'name',
        'start_at',
        'present_until',
        'late_until',
        'end_at',
        'location',
        'attendance_required',
        'finalization_policy',
        'sort_order',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'present_until' => 'datetime',
        'late_until' => 'datetime',
        'end_at' => 'datetime',
        'attendance_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
