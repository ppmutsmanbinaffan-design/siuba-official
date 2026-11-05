<?php

namespace App\Enums;

enum AttendanceResultCode: string
{
    case SUCCESS = 'SUCCESS';
    case ALREADY_RECORDED = 'ALREADY_RECORDED';
    case SESSION_NOT_OPEN = 'SESSION_NOT_OPEN';
    case SESSION_CLOSED = 'SESSION_CLOSED';
    case INVALID_METHOD = 'INVALID_METHOD';
    case STUDENT_INACTIVE = 'STUDENT_INACTIVE';
    case OUTSIDE_ATTENDANCE_TIME = 'OUTSIDE_ATTENDANCE_TIME';
    case STUDENT_NOT_FOUND = 'STUDENT_NOT_FOUND';
    case STUDENT_NOT_PARTICIPANT = 'STUDENT_NOT_PARTICIPANT';
    case UNAUTHORIZED = 'UNAUTHORIZED';

    public function message(): string
    {
        return match ($this) {
            self::SUCCESS => 'Absensi berhasil dicatat.',
            self::ALREADY_RECORDED => 'Santri sudah melakukan absensi pada sesi ini.',
            self::SESSION_NOT_OPEN => 'Sesi absensi belum dibuka atau masih dalam status draf.',
            self::SESSION_CLOSED => 'Sesi absensi telah ditutup.',
            self::INVALID_METHOD => 'Metode absensi tidak diperbolehkan untuk kegiatan ini.',
            self::STUDENT_INACTIVE => 'Santri tidak aktif atau berstatus non-aktif.',
            self::OUTSIDE_ATTENDANCE_TIME => 'Waktu absensi telah berakhir.',
            self::STUDENT_NOT_FOUND => 'Data santri tidak ditemukan.',
            self::STUDENT_NOT_PARTICIPANT => 'Santri bukan merupakan peserta terdaftar pada sesi ini.',
            self::UNAUTHORIZED => 'Pengguna tidak memiliki izin untuk mencatat absensi.',
        };
    }
}
