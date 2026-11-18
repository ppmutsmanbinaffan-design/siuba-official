/*
 * ================================================================
 *  SIUBA - Terminal Presensi RFID (ESP32 / NodeMCU ESP8266 + RC522)
 * ================================================================
 *  - Pengaturan lewat HP (tanpa mengubah kode): saat pertama menyala alat
 *    membuat Wi-Fi "SIUBA-RFID-xxxx". Sambungkan HP ke Wi-Fi itu, halaman
 *    pengaturan terbuka otomatis (atau buka 192.168.4.1). Isi Wi-Fi pesantren,
 *    alamat server, kode alat, dan token alat dari menu Device Management.
 *  - Masuk pengaturan lagi: tahan tombol BOOT/FLASH saat alat dinyalakan
 *    (sampai layar menampilkan "Mode Pengaturan"), atau tap kartu teknisi.
 *  - Tap kartu -> dikirim ke SIUBA. Bila server/Wi-Fi mati, tap disimpan di
 *    alat dengan jam tap aslinya dan dikirim otomatis setelah tersambung.
 *  - Jam alat disetel dari jam server (header X-Server-Time); tidak perlu internet.
 *
 *  Pustaka (Library Manager Arduino IDE):
 *    MFRC522 (GithubCommunity) 1.4.x, WiFiManager (tzapu) 2.0.x,
 *    ArduinoJson (Benoit Blanchon) 7.x, LiquidCrystal I2C (Frank de Brabander / johnrickman)
 *  Papan: "ESP32 Dev Module" (core esp32 2.x/3.x) atau "NodeMCU 1.0 (ESP-12E Module)" (core esp8266 3.x)
 *
 *  Sambungan kabel: lihat PANDUAN.md di folder ini.
 */

// Seluruh kode ada di siuba_rfid_main.cpp (tab kedua di Arduino IDE).
// Biasanya tidak perlu diubah: pengaturan Wi-Fi/server/token dilakukan lewat HP.
