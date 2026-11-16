# Catatan Upgrade Keamanan SIUBA (security-hardening)

Dokumen ini menjelaskan perubahan keamanan dan **langkah wajib** setelah memasang pembaruan.

## Langkah wajib setelah update

1. **Tambahkan ke `.env`** (lihat `.env.example`):
   ```env
   NEXABSEN_GLOBAL_KEY=isi-dengan-kunci-acak-panjang
   ADMIN_DEFAULT_PASSWORD=
   ```
   Buat kunci acak dengan: `php -r "echo bin2hex(random_bytes(24));"`

   > Jika `NEXABSEN_GLOBAL_KEY` kosong, **semua tap RFID ditolak** (respon `Server Blm Diset!`).

2. **Perbarui firmware ESP32 / NexAbsen** agar mengirim header kunci di setiap request:
   ```cpp
   http.begin(client, "http://IP-SERVER:8000/api/v1/iot/rfid-tap");
   http.addHeader("Content-Type", "application/json");
   http.addHeader("X-GLOBAL-KEY", "isi-dengan-kunci-yang-sama-dengan-env");
   ```

3. **Jalankan perintah berikut di server:**
   ```bash
   composer install --no-dev --optimize-autoloader
   php artisan db:seed --class=RolePermissionSeeder --force   # menambah izin cms.manage & psb.* untuk role admin
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   ```

4. **Ganti password semua akun bawaan** (`superadmin`, `musyrif.fauzi`, dll.) yang sebelumnya
   memakai password `password`. Seeder baru tidak lagi memakai password itu.

5. Untuk produksi: `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`.

6. Disarankan menjadikan repositori GitHub **private**.

## Ringkasan perubahan

| Area | Sebelum | Sesudah |
|---|---|---|
| Izin role non-super-admin | Semua API berizin menolak (403) role selain super-admin karena guard `sanctum` ≠ `web` | `User::$guard_name = 'web'` → izin role berjalan normal |
| CMS & PSB | Semua endpoint ubah/hapus terbuka tanpa login | Wajib login + izin `cms.manage` / `settings.manage` / `psb.*` |
| Data pendaftar PSB | `GET /cms/landing` mengirim semua data pendaftar ke publik | Dihapus; admin pakai `GET /cms/ppdb/registrations` (login) |
| Cek status PSB | Pencarian `LIKE` termasuk nama | Harus persis: No. Registrasi / NISN / No. WA; field privat disembunyikan |
| Form PSB publik | Bisa set status "Diterima" & nilai tes; nomor registrasi bisa dobel | Status selalu "Baru"; nomor dari ID; validasi & rate limit |
| IoT / RFID | Daftar santri + UID & registrasi kartu terbuka; API key opsional; UID master `99887766` bawaan; waktu tap bisa dipalsukan | Registrasi kartu wajib login; tap wajib `X-GLOBAL-KEY`; tanpa UID bawaan; waktu tap dibatasi; santri nonaktif & sesi tertutup ditolak; tap ganda tidak 500 |
| XSS | Isi CMS & data pendaftar masuk `innerHTML` tanpa escape | Disanitasi di server (masuk & keluar) + escape di halaman admin |
| User management | Pemegang `users.update` bisa ganti password super-admin; `createUser` bisa menimpa akun lama; password default `password` | Akun super-admin terlindungi; username/email harus unik; password min. 8 karakter |
| Reset database | Tanpa backup; pesan error bocor | Backup otomatis sebelum reset, log audit, pesan error umum |
| Konfigurasi | `env()` di controller (mati setelah `config:cache`); `.env.example` tidak valid | Lewat `config/services.php`; `.env.example` diperbaiki |
| Repo | `siuba_db`, `bootstrap/cache/*.php` ikut di-commit | Di-`.gitignore` |

## Halaman admin statis

`/cms-landing`, `/manajemen-psb`, dan `/registrasi-rfid` sekarang memuat `public/js/siuba-admin-auth.js`,
yang otomatis menambahkan token login ke setiap panggilan API. Jika belum login, pengguna diarahkan ke `/login`.

## Test

`tests/Feature/SecurityHardeningTest.php` (16 test) memastikan celah di atas tidak muncul lagi.
Jalankan: `php artisan test`

---

# Update 2: Tap RFID mengikuti aturan absensi & whitelist perangkat

## Apa yang berubah

Tap kartu dari ESP32 sekarang dicatat lewat `AttendanceService` — **aturan yang sama dengan absensi QR & manual**:

| Kondisi | Respon ke alat (LCD) | HTTP |
|---|---|---|
| Berhasil tepat waktu / terlambat | `Absen Sukses` / `Absen (TELAT)` | 200 |
| Sudah absen di sesi ini | `Sudah Absen` | 200 |
| Santri nonaktif | `Santri Nonaktif!` | 403 |
| Bukan peserta sesi | `Bukan Peserta!` | 403 |
| Kegiatan tidak mengizinkan RFID | `RFID Tdk Diizinkan` | 409 |
| Lewat batas akhir sesi | `Waktu Habis!` | 409 |
| Tidak ada sesi terbuka | `Tdk Ada Sesi!` | 409 |
| Kartu belum terdaftar | `Kartu Ditolak!` | 404 |
| Alat belum diaktifkan / dinonaktifkan | `Alat Blm Aktif!` | 403 |

Pemilihan sesi: jika ada beberapa sesi terbuka, sistem memilih sesi yang **jamnya sedang berjalan dan santri
terdaftar sebagai pesertanya**. Sesi yang sudah ditutup/dibatalkan tidak pernah dipakai. Sesi "Presensi Harian"
otomatis hanya dibuat jika hari itu belum ada sesi sama sekali (`NEXABSEN_AUTO_DAILY_SESSION`).

## Whitelist perangkat

- Alat yang **sudah ada** di tabel `attendance_devices` dan aktif tetap berjalan seperti biasa.
- Alat **baru** (kode belum dikenal) otomatis tercatat sebagai *menunggu aktivasi*; tap-nya ditolak.
- Aktifkan alat:
  ```bash
  php artisan siuba:devices                                     # lihat daftar & status
  php artisan siuba:device-activate MSJ-RFID-01 --location="Masjid Utama"
  php artisan siuba:device-deactivate MSJ-RFID-01               # misal alat hilang/dicuri
  ```
  atau lewat API (login, izin `devices.manage`): `GET /api/v1/devices`, `PATCH /api/v1/devices/{id}` dengan `{"is_active": true}`.
- Pastikan setiap ESP32 mengirim `device_id` yang **unik** (misal `MSJ-RFID-01`, `KLS-7A-01`), bukan bawaan `NEXABSEN-01`.

Test: `tests/Feature/IotTapConsistencyTest.php` (12 test).

---

# Update 3: Satu backend (Laravel) — tahap 1

## Latar belakang

`server.ts` (Express) hanyalah server tiruan: datanya disimpan di memori dan hilang setiap restart.
Laravel belum punya sebagian besar API yang dipanggil aplikasi React, sehingga React **diam-diam menyimpan
data ke localStorage browser** setiap kali API gagal — data tiap komputer berbeda dan bisa hilang.

## Yang berubah

- **Express dihapus** (`server.ts`, test Node yang menembak Express, `metadata.json`, `php-test-runner.php`, `bun.lock`).
- **API Laravel baru** (semua wajib login + izin):
  - Santri: `GET/POST /api/v1/students`, `GET/PUT/DELETE /api/v1/students/{id}`
  - Referensi: `GET /api/v1/classrooms`, `/dormitories`, `/dormitory-rooms`
  - Sesi absensi: `GET /attendance/sessions`, `GET /attendance/sessions/{id}`, `POST .../open|close|cancel`,
    `GET .../participants`, `GET .../records`, `POST .../manual`, `POST .../manual-bulk`,
    `POST /attendance/records/{id}/correct` (dengan riwayat koreksi), `GET /attendance/kpi`, `GET /attendance/monitoring`
  - `POST /attendance/sessions/{id}/qr` kini mengembalikan bentuk respons yang dibaca layar scanner React.
- **Migrasi baru** `2026_11_15_000018`: kolom profil santri (nama panggilan, TTL, tahun masuk, wali, alamat, status),
  kode & kapasitas kelas, kode kamar.
- **Frontend React**: modul `studentApi` & `attendanceApi` sekarang **server-first**. Data lokal hanya dipakai
  bila server benar-benar tidak terjangkau (mode offline). Error dari server (NIS duplikat, sesi sudah ditutup,
  tidak punya izin) **ditampilkan**, tidak lagi disimpan diam-diam di browser.
- Perbaikan bug yang membuat source React tidak bisa di-build (`AccessControlView.tsx`), serta import ikon yang
  hilang (`DashboardView`, `QrScannerView`) yang bisa membuat halaman crash.

## Cara kerja baru (development & produksi)

```bash
# Produksi / komputer server pesantren
composer install --no-dev --optimize-autoloader
php artisan migrate --force
npm ci && npm run build      # build React -> public/assets + update public/app.html
php artisan optimize:clear

# Development
php artisan serve            # terminal 1 (Laravel, port 8000)
npm run dev                  # terminal 2 (Vite, port 3000, API diteruskan ke Laravel)
```

## Belum termasuk (tahap berikutnya)

Banyak tampilan lain di `App.tsx` (dashboard, laporan, KBM, asrama, staf, perangkat, dll.) masih membaca/menulis
state lokal. Endpoint berikut belum ada di Laravel: `/staff`, `/attendance/devices`, `/attendance/devices/logs`,
pembuatan sesi dari React, serta seluruh modul KBM/asrama/ekskul di sisi React.

---

# Update 4: Alat migrasi data browser → server (`/migrasi-data`)

Sebelum update 3, banyak data yang diisi lewat aplikasi React hanya tersimpan di **localStorage browser**
komputer operator. Halaman `/migrasi-data` memindahkannya ke MySQL.

## Cara pakai (lakukan di SETIAP komputer/HP yang pernah dipakai operator)

1. Buka `http://IP-SERVER:8000/migrasi-data` **di browser yang biasa dipakai operator** (localStorage terikat ke browser & alamat).
   Login dulu sebagai **Super Admin** (butuh izin `system.maintenance`).
   - Kalau operator tidak punya akun Super Admin: di komputer operator cukup klik **Unduh cadangan (.json)**,
     lalu di komputer admin pilih **Pakai file cadangan dari komputer lain…**.
2. **Unduh cadangan (.json)** dan simpan baik-baik.
3. **Jalankan simulasi** — server memeriksa tanpa menyimpan apa pun. Baca catatan peringatan (misal RFID/QR bentrok).
4. Centang konfirmasi → **Impor sekarang**.

## Aturan impor

- Santri dicocokkan lewat **NIS**, sesi lewat **kode sesi**, absensi lewat **(sesi, santri)** → aman diulang dari
  banyak komputer, tidak ada data ganda. Jika absensi di server berbeda dengan di browser, **data server dipertahankan**
  dan dilaporkan sebagai peringatan.
- **Data contoh bawaan aplikasi** (NIS `UBA2600xx`, sesi `ATT-20260823-...`) dilewati kecuali dicentang.
- Kelas/asrama/kamar/kegiatan hanya dibuat jika dipakai data yang diimpor (dicocokkan lewat nama/kode dulu).
- QR token lama dipertahankan (kartu tidak perlu dicetak ulang), kecuali bentrok dengan santri lain.
- Kartu RFID yang sudah dimiliki santri lain di server **tidak dipindahkan**.
- Sesi lama yang di browser masih "open" disimpan sebagai "closed".
- Data dikirim per batch 3.000 catatan. Jika server menolak karena ukuran, naikkan `post_max_size` & `upload_max_filesize`
  di `php.ini` (mis. `64M`) lalu ulangi — batch yang sudah masuk akan dilewati.
- Setiap impor nyata dicatat di audit log (`local_data.imported`).

Belum diimpor (belum ada tabelnya di server): data staf/absensi SDM, izin santri, jadwal KBM/asrama/ekskul.
Semua tetap ikut di file cadangan .json.

---

# Update 5: Satu backend — tahap 2 (SDM, perangkat, hidrasi aplikasi dari server)

## Yang berubah

- **Data SDM tersimpan di server** — tabel baru `staff_profiles` (NIP, jenis SDM, status kepegawaian, HP, bagian,
  jabatan, QR `STF-…`, RFID). API: `GET/POST /api/v1/staff`, `GET/PUT /api/v1/staff/{id}`.
  Impor Guru/SDM kini ikut menyimpan profil ini (sebelumnya dibaca dari CSV lalu dibuang).
- **Password awal akun hasil impor SDM acak** (sebelumnya semua `password`). Password ditampilkan **sekali** di layar
  hasil impor, lengkap dengan tombol "Salin semua (tempel ke Excel)".
- **Satu kartu RFID hanya untuk satu orang** — tidak bisa dipakai bersama oleh santri dan SDM.
- **Perangkat & log perangkat**: `GET /api/v1/attendance/devices` (status online/offline, jumlah tap hari ini),
  `GET /api/v1/attendance/devices/logs`. Setiap tap, kartu tak dikenal, alat belum aktif, dan API key salah dicatat
  di tabel `attendance_device_logs` (otomatis dibersihkan setelah 60 hari — butuh cron `schedule:run`).
- **Snapshot absensi**: `GET /api/v1/attendance/snapshot?from=&to=` (sesi + peserta + catatan, maks. 62 hari).
- **Aplikasi React memuat data dari server setelah login**: santri, kelas, asrama, kamar, sesi & absensi 14 hari terakhir,
  perangkat, SDM, dan pengguna. Absensi & perangkat disegarkan tiap 60 detik. Dashboard, laporan, dan monitoring kini
  menampilkan data MySQL, bukan data contoh.
- **Data lama di browser diamankan otomatis** ke `siuba_unmigrated_backup_v1` sebelum cache ditimpa data server.
  Aplikasi menampilkan pengingat, dan halaman `/migrasi-data` otomatis memakai salinan ini.
- **Perbaikan bug reset password diam-diam**: membuka form "Edit Pengguna" lalu menyimpan tanpa mengubah password
  dulu mengirim password `password` ke server (mereset password akun). Kini kolom password kosong = tidak diubah.

## Langkah setelah update

```bash
php artisan migrate --force
php artisan optimize:clear
# Cron (Linux) atau Task Scheduler (Windows) tiap menit:
php artisan schedule:run
```

## Belum termasuk (tahap 3)

Modul yang masih memakai data lokal di React: KBM/jadwal pelajaran, asrama/halaqah/piket, ekskul & event, izin santri,
absensi SDM/mengajar/pelatih, serta tombol "Login sebagai pengguna ini" di Manajemen Akses (hanya mengganti tampilan,
bukan login sungguhan).

---

# Update 6: Tahap 3 — Izin santri & presensi harian SDM di server

## Yang berubah

- **Izin / sakit / dispensasi santri** tersimpan di tabel `student_excusals`.
  API: `GET/POST /api/v1/student-excusals`, `POST /student-excusals/{id}/approve|reject|cancel`.
  Petugas dengan izin `attendance.excuses` → izin langsung disetujui. Halaman **Izin** di aplikasi kini menyimpan ke server.
  Saat operator menandai santri **alpa** (manual / sekaligus), santri yang punya izin disetujui pada jam sesi otomatis
  tercatat sesuai jenis izinnya (sakit/izin/dispensasi).
- **Presensi harian SDM** (check-in/check-out) di tabel `staff_attendance_records`:
  - Scan QR/RFID/NIP & entri manual susulan dari halaman **Presensi SDM** (`/sdm/presensi`) → server.
  - **Tap kartu RFID guru/SDM di alat ESP32** yang sama dengan santri: tap pertama = masuk, tap berikutnya = pulang
    (LCD: `Masuk Sukses`, `Masuk (TELAT)`, `Pulang Sukses`, `Hari Libur`, `Sedang Izin`).
  - Koreksi (wajib alasan, tercatat di audit log) dan **Finalisasi alpa** per tanggal.
  - Jadwal kerja server diatur di **`config/siuba.php`** (default: masuk 06:00, terlambat setelah 07:15, pulang 16:00;
    Jum'at 12:00; Sabtu 14:00; Ahad libur). Mengubah jadwal di layar aplikasi belum mengubah jadwal server.
- **Pengajuan izin/sakit/cuti/dinas SDM** di tabel `staff_absence_requests`; saat disetujui, hari kerja dalam rentang
  tanggal otomatis ditandai sesuai jenisnya, dan SDM tidak bisa check-in pada hari tersebut.
- Halaman SDM kini juga mengelola **data SDM lewat server** (tambah, ubah, nonaktifkan, pasang/lepas RFID, ganti QR).
- **Migrasi**: `/migrasi-data` kini juga mengimpor izin santri, data SDM, presensi harian SDM, dan pengajuan izin SDM
  dari browser. Data lama izin/presensi SDM yang dibuat di browser ikut diamankan sebelum cache ditimpa data server.
- Formulir izin santri tidak lagi berisi tanggal contoh `2026-08-23` (kini tanggal hari ini).

## Langkah setelah update

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache   # setelah menyesuaikan config/siuba.php bila perlu
```

## Belum termasuk (tahap 4)

Presensi mengajar (KBM) & melatih (ekskul), jadwal pelajaran, asrama/halaqah/piket, event, serta tombol
"Login sebagai pengguna ini" di Manajemen Akses.

---

# Update 7: Tahap 4 — KBM (jadwal pelajaran & presensi mengajar) di server

## Latar belakang

Seluruh data KBM di aplikasi (mapel, guru, jam pelajaran, penugasan, jadwal, kalender akademik) sebelumnya hanya
disimpan di memori browser — **hilang setiap halaman dimuat ulang** — dan sesi KBM dibuat di browser saja.

## Yang berubah

- API `GET /api/v1/academic/master` + CRUD: mapel, jam pelajaran, guru, penugasan mengajar, jadwal pelajaran
  (dengan cek bentrok kelas & guru), kalender akademik, dan guru pengganti. Halaman **KBM Master**, **Jadwal**,
  **Dashboard Guru**, dan **Monitoring KBM** kini memakai data server.
- **Guru = akun pengguna** (role `guru`) + profil SDM. Menambah guru dari menu KBM otomatis membuat akun login
  dengan password awal acak (ditampilkan sekali di notifikasi). Menghapus guru = menonaktifkan (riwayat tetap utuh).
- **Generate sesi KBM** di server (`POST /api/v1/academic/generate`, bisa rentang ≤31 hari), aman diulang,
  melewati hari libur di kalender akademik. Tahun ajaran & semester aktif dibuat otomatis bila belum ada.
- **Buka/tutup/batal sesi** dari aplikasi kini lewat server (sebelumnya hanya berubah di browser).
  - Saat sesi ditutup, peserta yang belum tercatat otomatis diberi status **izin/sakit/dispensasi** (jika ada izin
    disetujui) atau **alpa**.
  - **Presensi mengajar guru** otomatis tercatat: membuka kelas = hadir/terlambat (toleransi 10 menit),
    menutup kelas = selesai. Jika ada guru pengganti, yang tercatat adalah guru pengganti.
    Lihat via `GET /api/v1/staff-attendance/daily?type=teaching&date=YYYY-MM-DD`.
- Perbaikan bug generator sesi KBM server yang gagal jika kategori kegiatan ber-id 1 tidak ada.
- Tanggal bawaan di halaman Jadwal, Dashboard Guru, Monitoring KBM, dan Kalender kini hari ini (sebelumnya
  tertanam 24/25 Agustus 2026).

## Langkah setelah update

```bash
php artisan migrate --force   # tidak ada migrasi baru, aman dijalankan
php artisan optimize:clear
```

Data KBM lama di browser tidak bisa dimigrasikan (memang tidak pernah tersimpan); masukkan ulang lewat menu KBM.

## Belum termasuk (tahap 5)

Presensi melatih (ekskul) & ekstrakurikuler, asrama/halaqah/piket/rutinitas, event, dan tombol
"Login sebagai pengguna ini" di Manajemen Akses.

---

# Update 8: Tahap 5 — Ekskul, halaqah, piket, event di server + perbaikan akses

## Latar belakang

Data ekstrakurikuler, halaqah, jadwal piket, dan event khusus sebelumnya hanya ada di memori browser
(hilang saat halaman dimuat ulang, tidak terlihat dari perangkat lain).

## Yang berubah

- API baru `GET /api/v1/community/master` + penyimpanan:
  - **Ekstrakurikuler**: tambah ekskul, tambah/keluarkan anggota. Kuota dicek di server; bila penuh santri
    otomatis masuk daftar tunggu.
  - **Halaqah**: setiap perubahan di halaman Halaqah (buat halaqah, tambah/keluarkan santri) otomatis
    disimpan ke server. Halaqah yang dihapus = dinonaktifkan.
  - **Jadwal piket**: setiap perubahan di halaman Piket otomatis disimpan. Pilihan kegiatan piket memakai
    daftar kegiatan dari server.
  - **Event khusus**: buat event, ubah status, tambah sesi, pendaftaran santri (kuota → daftar tunggu),
    dan rule peserta. Menambah sesi event langsung membuat **sesi absensinya** dengan peserta = pendaftar
    yang disetujui; pendaftar yang disetujui belakangan ikut dimasukkan ke sesi yang belum ditutup.
- Hak akses baru: `extracurriculars.manage`, `halaqah.manage`, `duty_roster.manage`
  (admin & kesantrian semua; kepala asrama halaqah + piket; musyrif piket). Pengubahan event tetap `events.manage`.
- **Menu Pengaturan Sistem** (`system.settings`) kini hanya untuk super-admin & admin. Sebelumnya hampir
  semua role (guru, operator, pelatih, panitia PSB, dll.) bisa membuka pengaturan server, identitas lembaga,
  dan kebijakan scanner.
- **Tombol "Login" / "Coba Role Ini" di Manajemen Akses dihapus.** Tombol itu menimpa token login asli dengan
  token palsu sehingga semua data gagal dimuat dan identitas pengguna menjadi rancu. Untuk mencoba akun lain:
  keluar, lalu masuk dengan username akun tersebut.
- Perbaikan bug generator sesi event yang gagal bila kategori kegiatan ber-id 1 tidak ada.
- Tanggal bawaan form event kini hari ini.

## Langkah setelah update (WAJIB jalankan seeder hak akses)

```bash
php artisan migrate --force
php artisan db:seed --class=RolePermissionSeeder --force
php artisan permission:cache-reset
php artisan optimize:clear
```

Catatan: seeder menyetel ulang hak akses role bawaan ke nilai standar. Bila Anda pernah mengubah hak akses
role lewat database, periksa kembali setelah menjalankannya.

## Belum termasuk (tahap 6)

Master kegiatan & jadwal rutin (shalat, dll.), kalender waktu shalat, presensi pembina ekskul,
dan kelompok santri khusus — masih tersimpan di browser.

---

# Update 9: Tahap 6 — Master kegiatan, jadwal rutin, sesi manual di server + jam aplikasi asli

## Latar belakang

Master kegiatan (shalat, apel, dll.), jadwal rutin, pengecualian jadwal, kalender waktu shalat, dan
penanggung jawab kegiatan masih tersimpan di browser. Akibatnya "Generate Sesi Rutin" dan "Buat Sesi"
hanya membuat sesi di browser itu saja — tidak bisa dipakai alat RFID, HP lain, maupun laporan server.
Selain itu jam aplikasi **tertanam pada 23 Agustus 2026 pukul 04:25**, sehingga Timeline Rutin dan
beberapa halaman selalu menampilkan tanggal itu.

## Yang berubah

- **Master kegiatan** (`/kegiatan`): tambah, ubah, hapus, dan izin metode (manual/QR/RFID) tersimpan di
  server. Jam bawaan dan target peserta (semua santri / kelas / asrama / kamar / halaqah / ekskul + putra/putri)
  ikut tersimpan dan dipakai saat membuat sesi. Kegiatan yang sudah punya riwayat absensi hanya dinonaktifkan.
- **Jadwal rutin** (`/rutin/jadwal`): jadwal (harian / mingguan / hari tertentu, masa berlaku, lokasi, peserta),
  pengecualian (libur/ganti jam), kalender waktu shalat, dan penanggung jawab otomatis tersimpan ke server.
- **Generate Sesi Rutin** di Timeline Rutin kini dibuat oleh server (aman diulang, mengikuti pengecualian,
  jadwal lewat tengah malam ditangani).
- **Buat Sesi manual** (`/absensi/sesi`) kini membuat sesi di server dengan snapshot peserta.
- **Jam aplikasi = jam komputer/HP** (diperbarui tiap 30 detik). Tanggal bawaan di halaman Sesi,
  Laporan, dan Laporan Akademik juga hari ini.
- Perbaikan bug: aturan peserta "asrama" di server sebelumnya error (kolom `dormitory_id` tidak ada di
  tabel santri) — kini dicari lewat kamar santri.
- Hak akses baru `routine_schedule.manage` (admin, kesantrian, kepala asrama). Admin kini juga punya
  `activities.delete`. Tombol generate sesi rutin di server tidak lagi bisa dipakai role yang hanya
  berhak melihat.

## Langkah setelah update

```bash
php artisan migrate --force          # menambah kolom kegiatan/jadwal + tabel kalender shalat (data lama aman)
php artisan db:seed --class=RolePermissionSeeder --force
php artisan permission:cache-reset
php artisan optimize:clear
```

Kegiatan lama yang dibuat di browser bisa dipindahkan lewat `/migrasi-data.html` (jam bawaan & target
peserta perlu dicek ulang di menu Kegiatan setelah migrasi). Jadwal rutin lama di browser perlu
dimasukkan ulang di menu Jadwal Rutin.

## Catatan

Peserta jenis "kelompok khusus" dan "individual" belum didukung di server — sementara dianggap semua santri.

## Belum termasuk (tahap 7)

Presensi pembina ekskul (halaman Presensi Pembina) dan kelompok santri khusus masih tersimpan di browser.

---

# Update 10: Tahap 7 — Presensi pembina ekskul & kelompok santri di server + perbaikan khusus MySQL

## Latar belakang

Halaman **Presensi Pembina Ekskul** (`/sdm/pelatih`) sepenuhnya berjalan di browser, dan jadwal latihannya
**tertanam di kode** (mis. "Senin = ekskul nomor 1 dan 2"), sehingga sesi latihan tidak mencerminkan ekskul
yang sebenarnya. Kelompok santri khusus juga hanya tersimpan di browser.

## Yang berubah

- **Jadwal latihan mingguan** per ekskul (tab Penugasan → Jadwal Latihan Mingguan). Tombol **Generate Sesi**
  membuat sesi latihan dari jadwal ini (aman diulang, melewati hari libur di kalender akademik).
- **Penugasan pelatih** (utama/asisten/pembina) dan **pelatih pengganti (inval)** tersimpan di server; pengganti
  langsung diterapkan ke sesi pada tanggal itu dan bisa dibatalkan.
- **Presensi melatih**: tap kartu RFID / QR / nomor induk SDM — tap pertama = mulai melatih (terlambat bila lewat
  15 menit), tap kedua = selesai. Tercatat sebagai presensi SDM jenis *training*.
- **Jurnal latihan**, **finalisasi** (sesi tanpa presensi pelatih → alpa), ringkasan, dan **rekonsiliasi**
  dihitung di server.
- **Kelompok santri khusus**: buat kelompok, tambah/keluarkan anggota (halaman Ekstrakurikuler & Kelompok Khusus).
  Kegiatan dengan peserta "kelompok khusus" kini benar-benar memakai anggota kelompok itu.
- Tanggal bawaan halaman pembina = tanggal lokal (sebelumnya memakai UTC sehingga sebelum pukul 07:00 WIB
  menampilkan tanggal kemarin).

## Perbaikan yang hanya muncul di MySQL/MariaDB (seluruh test kini juga dijalankan di MariaDB)

- **Absensi santri bisa gagal tersimpan** ("Terjadi kesalahan sistem") bila santri tap pada sesi yang sudah
  sangat lama terbuka: menit terlambat melebihi batas kolom database. Nilainya kini dibatasi.
- Presensi manual SDM tanpa jam masuk mengirim nilai kosong ke kolom yang wajib terisi — diperbaiki.

## Langkah setelah update

```bash
php artisan migrate --force          # menambah 6 tabel baru (data lama aman)
php artisan optimize:clear
```

Data presensi pembina lama di browser berisi jadwal contoh, jadi tidak dimigrasikan. Isi jadwal latihan dan
penugasan pelatih sekali di tab Penugasan. Kelompok santri lama di browser perlu dibuat ulang.

---

# Update 11: Tahap 8 — Kelas, asrama, kamar, perangkat di server + seeder aman diulang

## Latar belakang

Halaman **Kelas & Asrama** dan **Perangkat** ternyata masih hanya mengubah tampilan di browser: kelas, gedung
asrama, kamar, dan perangkat RFID yang ditambah/diubah/dihapus di sana tidak pernah tersimpan ke database, dan
kembali seperti semula setelah halaman dimuat ulang.

## Yang berubah

- **Kelas**: tambah/ubah/hapus tersimpan di server. Nama wali kelas dicocokkan ke akun pengguna dengan nama yang
  sama. Kelas yang dipakai jadwal/riwayat KBM hanya **dinonaktifkan** (bila dihapus, jadwal & riwayat KBM ikut
  terhapus).
- **Gedung asrama & kamar**: tersimpan di server. Asrama yang masih dihuni santri tidak bisa dihapus; menghapus
  kamar membuat santrinya tanpa kamar.
- **Perangkat**:
  - Tambah perangkat dari aplikasi = langsung terdaftar & aktif (masuk whitelist).
  - **Token perangkat** yang ditampilkan saat menambah / "rotate secret" kini benar-benar berlaku: alat boleh
    mengirim header `X-DEVICE-TOKEN: <token>` sebagai pengganti kunci global. Token bisa diganti kapan saja dan
    token lama langsung tidak berlaku. Firmware lama dengan `X-GLOBAL-KEY` tetap berjalan.
  - **Mode alat** tersimpan dan dipatuhi server: *attendance* (normal), *enrollment* (tap hanya membaca UID untuk
    halaman Registrasi RFID, tidak mencatat absensi), *maintenance* (semua tap ditolak).
  - **Kunci alat ke satu sesi**: selama sesi itu terbuka, semua tap dari alat tersebut dicatat ke sesi itu.
- Tombol **Reset Data** di Pengaturan kini hanya memuat ulang data dari server (dulu mengganti tampilan dengan data
  contoh).
- Halaman **Simulator QR/RFID** diberi tanda jelas bahwa hasilnya tidak disimpan.
- **Seeder akun bawaan aman dijalankan ulang**: `php artisan db:seed` tidak lagi mengembalikan password, nama, dan
  role akun bawaan yang sudah ada. Nama akun contoh `pimpinan.pondok` diganti "Pimpinan Pondok (contoh)".

## Langkah setelah update

```bash
php artisan migrate --force          # menambah kolom mode & sesi pada tabel perangkat
php artisan db:seed --class=RolePermissionSeeder --force
php artisan permission:cache-reset
php artisan optimize:clear
```

Hak akses baru `classrooms.manage` (admin, kesantrian, akademik). Asrama & kamar memakai `dormitory.manage`.

---

# Update 12: Tahap 9 — Laporan memakai data server

## Latar belakang

- **Laporan SDM** (Kehadiran SDM Harian, Mengajar KBM, Melatih Ekskul, Izin SDM) membaca data dari penyimpanan
  browser, bukan dari server. Bila browser belum pernah menyimpan apa pun, laporan menampilkan **data contoh bawaan**
  (mis. "Pak Joko Santoso") seolah-olah data sungguhan.
- **Laporan Absensi Santri** hanya menghitung dari 14 hari terakhir yang dimuat aplikasi, sehingga rekap bulanan
  atau periode yang lebih lama **diam-diam tidak lengkap**.

## Yang berubah

- Endpoint baru `GET /api/v1/reports/staff-dataset?from=&to=` (maks. 93 hari): data SDM, presensi harian/mengajar/
  melatih, izin SDM, sesi mengajar KBM, sesi latihan ekskul, penugasan pelatih.
  Guru/pelatih yang tidak punya hak laporan SDM hanya menerima datanya sendiri.
- Keempat laporan SDM memuat data server setiap kali periode diubah (ada tanda "Memuat data laporan dari server…").
- Laporan Absensi Santri mengambil data absensi untuk periode yang dipilih langsung dari server
  (`/api/v1/attendance/snapshot`, kini maks. 93 hari).
- Laporan Perangkat menampilkan mode, lokasi, dan waktu terakhir terhubung yang sebelumnya kosong.

## Langkah setelah update

```bash
php artisan optimize:clear
```
(tidak ada migrasi baru)
