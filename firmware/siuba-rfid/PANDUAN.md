# Panduan Alat RFID SIUBA (ESP32 / NodeMCU + RC522)

Alat ini membaca kartu RFID santri dan pegawai lalu mengirimnya ke SIUBA lewat Wi-Fi pesantren.
Tidak perlu internet. Jika server mati atau Wi-Fi putus, tap disimpan di alat dengan jam aslinya
dan dikirim otomatis setelah tersambung lagi (sampai 800 tap; server menerima tap hingga 12 jam ke belakang).

Yang dibutuhkan:
- Papan **ESP32 DevKit** (30/38 pin) **atau** **NodeMCU v2/v3 (ESP8266)**
- Modul **RC522** (13,56 MHz) + kartu/gantungan kunci Mifare
- Opsional: **LCD 16x2 I2C** (modul hijau/biru dengan papan I2C di belakang), **buzzer aktif 5V/3,3V**, 2 LED + resistor 220 Ω (ESP32)
- Kabel jumper, kabel USB data (bukan sekadar kabel cas)

> ⚠ RC522 memakai **3,3V**. Jangan sambungkan ke 5V.

---

## 1. Sambungan kabel

### ESP32 DevKit

| Modul | Pin modul | Pin ESP32 |
|---|---|---|
| RC522 | SDA (SS) | **GPIO 5** |
| RC522 | SCK | **GPIO 18** |
| RC522 | MOSI | **GPIO 23** |
| RC522 | MISO | **GPIO 19** |
| RC522 | RST | **GPIO 27** |
| RC522 | 3.3V | **3V3** |
| RC522 | GND | **GND** |
| RC522 | IRQ | (tidak dipakai) |
| LCD I2C | SDA | **GPIO 21** |
| LCD I2C | SCL | **GPIO 22** |
| LCD I2C | VCC | **VIN (5V)** |
| LCD I2C | GND | **GND** |
| Buzzer | + | **GPIO 25** |
| Buzzer | − | **GND** |
| LED hijau (+ resistor) | kaki panjang | **GPIO 26** |
| LED merah (+ resistor) | kaki panjang | **GPIO 33** |

### NodeMCU (ESP8266)

| Modul | Pin modul | Pin NodeMCU |
|---|---|---|
| RC522 | SDA (SS) | **D8** |
| RC522 | SCK | **D5** |
| RC522 | MOSI | **D7** |
| RC522 | MISO | **D6** |
| RC522 | RST | **D0** |
| RC522 | 3.3V | **3V3** |
| RC522 | GND | **G** |
| LCD I2C | SDA | **D2** |
| LCD I2C | SCL | **D1** |
| LCD I2C | VCC | **VIN (5V)** |
| LCD I2C | GND | **G** |
| Buzzer | + | **D4** |
| Buzzer | − | **G** |

NodeMCU tidak memakai LED tambahan (pinnya terbatas); petunjuk lewat LCD dan buzzer.
LED biru kecil di papan ikut berkedip saat buzzer berbunyi — itu normal.

LCD tidak wajib: tanpa LCD alat tetap bekerja (petunjuk lewat bunyi).
Bila tulisan LCD tidak tampak, putar sekrup biru kecil (kontras) di belakang LCD.

---

## 2. Memasang program ke alat (tanpa Arduino IDE)

Berkas siap pasang ada di folder `bin/`:
- `siuba-rfid-esp32.bin` untuk ESP32
- `siuba-rfid-nodemcu.bin` untuk NodeMCU

Langkah (komputer Windows, browser **Chrome** atau **Edge**):
1. Sambungkan papan ke komputer dengan kabel USB data.
   Bila tidak muncul port COM di Device Manager, pasang driver **CP210x** (papan dengan chip kotak kecil "SILABS")
   atau **CH340** (chip "CH340G"), lalu cabut-pasang kabel.
2. Buka **https://espressif.github.io/esptool-js/**
3. Baud rate biarkan 115200, klik **Connect**, pilih port COM papan Anda.
   Pada sebagian ESP32: tahan tombol **BOOT** saat mengeklik Connect sampai tersambung.
4. Klik **Erase Flash** (sekali saja untuk alat baru), tunggu selesai.
5. Di bagian Flash Address isi **0x0**, pilih berkas `.bin` yang sesuai papan, klik **Program**.
6. Setelah selesai, tekan tombol **EN/RST** di papan (atau cabut-pasang USB).

Alternatif dengan Arduino IDE: buka `siuba-rfid.ino`, pasang pustaka **MFRC522**, **WiFiManager (tzapu)**,
**ArduinoJson** (7.x), **LiquidCrystal I2C**; pilih papan **ESP32 Dev Module** atau **NodeMCU 1.0 (ESP-12E Module)**, lalu Upload.
Program ini sudah diuji kompilasi dengan core ESP32 2.0.17 dan ESP8266 3.1.2.

---

## 3. Daftarkan alat di SIUBA

1. Pastikan `NEXABSEN_GLOBAL_KEY` di `.env` komputer server **sudah terisi** (teks acak ≥ 32 karakter),
   lalu jalankan ulang `jalankan-siuba.bat`. Tanpa ini server menolak semua alat ("Server Blm Diset!").
2. Buka **Device Management → Tambah Perangkat**. Isi Kode Perangkat (misalnya `GERBANG-01`), nama, lokasi.
3. Simpan. **Token alat** tampil satu kali — salin (atau biarkan halaman terbuka).
   Bagian **Isian Pengaturan Alat RFID** di halaman yang sama menampilkan semua nilai yang perlu diisi.
4. Pastikan komputer server bisa dijangkau dari Wi-Fi: dari HP yang tersambung ke Wi-Fi pesantren,
   buka `http://IP-SERVER:8000` — harus tampil SIUBA. IP server dilihat dengan `ipconfig` (IPv4 Address).
   Sebaiknya IP komputer server dibuat tetap (DHCP reservation di router) agar tidak berubah.

## 4. Pengaturan alat lewat HP

1. Nyalakan alat. Saat pertama kali, layar menampilkan **Mode Pengaturan** dan nama Wi-Fi **SIUBA-RFID-xxxx**.
2. Di HP, sambungkan ke Wi-Fi **SIUBA-RFID-xxxx**. Halaman pengaturan terbuka otomatis
   (bila tidak, buka **192.168.4.1** di browser HP). Pilih **Configure WiFi**.
3. Pilih Wi-Fi pesantren dan isi kata sandinya, lalu isi:
   - **Alamat server SIUBA**: `http://IP-SERVER:8000` (contoh `http://192.168.1.10:8000`)
   - **Kode alat**: sama persis dengan Kode Perangkat di Device Management
   - **Token alat**: token dari langkah 3.3
4. **Save**. Alat tersambung, layar menampilkan "Wi-Fi OK" lalu "SIUBA GERBANG-01 / Tempel kartu...".

Membuka pengaturan lagi (misalnya ganti Wi-Fi): nyalakan alat; saat layar menampilkan
**"Tahan BOOT/FLASH"**, tahan tombol BOOT (ESP32) / FLASH (NodeMCU) 2 detik.
(Jangan menahan tombol itu *sebelum* alat dinyalakan — itu membuat papan masuk mode unggah program.)

## 5. Mendaftarkan kartu

- **Santri**: buka halaman **Registrasi Kartu RFID**, pilih santri, lalu tempelkan kartu ke alat —
  UID terbaca otomatis. (Atau ubah mode alat menjadi *Pendaftaran Kartu* di Device Management.)
- **Pegawai/guru**: isi **RFID Card UID** di formulir SDM (UID tampil di layar alat / log perangkat saat kartu ditolak).

## 6. Arti tampilan & bunyi

| Layar | Bunyi | Arti |
|---|---|---|
| Absen Sukses / Masuk Sukses / Pulang Sukses | 1 bip pendek | Tercatat |
| Absen (TELAT) / Masuk (TELAT) | 2 bip pendek | Tercatat, terlambat |
| Sudah Absen | 1 bip pendek | Sudah tercatat sebelumnya |
| Tersimpan Offline | 3 bip cepat | Server/Wi-Fi tidak terjangkau; disimpan, dikirim nanti |
| Kartu Ditolak! | 1 bip panjang | Kartu belum didaftarkan |
| Tdk Ada Sesi! / Sesi Blm Dibuka / Waktu Habis! | 1 bip panjang | Tidak ada sesi presensi yang sedang berjalan |
| Bukan Peserta! | 1 bip panjang | Santri bukan peserta sesi ini |
| Alat Blm Aktif | 1 bip panjang | Aktifkan alat di Device Management |
| Token Salah! / API Key Salah! | 1 bip panjang | Token di alat tidak cocok — buka pengaturan alat lagi |
| Server Blm Diset! | 1 bip panjang | `NEXABSEN_GLOBAL_KEY` di `.env` server masih kosong |
| RC522 tdk ada! | bip panjang saat menyala | Kabel RC522 salah/longgar |

## 7. Masalah umum

- **Wi-Fi SIUBA-RFID tidak muncul**: tunggu 10 detik setelah alat menyala; pastikan program sudah terpasang.
- **"Tersimpan Offline" terus**: alamat server salah, komputer server mati, atau Firewall Windows memblokir port 8000
  (izinkan port 8000 untuk jaringan Private). Coba buka alamat server dari HP.
- **Hanya mendukung Wi-Fi 2,4 GHz** (ESP tidak bisa tersambung ke Wi-Fi 5 GHz).
- **Buzzer berbunyi terus**: buzzer Anda aktif-rendah; ubah `BUZZER_ACTIVE_HIGH` menjadi `false` (Arduino IDE).
- **Memantau alat**: Device Management menampilkan kapan alat terakhir terlihat (ping tiap 60 detik) dan log tap.
