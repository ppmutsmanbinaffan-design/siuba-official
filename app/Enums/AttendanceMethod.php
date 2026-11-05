<?php

namespace App\Enums;

enum AttendanceMethod: string
{
    case MANUAL = 'manual';
    case QR = 'qr';
    case RFID = 'rfid';
    case FINGERPRINT = 'fingerprint';
    case FACE = 'face';
    case NFC = 'nfc';
    case MOBILE = 'mobile';

    public function label(): string
    {
        return match ($this) {
            self::MANUAL => 'Manual (Operator)',
            self::QR => 'QR Code Scanner',
            self::RFID => 'Kartu RFID Santri',
            self::FINGERPRINT => 'Sidik Jari (Fingerprint)',
            self::FACE => 'Pengenal Wajah (Face Recognition)',
            self::NFC => 'NFC Device',
            self::MOBILE => 'Aplikasi Mobile Santri/Wali',
        };
    }
}
