<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivitySupervisor extends Model
{
    protected $fillable = ['activity_id', 'user_id', 'role_type', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
