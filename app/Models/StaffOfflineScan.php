<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffOfflineScan extends Model
{
    protected $fillable = [
        'client_request_id', 'staff_profile_id', 'staff_attendance_record_id', 'identifier', 'method',
        'captured_at', 'captured_at_client', 'clock_offset_ms', 'success', 'result_code', 'result_message',
        'installation_id', 'user_id',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'captured_at_client' => 'datetime',
        'success' => 'boolean',
        'clock_offset_ms' => 'integer',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'staff_profile_id');
    }
}
