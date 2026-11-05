<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Halaqah extends Model
{
    use HasFactory;

    protected $table = 'halaqahs';

    protected $fillable = [
        'code',
        'name',
        'supervisor_id',
        'location',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(HalaqahMember::class);
    }
}
