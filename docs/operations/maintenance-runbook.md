# SIUBA v1.0 — Stabilization & Maintenance Runbook
**Sistem Informasi Utsman Bin Affan — Modul Presensi Santri**
*Dokumen Prosedur Pemeliharaan Preventif & Site Reliability Engineering (SRE)*

---

## 1. Prinsip Dasar Pemeliharaan Pasca Go-Live
Fase stabilisasi pasca peluncuran berpegang pada disiplin operasional ketat:
`OBSERVE → VERIFY → FIX → TEST → DOCUMENT → DEPLOY CAREFULLY`

1. **Feature Freeze**: Fitur baru tidak diimplementasikan langsung pada v1.0 maintenance release; seluruh permintaan fitur baru dialokasikan ke backlog **v1.1**.
2. **One Source of Truth**: Menjaga 1 Attendance Engine, 1 Tabel Attendance Records, 1 Dynamic Participant Engine, dan 1 Mekanisme Sinkronisasi Idempoten.
3. **No Direct Production Editing**: Dilarang melakukan live edit file PHP/JS di server produksi. Semua patch harus melalui tahapan testing, commit, build, dan deploy terverifikasi.

---

## 2. Jadwal & Checklist Pemeliharaan Berkala

### A. Checklist Harian (Daily Operations — 05:00, 12:00, 22:00 WIB)
- [x] **Aplikasi & Web Server**: Nginx & PHP-FPM aktif, CPU < 25%, RAM stabil.
- [x] **Database Engine**: Koneksi pool stabil, zero deadlocks, zero connection leaks.
- [x] **Cron Scheduler**: Generator sesi otomatis (KBM, Shalat, Asrama) berjalan tepat waktu.
- [x] **Kapasitas Disk**: Penggunaan disk < 60%, partisi database dan storage aman.
- [x] **Status Terminal RFID**: Heartbeat terminal ESP32 aktif di seluruh lokasi.
- [x] **Antrean Offline & Sync**: Memeriksa antrean sinkronisasi, unresolved conflicts = 0.
- [x] **Audit Integritas Ringan**: Critical integrity issues = 0.
- [x] **Status Auto-Backup**: Memastikan backup harian sukses dengan SHA256 checksum valid.

### B. Checklist Mingguan (Weekly Operations)
- [x] Review rotasi log aplikasi dan pertumbuhan ukuran file database.
- [x] Verifikasi sampel pemulihan database (dry-run integrity test).
- [x] Audit akun pengguna (identifikasi percobaan login gagal atau akun non-aktif).
- [x] Evaluasi performa latensi endpoint presensi dan tren waktu respon dashboard.
- [x] Replikasi backup sekunder ke storage eksternal / NAS terisolasi.

### C. Checklist Bulanan (Monthly SRE & Security Review)
- [x] **Restore Drill**: Uji simulasi restorasi backup ke clean staging server.
- [x] **Dependency Audit**: Eksekusi `composer audit` dan `npm audit`.
- [x] **Least Privilege Review**: Penyesuaian hak akses Spatie RBAC bagi staf yang mutasi peran.
- [x] **Device Token Rotation**: Rotasi berkala secret token perangkat RFID jika diperlukan.

---

## 3. Klasifikasi Perubahan & Alur Rilis Terkendali

| Kategori Perubahan | Deskripsi | Jalur Rilis & Target |
|---|---|---|
| **HOTFIX** | Perbaikan darurat insiden kritis (SEV-1 / SEV-2) | Patch release (misal: v1.0.1) setelah staging smoke test |
| **BUG FIX** | Perbaikan cacat non-kritis (SEV-3 / SEV-4) | Maintenance release mingguan terencana |
| **SECURITY FIX** | Penambalan celah keamanan atau audit dependensi | Prioritas tinggi setelah uji kompatibilitas |
| **PERFORMANCE FIX** | Optimasi index database atau query lambat | Release terencana dengan uji beban sebelum deploy |
| **FEATURE REQUEST** | Penambahan kemampuan baru sistem | Ditampung ke **v1.1 Backlog** |

---

## 4. Prosedur Pembaruan & Deployment Produksi (Standard SOP)
1. **Precheck & Backup**: Buat snapshot backup database & file storage terverifikasi.
2. **Maintenance Mode**: Aktifkan halaman maintenance bila ada migrasi skema database.
3. **Deploy Tag**: Deploy rilis dari Git tag resmi (bukan direct dev branch).
4. **Migrate & Build**: Jalankan migrasi database aman (backward compatible) dan frontend build.
5. **Restart Services**: Restart queue worker & reload PHP-FPM.
6. **Health & Smoke Test**: Uji login, pencarian santri, input presensi manual/QR/RFID, dan ekspor laporan.
7. **Disable Maintenance**: Buka kembali akses penuh untuk pengguna operasional.
