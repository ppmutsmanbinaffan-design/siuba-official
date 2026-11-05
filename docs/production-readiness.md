# SIUBA Production Readiness Review & Checklist

## 1. Konfigurasi Lingkungan Produksi
- **APP_ENV**: `production`
- **APP_DEBUG**: `false` (Pesan stack trace teknis tidak boleh terpapar ke pengguna akhir)
- **APP_URL**: URL HTTPS lokal/publik pesantren resmi
- **TIMEZONE**: `Asia/Jakarta` (WIB)
- **LOG_CHANNEL**: `daily` dengan retensi 30 hari

## 2. Web Server & Infrastruktur
- **Web Server**: Nginx / Apache reverse proxy dengan Nginx document root mengarah eksklusif ke `/public`.
- **Proteksi Berkas Sensitif**: Akses langsung ke `/.env`, `/.git`, dan `/storage/logs` di-block pada layer Nginx (`location ~ /\.(env|git) { deny all; }`).
- **SSL/TLS**: HTTPS lokal aktif untuk mendukung akses kamera scanner QR pada peramban mobile (PWA) dan enkripsi paket data jaringan lokal.
- **Database User**: User database berdedikasi (bukan root), koneksi dibatasi hanya dari host server aplikasi.

## 3. Eksekusi Build & Dependensi
- Frontend di-compile mandiri via `npm run build`. Tidak memerlukan proses Vite dev server pada runtime produksi.
- Tidak bergantung pada CDN eksternal wajib (seluruh CSS, font, dan asset JavaScript di-bundle lokal untuk mendukung fungsionalitas intranet / offline-first).
