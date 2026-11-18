<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentExcusal extends Model
{
    public const TYPES = ['permission', 'sick', 'dispensation'];
    public const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    protected $fillable = [
        'student_id', 'type', 'start_at', 'end_at', 'reason', 'status', 'notes', 'attachment_path',
        'approved_by', 'approved_at', 'created_by', 'created_by_name',
    ];

    protected $casts = ['start_at' => 'datetime', 'end_at' => 'datetime', 'approved_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** Izin yang disetujui dan beririsan dengan rentang waktu tertentu. */
    public function scopeActiveBetween(Builder $q, $start, $end): Builder
    {
        return $q->where('status', 'approved')->where('start_at', '<=', $end)->where('end_at', '>=', $start);
    }
}
