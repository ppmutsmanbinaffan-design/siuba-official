<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentGroup extends Model
{
    protected $fillable = ['code', 'name', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function members(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(StudentGroupMember::class);
    }
}
