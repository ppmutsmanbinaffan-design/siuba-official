<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExtracurricularSchedule extends Model
{
    protected $fillable = ['extracurricular_id', 'day_of_week', 'start_time', 'end_time', 'location', 'is_active'];

    protected $casts = ['day_of_week' => 'integer', 'is_active' => 'boolean'];

    public function extracurricular(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Extracurricular::class);
    }
}
