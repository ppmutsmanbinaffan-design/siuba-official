# Panduan Pengguna — PWA & Mode Offline

## 1. Menyiapkan Perangkat untuk Mode Offline (Offline Preparation)
1. Sambungkan smartphone/tablet/laptop ke jaringan lokal pesantren.
2. Buka SIUBA di browser (Chrome / Edge / Safari).
3. Buka menu **Pusat Sinkronisasi & PWA**.
4. Klik tombol **Persiapkan Mode Offline (Cache Data)**. Ini akan mengunduh snapshot santri & sesi ke IndexedDB lokal Anda.

## 2. Mengoperasikan Presensi Saat Jaringan Terputus
- Banner kuning bertuliskan **Mode Offline Aktif** akan muncul di bagian atas layar.
- Tetap lakukan presensi santri via Manual atau QR Scanner.
- Setiap kali Anda merekam kehadiran, data otomatis disimpan ke antrean offline (*Pending Sync Queue*).

## 3. Melakukan Sinkronisasi Saat Kembali Online
1. Sambungkan kembali perangkat ke WiFi pesantren.
2. Banner hijau **Koneksi Pulih** akan muncul.
3. Klik tombol **Kirim Antrean Presensi Sekarang**.
4. Sistem akan mengirim data secara idempotent tanpa risiko duplikasi ke database server pusat.
