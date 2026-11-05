# SIUBA Disaster Recovery (DR) Runbook

## 1. Parameter Pemulihan
- **RPO (Recovery Point Objective)**: Maksimal 24 Jam (Cadangan basis data terverifikasi dibuat harian jam 02:00 WIB, dengan snapshot lokal offline di masing-masing perangkat PWA petugas).
- **RTO (Recovery Time Objective)**: Maksimal 30 Menit untuk pengembalian operasional pada mesin server pengganti / staging.

## 2. Skenario Penanganan Bencana Operasional

### Skenario A: Kegagalan Harddisk / Disk Crash Server
1. Siapkan mesin server pengganti (Linux Ubuntu Server 24.04 LTS / Cloud VM).
2. Clone repositori aplikasi SIUBA dan jalankan instalasi environment (`composer install --no-dev`, `npm run build`).
3. Ambil berkas cadangan terverifikasi terbaru dari media penyimpanan kedua (NAS / External Storage).
4. Jalankan perintah restorasi:
   ```bash
   php artisan system:restore --backup-id="BKP-LATEST" --reason="Pemulihan pasca kegagalan disk server utama"
   ```
5. Verifikasi konektivitas scanner QR dan perangkat RFID.

### Skenario B: Kerusakan / Korupsi Data Basis Data (Database Corruption)
1. **PENTING**: Jangan langsung menghapus data yang rusak. Buat salinan berkas database mentah untuk audit investigasi forensik.
2. Putuskan akses client dengan mode maintenance (`php artisan down`).
3. Pilih snapshot cadangan terverifikasi terakhir sebelum waktu anomali terjadi.
4. Lakukan restorasi dan jalankan audit integritas (`php artisan system:audit-integrity`).
5. Aktifkan kembali layanan (`php artisan up`).

### Skenario C: Pemadaman Listrik Area Pesantren (Power Outage)
1. Saat listrik padam, perangkat HP/Tablet petugas PWA tetap mencatat presensi secara **OFFLINE** menggunakan IndexedDB lokal.
2. Saat pasokan listrik pulih:
   - Server SIUBA akan boot otomatis melalui konfigurasi `systemd`.
   - Perangkat pembaca RFID/QR akan menyambung kembali ke jaringan Wi-Fi lokal pesantren.
   - Petugas PWA melakukan sinkronisasi batch antrean presensi yang tertunda tanpa kehilangan data.

### Skenario D: Kegagalan Router / Jaringan Lokal (LAN / Wi-Fi Down)
1. Petugas presensi tetap membuka aplikasi PWA yang telah ter-cache oleh Service Worker.
2. Presensi santri dicatat di mode antrean IndexedDB lokal.
3. Setelah koneksi Wi-Fi pulih, sistem sinkronisasi idempoten (`OfflineSyncService`) otomatis mengirimkan antrean ke server backend.
