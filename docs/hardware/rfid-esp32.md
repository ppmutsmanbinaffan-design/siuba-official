# Panduan Perangkat Keras — Terminal RFID ESP32 (RC522 / PN532)

## 1. Arsitektur & Spesifikasi Perangkat
- **Mikrokontroler**: ESP32 WROOM-32 (WiFi 802.11 b/g/n, 2.4 GHz)
- **Modul RFID**: RC522 / PN532 SPI Mode (13.56 MHz Mifare Classic 1K / Ultralight / NTAG213)
- **Komunikasi**: REST API JSON via HTTPS / LAN lokal dengan HMAC-SHA256 Auth Header (`X-Device-Token`)
- **Indikator**: Buzzer aktif 5V + Dual LED (Hijau = Hadir/Sukses, Merah = Ditolak/Invalid)

## 2. Format Payload API Endpoint
```http
POST /api/v1/attendance/rfid
Headers:
  X-Device-Token: <DEVICE_SECRET_TOKEN>
  Content-Type: application/json

Body:
{
  "rfid_uid": "04A87F12",
  "device_code": "RFID-MSJ-01",
  "tapped_at": "2026-08-24T05:02:15+07:00",
  "client_request_id": "esp32-msj01-1724450535-04A87F12"
}
```

## 3. Feedback Suara & LED
- **1x Beep Pendek + LED Hijau**: Hadir tepat waktu (Success).
- **2x Beep Pendek + LED Kuning**: Terlambat (Late Recorded).
- **1x Beep Panjang + LED Merah**: Kartu belum terdaftar / Santri bukan peserta sesi ini.
- **3x Beep Cepat + LED Merah**: Jaringan terputus (data disimpan di buffer EEPROM ESP32 jika diaktifkan).
