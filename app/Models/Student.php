<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_number',
        'nisn',
        'name',
        'gender',
        'classroom_id',
        'dormitory_room_id',
        'generation_year',
        'photo',
        'qr_token',
        'rfid_uid',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'generation_year' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Student $student) {
            if (empty($student->qr_token)) {
                $student->qr_token = self::generateUniqueQrToken();
            }
            $student->rfid_uid = self::normalizeRfidUid($student->rfid_uid);
        });

        static::updating(function (Student $student) {
            $student->rfid_uid = self::normalizeRfidUid($student->rfid_uid);
        });
    }

    public static function generateUniqueQrToken(): string
    {
        do {
            $token = 'STU-' . strtoupper(Str::random(8));
        } while (self::where('qr_token', $token)->exists());

        return $token;
    }

    public static function normalizeRfidUid(?string $rawUid): ?string
    {
        if ($rawUid === null || trim($rawUid) === '') {
            return null;
        }

        // Remove spaces, colons, dashes and convert to uppercase
        $cleaned = preg_replace('/[^A-Za-z0-9]/', '', $rawUid);
        return strtoupper($cleaned);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function dormitoryRoom(): BelongsTo
    {
        return $this->belongsTo(DormitoryRoom::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
