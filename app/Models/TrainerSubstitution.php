<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainerSubstitution extends Model
{
    protected $fillable = ['extracurricular_id', 'date', 'original_staff_profile_id', 'substitute_staff_profile_id', 'reason', 'status', 'assigned_by'];

    protected $casts = ['date' => 'date'];

    public function extracurricular(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Extracurricular::class);
    }

    public function originalStaff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'original_staff_profile_id');
    }

    public function substituteStaff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'substitute_staff_profile_id');
    }
}
