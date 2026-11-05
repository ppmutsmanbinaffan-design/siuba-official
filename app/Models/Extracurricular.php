<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Extracurricular extends Model
{
    use HasFactory;

    protected $table = 'extracurriculars';

    protected $fillable = [
        'code',
        'name',
        'description',
        'coach_id',
        'assistant_coach_id',
        'location',
        'capacity',
        'registration_open_at',
        'registration_close_at',
        'waitlist_enabled',
        'approval_required',
        'is_active',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'registration_open_at' => 'datetime',
        'registration_close_at' => 'datetime',
        'waitlist_enabled' => 'boolean',
        'approval_required' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ExtracurricularMember::class);
    }
}
