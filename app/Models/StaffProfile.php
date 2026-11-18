<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StaffProfile extends Model
{
    use SoftDeletes;

    public const TYPES = ['teacher', 'trainer', 'musyrif', 'administration', 'employee', 'management', 'other'];
    public const EMPLOYMENT = ['permanent', 'contract', 'honorary', 'part_time', 'volunteer', 'inactive'];

    protected $fillable = [
        'user_id', 'staff_number', 'name', 'gender', 'staff_type', 'employment_status', 'phone', 'email',
        'department', 'position', 'join_date', 'leave_date', 'requires_daily_attendance', 'qr_token',
        'rfid_uid', 'photo', 'is_active',
    ];

    protected $casts = [
        'join_date' => 'date',
        'leave_date' => 'date',
        'requires_daily_attendance' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (StaffProfile $s) {
            if (empty($s->qr_token)) {
                $s->qr_token = self::generateUniqueQrToken();
            }
        });
        static::saving(function (StaffProfile $s) {
            $s->rfid_uid = Student::normalizeRfidUid($s->rfid_uid);
        });
    }

    public static function generateUniqueQrToken(): string
    {
        do {
            $token = 'STF-' . strtoupper(Str::random(10));
        } while (self::withTrashed()->where('qr_token', $token)->exists());

        return $token;
    }

    /** Petakan role Spatie ke jenis SDM. */
    public static function typeFromRole(?string $role): string
    {
        return match ($role) {
            'guru', 'teacher', 'wali-kelas', 'academic' => 'teacher',
            'pelatih' => 'trainer',
            'musyrif', 'kepala-asrama', 'kesantrian' => 'musyrif',
            'admin', 'operator', 'petugas-absensi', 'panitia-psb', 'panitia-ppdb' => 'administration',
            'pimpinan', 'kepala-sekolah' => 'management',
            'petugas-masjid' => 'employee',
            default => 'other',
        };
    }

    public static function employmentFromLabel(?string $label): string
    {
        $l = strtolower(trim((string) $label));

        return match (true) {
            in_array($l, self::EMPLOYMENT, true) => $l,
            in_array($l, ['tetap', 'gty', 'pns', 'pegawai tetap'], true) => 'permanent',
            in_array($l, ['kontrak', 'gtt', 'pkwt'], true) => 'contract',
            in_array($l, ['honorer', 'honor'], true) => 'honorary',
            in_array($l, ['paruh waktu', 'part time', 'part-time'], true) => 'part_time',
            in_array($l, ['relawan', 'sukarelawan'], true) => 'volunteer',
            default => 'permanent',
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
