<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    protected $table = 'events';

    protected $fillable = [
        'code',
        'name',
        'description',
        'event_type',
        'start_at',
        'end_at',
        'registration_open_at',
        'registration_close_at',
        'location',
        'capacity',
        'participant_mode',
        'attendance_enabled',
        'status',
        'created_by',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'registration_open_at' => 'datetime',
        'registration_close_at' => 'datetime',
        'capacity' => 'integer',
        'attendance_enabled' => 'boolean',
    ];

    public function sessions(): HasMany
    {
        return $this->hasMany(EventSession::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function organizers(): HasMany
    {
        return $this->hasMany(EventOrganizer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
