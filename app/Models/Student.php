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
        'nickname',
        'birth_place',
        'birth_date',
        'entry_year',
        'guardian_name',
        'guardian_phone',
        'address',
        'status',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'generation_year' => 'integer',
        'entry_year' => 'integer',
        'birth_date' => 'date',
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
        $cleaned = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $rawUid));

        return self::decimalUidToHex($cleaned) ?? $cleaned;
    }

    /**
     * Sebagian mesin (mis. Absensindo) menulis UID kartu sebagai angka DESIMAL dengan urutan byte terbalik
     * (little-endian), sedangkan Nexabsen/RC522 menulis heksadesimal sesuai urutan baca.
     * Contoh: kartu yang sama → Nexabsen "AA38A284", Absensindo "2225223850" (= 0x84A238AA, byte dibalik = AA38A284).
     * Bentuk baku SIUBA = heksadesimal urutan baca. Hanya angka 9–17 digit (selain 14) yang dianggap desimal:
     * UID 4 byte heksadesimal selalu 8 karakter dan 7 byte selalu 14 karakter, jadi tidak tertukar.
     */
    public static function decimalUidToHex(string $digits): ?string
    {
        $len = strlen($digits);
        if (!ctype_digit($digits) || $len < 9 || $len > 17 || $len === 14) {
            return null;
        }
        $n = (int) ltrim($digits, '0');
        if ($n <= 0 || (string) $n !== (ltrim($digits, '0') ?: '0')) {
            return null; // melampaui batas bilangan bulat
        }
        if ($n <= 0xFFFFFFFF) {
            $hex = str_pad(strtoupper(dechex($n)), 8, '0', STR_PAD_LEFT);
        } elseif ($n < (1 << 56)) {
            $hex = str_pad(strtoupper(dechex($n)), 14, '0', STR_PAD_LEFT);
        } else {
            return null;
        }

        return implode('', array_reverse(str_split($hex, 2)));
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
