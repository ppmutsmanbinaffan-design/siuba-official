<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityParticipantRule extends Model
{
    use HasFactory;

    protected $table = 'activity_participant_rules';

    protected $fillable = [
        'activity_id',
        'rule_type',
        'rule_operator',
        'source_id',
        'rule_value',
        'priority',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'rule_value' => 'array',
        'is_active' => 'boolean',
        'priority' => 'integer',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
