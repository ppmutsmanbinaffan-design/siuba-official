<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case PRESENT = 'present';
    case LATE = 'late';
    case PERMISSION = 'permission';
    case SICK = 'sick';
    case DISPENSATION = 'dispensation';
    case ABSENT = 'absent';

    public function label(): string
    {
        return match ($this) {
            self::PRESENT => 'Hadir',
            self::LATE => 'Terlambat',
            self::PERMISSION => 'Izin',
            self::SICK => 'Sakit',
            self::DISPENSATION => 'Dispensasi',
            self::ABSENT => 'Alpha',
        };
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::PRESENT => 'emerald',
            self::LATE => 'amber',
            self::PERMISSION => 'blue',
            self::SICK => 'purple',
            self::DISPENSATION => 'teal',
            self::ABSENT => 'rose',
        };
    }
}
