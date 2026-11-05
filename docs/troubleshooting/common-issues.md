# SIUBA — Panduan Penanganan Masalah (Troubleshooting Guide)

## 1. Kamera QR Scanner Tidak Mau Menyala di Browser
- **Penyebab**: Izin kamera diblokir browser atau website diakses via HTTP bukan HTTPS/localhost.
- **Solusi**: 
  1. Pastikan URL menggunakan protokol `https://` atau diakses pada localhost.
  2. Klik ikon gembok / izin di address bar browser, ubah status izin *Camera* menjadi **Allow**.
  3. Muat ulang halaman (Refresh).

## 2. Terminal RFID ESP32 Menghasilkan Bunyi Beep Panjang (Ditolak)
- **Penyebab**: 
  1. UID kartu belum didaftarkan pada santri manapun.
  2. Sesi presensi belum dalam status *Open*.
  3. Santri bukan merupakan peserta pada sesi yang sedang aktif di lokasi tersebut.
- **Solusi**:
  1. Cek di Master Santri apakah UID RFID santri sudah di-input.
  2. Cek apakah sesi shalat / kegiatan sudah dibuka oleh operator / scheduler.
  3. Cek pengaturan penugasan sesi pada perangkat di menu *Device Management*.

## 3. Data Masih Tertahan di Status "Pending Sync"
- **Penyebab**: Perangkat belum tersambung ke jaringan lokal server SIUBA.
- **Solusi**:
  1. Sambungkan kembali smartphone / laptop ke WiFi resmi pesantren.
  2. Buka menu *Pusat Sinkronisasi*, klik tombol **Sinkronkan Sekarang**.
