<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentGroupMember extends Model
{
    protected $fillable = ['student_group_id', 'student_id', 'joined_at'];

    protected $casts = ['joined_at' => 'date'];

    public function group(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(StudentGroup::class, 'student_group_id');
    }

    public function student(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
