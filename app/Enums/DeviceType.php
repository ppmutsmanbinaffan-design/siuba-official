<?php

namespace App\Enums;

enum DeviceType: string
{
    case MANUAL = 'manual';
    case QR_SCANNER = 'qr_scanner';
    case RFID_READER = 'rfid_reader';
    case KIOSK = 'kiosk';

    public function label(): string
    {
        return match ($this) {
            self::MANUAL => 'Perangkat Input Manual',
            self::QR_SCANNER => 'Pemindai QR Code',
            self::RFID_READER => 'Pembaca Kartu RFID (ESP32/RC522)',
            self::KIOSK => 'Kios Anjungan Mandiri',
        };
    }
}
