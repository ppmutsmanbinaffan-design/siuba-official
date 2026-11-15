<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAbsenceRequest extends Model
{
    public const TYPES = ['permission', 'sick', 'leave', 'official_duty'];

    protected $fillable = [
        'staff_profile_id', 'type', 'start_at', 'end_at', 'reason', 'attachment', 'status', 'requested_by',
        'decided_by', 'decided_by_name', 'decided_at', 'decision_notes',
    ];

    protected $casts = ['start_at' => 'datetime', 'end_at' => 'datetime', 'decided_at' => 'datetime'];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'staff_profile_id');
    }
}
