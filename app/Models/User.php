<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * Role & permission Spatie selalu memakai guard 'web', walaupun request login lewat Sanctum.
     * Tanpa ini, pengecekan izin pada request API (guard 'sanctum') gagal untuk semua role selain super-admin.
     */
    protected string $guard_name = 'web';

    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function staffProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }
}
