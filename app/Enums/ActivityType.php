<?php

namespace App\Enums;

enum ActivityType: string
{
    case IBADAH = 'IBADAH';
    case AKADEMIK = 'AKADEMIK';
    case TAHFIDZ = 'TAHFIDZ';
    case ASRAMA = 'ASRAMA';
    case EKSTRAKURIKULER = 'EKSTRAKURIKULER';
    case APEL = 'APEL';
    case OLAHRAGA = 'OLAHRAGA';
    case KEBERSIHAN = 'KEBERSIHAN';
    case KEGIATAN_KHUSUS = 'KEGIATAN_KHUSUS';

    public function label(): string
    {
        return match ($this) {
            self::IBADAH => 'Ibadah',
            self::AKADEMIK => 'Akademik',
            self::TAHFIDZ => 'Tahfidz',
            self::ASRAMA => 'Asrama',
            self::EKSTRAKURIKULER => 'Ekstrakurikuler',
            self::APEL => 'Apel',
            self::OLAHRAGA => 'Olahraga',
            self::KEBERSIHAN => 'Kebersihan',
            self::KEGIATAN_KHUSUS => 'Kegiatan Khusus',
        };
    }
}
