<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExtracurricularStaffAssignment extends Model
{
    protected $fillable = ['extracurricular_id', 'staff_profile_id', 'role', 'is_primary', 'start_date', 'end_date', 'is_active', 'created_by'];

    protected $casts = ['is_primary' => 'boolean', 'is_active' => 'boolean', 'start_date' => 'date', 'end_date' => 'date'];

    public function extracurricular(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Extracurricular::class);
    }

    public function staff(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'staff_profile_id');
    }
}
