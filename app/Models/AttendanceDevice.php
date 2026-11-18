<?php

namespace App\Models;

use App\Enums\DeviceType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_code',
        'device_name',
        'device_type',
        'location',
        'api_token_hash',
        'ip_address',
        'last_seen_at',
        'is_active',
        'mode',
        'current_session_id',
        'protocol',
        'serial_number',
        'mac_address',
        'firmware_version',
        'activated_at',
    ];

    protected $hidden = ['api_token_hash'];

    protected $casts = [
        'device_type' => DeviceType::class,
        'last_seen_at' => 'datetime',
        'is_active' => 'boolean',
        'activated_at' => 'datetime',
    ];

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}
