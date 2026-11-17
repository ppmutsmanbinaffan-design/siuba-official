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

---

# Update 13: Tahap 10 — Pengaturan lembaga & desain kartu di server, halaman Pengaturan jujur

## Latar belakang

- Halaman **Pengaturan Sistem** hanya menyimpan ke browser, dan isinya **tidak dipakai di mana pun**: nama lembaga
  di kop laporan, menu, dan halaman login tertanam di kode (dengan beberapa versi nama berbeda).
- Beberapa tombol hanya **simulasi**: "Uji Ping" menampilkan angka acak, "Bersihkan Cache" tidak melakukan apa-apa,
  dan **"Export .ENV" membuat file .env berisi nilai karangan** — berbahaya bila dipakai menimpa .env asli.
- **Desain kartu santri** hanya tersimpan di browser yang membuatnya.
- Semua error HTTP API (alamat tidak ada, metode salah, data terlalu besar) dilaporkan sebagai **500 "kesalahan
  internal"** dan dicatat di log error.

## Yang berubah

- Tabel baru `app_settings`. **Identitas lembaga** (yayasan, nama, nama singkat, slogan, alamat, telepon, email,
  pimpinan, kota, tahun ajaran) dan **aturan absensi** tersimpan di server dan berlaku di semua perangkat.
  Nama/alamat dipakai di halaman login, menu, dashboard, dan **kop semua laporan**.
- Toleransi terlambat di Pengaturan menjadi nilai bawaan untuk kegiatan baru.
- Tab Server, Database, dan Environment kini menampilkan **keadaan server sebenarnya** (baca saja: versi PHP/Laravel,
  database, cache, mode, URL, IP server, status kunci IoT). Tombol Export .ENV dihapus.
- Uji koneksi mengukur respons server sungguhan; Bersihkan Cache benar-benar menjalankan pembersihan cache server
  (atau cache browser untuk "PWA Storage Buffer").
- **Desain kartu santri** tersimpan di server (otomatis saat diubah). Desain yang sudah ada di browser dikirim ke
  server saat halaman Kartu Santri pertama kali dibuka.
- Error HTTP API kini memakai kode yang benar (404, 405, 413, …) dengan pesan berbahasa Indonesia.
- Konfigurasi firmware di halaman Perangkat kini menunjuk alamat server ini dan endpoint yang benar
  (`/api/v1/iot/rfid-tap`, header `X-DEVICE-TOKEN`). Teks kredensial yang disalin dari Manajemen Akses memakai
  alamat server ini (dulu tertanam 192.168.1.10:8000).

## Langkah setelah update

```bash
php artisan migrate --force          # tabel app_settings
php artisan optimize:clear
```
Lalu buka **Pengaturan → Profil Lembaga & Waktu**, lengkapi identitas lembaga, dan tekan Simpan.

---

# Update 14: Tahap 11 — Laporan KBM & Dashboard SDM memakai data server

- **Laporan Akademik KBM** (`/kbm/laporan`): data tanggal yang dipilih kini diambil langsung dari server. Sebelumnya
  tanggal lebih lama dari 14 hari terakhir tampil kosong. Pilihan kelas otomatis menyesuaikan saat data kelas selesai dimuat.
- **Dashboard SDM** (`/sdm/dashboard`): ringkasan kehadiran SDM, mengajar, dan melatih kini dihitung dari data server
  tanggal itu. Sebelumnya dihitung dari data browser — yang kosong atau berisi **data contoh bawaan**.
- Halaman **Izin Santri**: hitungan "izin hari ini" memakai tanggal hari ini (sebelumnya tertanam 23 Agustus 2026).

Tidak ada migrasi baru; cukup `php artisan optimize:clear`.

---

# Update 15: Tahap 12 — Backup & pemulihan database sungguhan

## Latar belakang

- Tombol **Buat Backup** di Maintenance Hub hanya menyimpan salinan data *browser* ke penyimpanan browser — database
  server tidak pernah dicadangkan dari aplikasi.
- Perintah `php artisan system:backup` di server hanya mencadangkan ±29 tabel tertentu: **data SDM, hak akses/role,
  pengaturan, CMS, ekskul/pembina, kelompok santri, dll. tidak ikut**. Pemulihannya memakai TRUNCATE yang di MySQL
  tidak bisa dibatalkan bila gagal di tengah jalan.
- `php artisan system:audit-integrity` selalu error (kolom `d.name` tidak ada).

## Yang berubah

- Backup mencakup **semua tabel data** (otomatis, termasuk tabel yang ditambah di masa depan), ditulis bertahap ke
  `storage/app/backups/*.ndjson.gz` (hemat memori, terkompresi). Tabel sistem (sesi login, token, cache, antrean)
  tidak ikut. Disimpan 14 backup terakhir.
- **Pusat Backup** di Maintenance Hub: buat backup, lihat daftar & status, **unduh** berkas backup, hapus, dan
  **pulihkan** (hanya Super Admin, wajib mengetik `PULIHKAN <ID BACKUP>`).
- Pemulihan: backup pengaman dibuat otomatis dulu; data diganti dalam satu transaksi (bila gagal, semua dibatalkan);
  backup dari versi aplikasi lebih lama tetap bisa dipulihkan (kolom yang sudah tidak ada dilewati).
- **Backup otomatis**: `start-siuba-offline.bat` membuat backup setiap kali dijalankan bila backup terakhir lebih dari
  20 jam lalu. Bila server memakai cron / Task Scheduler (`php artisan schedule:run`), backup harian juga berjalan pukul 01:30.
- Admin kini boleh membuat & mengunduh backup (hak akses baru `system.backup`); pemulihan tetap hanya Super Admin.
- Perbaikan `system:audit-integrity`.

## Langkah setelah update

```bash
php artisan db:seed --class=RolePermissionSeeder --force
php artisan permission:cache-reset
php artisan optimize:clear
php artisan system:backup --notes="Backup pertama"
```

**Penting:** backup tersimpan di komputer yang sama dengan database. Unduh backup secara berkala (mis. seminggu sekali)
dari Maintenance Hub → Backup Database, lalu simpan di flashdisk atau Google Drive.

---

# Update 16: Tahap 13 — Maintenance Hub memakai server (status, integritas, log, reset)

## Latar belakang

Selain Backup (tahap 12), tab lain di Maintenance Hub juga hanya bekerja pada data browser:
- **Status Sistem** menghitung jumlah data dan "ukuran database" dari data yang dimuat browser.
- **Pemeriksaan Integritas** memeriksa data browser, bukan database.
- **Log Maintenance** hanya berisi catatan di browser.
- **Reset Database** hanya mengosongkan tampilan browser — database server tidak tersentuh, padahal wizard
  menyatakan berhasil. Sakelar "Guard Settings" juga hanya mengubah nilai di browser.

Ditemukan juga bug yang hanya muncul di MySQL/MariaDB: laporan kesehatan sistem (`php artisan system:health`) selalu
error karena mencari kolom `status` yang tidak ada di tabel perangkat. Status penjadwal selalu tampil "sehat"
walaupun penjadwal tidak pernah berjalan.

## Yang berubah

- **Status Sistem**: jumlah data per tabel, ukuran database sebenarnya, backup terakhir, dan hasil pemeriksaan
  integritas terakhir — semuanya dari server.
- **Pemeriksaan Integritas** dijalankan di server terhadap database (hasil terakhir disimpan).
- **Log Maintenance** dari audit log server (backup, pemulihan, reset, pemeriksaan integritas, dll.).
- **Reset Database** benar-benar dijalankan di server (hanya Super Admin):
  - wajib kata sandi akun yang login + frasa `RESET DATABASE SIUBA`; backup otomatis dibuat dulu;
  - *Mode A (Operasional)*: menghapus semua transaksi (presensi santri & SDM, sesi, KBM, latihan, izin, piket, log
    perangkat) — data master tetap;
  - *Mode B (Master)*: Mode A + santri, kelas, asrama, kegiatan, ekskul, halaqah, SDM — akun, hak akses, pengaturan,
    dan CMS tetap;
  - *Mode C (Pabrik)*: semua tabel dibuat ulang + data awal (akun ikut kembali ke akun bawaan);
  - penghapusan dalam satu transaksi (gagal = dibatalkan); dibatasi 5 percobaan/menit.
- Izin reset diatur di `.env`: `SIUBA_ALLOW_DATABASE_RESET=true/false` (**set `false` setelah aplikasi dipakai sungguhan**).
- Laporan kesehatan: perangkat "online" = aktif & terhubung dalam 10 menit terakhir; status penjadwal jujur
  (penjadwal opsional di XAMPP); "backup terakhir … jam lalu" tidak lagi bernilai negatif.

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tambahkan ke `.env` setelah data asli mulai dipakai:
```
SIUBA_ALLOW_DATABASE_RESET=false
```

---

# Update 17 — Tahap 14: Absensi offline benar-benar terkirim ke server

Masalah sebelumnya:
- Absensi yang dicatat saat server mati hanya tersimpan di cache browser, lalu **tertimpa data server** dalam ≤60 detik — hilang.
- `apiClient` mengubah *setiap* POST/PUT/DELETE yang gagal menjadi "absensi tertunda" palsu (santri 0, sesi 1).
- Tombol "Sinkronkan" di Pusat Sinkronisasi hanya simulasi.

Perbaikan:
- Absensi manual, massal, dan QR saat offline masuk **antrean offline** (`siuba_pending_attendance`), juga bila data
  sesi/santri belum ada di cache perangkat (server yang memvalidasi saat sinkron). Operator melihat pemberitahuan kuning.
- Antrean dikirim **otomatis** ke `/offline/attendance/sync` saat koneksi kembali (dan tiap 60 detik), per 200 data;
  hasil: tersinkron / konflik / gagal (dengan jumlah percobaan).
- Pusat Sinkronisasi: tombol sinkron memakai server sungguhan; konflik "pakai data offline" mengoreksi catatan server,
  "pakai data server" menutup konflik; tombol backup membuat & mengunduh backup server.
- Antrean palsu dari `apiClient` dihapus. Buka/tutup/batal sesi saat offline kini ditolak dengan pesan jelas.
- Data sesi, peserta, dan catatan yang dibuka saat online disimpan ke cache, sehingga mode offline punya data terbaru.

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Setelah update, muat ulang browser (Ctrl+F5).

---

# Update 18 — Tahap 15: Import santri & SDM langsung dari Excel (.xlsx)

- Import Santri dan Import Guru/SDM kini menerima **file Excel .xlsx** (sheet pertama dibaca), selain CSV/TXT.
  Tanpa paket tambahan — cukup ekstensi PHP `zip` (aktif bawaan di XAMPP).
- Tombol **Template Excel (.xlsx)**: semua sel berformat Teks, jadi NIS, NISN, No HP, dan UID RFID yang diawali
  angka 0 tidak berubah saat diisi di Excel. Template CSV tetap tersedia.
- Pembacaan Excel menangani: angka panjang (No HP 62812… tidak jadi 6,28E+12), tanggal Excel (jadi `YYYY-MM-DD`),
  sel kosong di tengah baris, teks multi-baris di dalam sel, dan baris kosong.
- CSV lama ber-encoding Windows (huruf seperti é) otomatis dikonversi ke UTF-8.
- Pesan jelas untuk file `.xls` lama (simpan ulang sebagai .xlsx/CSV), file rusak, dan file >10 MB.
- Dialog import kini menampilkan pesannya sendiri (sebelumnya pesan seperti "template diunduh" atau
  "format salah" tidak pernah tampil karena tidak tersambung ke halaman).

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Bila muncul pesan "Ekstensi PHP zip belum aktif": buka XAMPP → Config → PHP (php.ini),
hapus tanda `;` di depan `extension=zip`, lalu restart Apache.

---

# Update 19 — Tahap 16: Pemeriksaan tipe menyeluruh & perbaikan bug tampilan

Paket tipe React (`@types/react`) ternyata tidak terpasang, sehingga kode tampilan tidak pernah diperiksa.
Setelah dipasang muncul 181 kesalahan; semuanya sudah diperbaiki (kini 0, cek dengan `npm run typecheck`).
Bug nyata yang ikut terungkap dan diperbaiki:

- **Profil 360°**: kotak pencarian membuat halaman error; banyak kolom kosong (NIS, wali, riwayat presensi, izin,
  piket, presensi SDM) karena membaca nama kolom yang salah; nama/HP wali palsu ("H. Abdullah") tidak lagi ditampilkan.
- **Tanggal "hari ini" palsu (23/08/2026)** di Dashboard Operasional, Pusat Absensi, Sesi Absensi, Pusat Laporan,
  Dashboard Eksekutif, dan simulator — kini memakai tanggal sebenarnya.
- **Tambah anggota Ekskul / Kelompok** tidak berfungsi (alamat API salah) — diperbaiki.
- **Tombol "Batal"** pada dialog konfirmasi buka/tutup sesi tidak berfungsi — diperbaiki.
- **Dashboard Absensi**: tombol Monitoring & RFID tidak berfungsi; **Detail Sesi** (tampilan HP) tidak membuka detail;
  tombol kembali di detail sesi — diperbaiki.
- **Penyesuaian Jadwal Rutin "Dibatalkan"** tidak membatalkan sesi (kode `cancel` vs `cancelled`) — diperbaiki.
- **Dashboard SDM terintegrasi**: grafik tren selalu "belum ada data", dan data santri tidak dikirim ke halaman.
- **Jurnal latihan pelatih** yang sudah diisi tidak dihitung "terlaksana".
- **Laporan Perangkat**: tidak lagi menampilkan perangkat & log fiktif; tombol ekspor CSV, cetak, dan hapus filter
  diperbaiki; status log tidak lagi selalu "ERROR".
- **Filter peran SDM** (Administrasi, Karyawan, Pelatih) di laporan & presensi harian SDM tidak pernah cocok — diperbaiki.
- **Kartu QR santri**: tombol perbarui token dari dialog kartu QR mengirim data salah — diperbaiki.
- Teks putih di atas latar putih (nama santri di Detail Sesi, dll.) — diperiksa otomatis di 46 halaman, kini 0 temuan.
- Tombol berwarna "default/destructive" yang tampil tanpa warna kini berwarna.

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Muat ulang browser (Ctrl+F5).

---

# Update 20 — Tahap 17: Halaman publik & PSB tetap rapi saat offline

Halaman `landing`, `psb`, `cms-landing`, `manajemen-psb`, dan `registrasi-rfid` sebelumnya memuat Tailwind (CDN),
Google Fonts, ikon Material Symbols, dan Font Awesome dari internet. Saat jaringan pondok offline, halaman tampil
tanpa gaya dan menu "Pusat Manajemen PSB" error.

- Semua aset kini disimpan lokal di `public/offline-assets/` (CSS per halaman, font Urbanist / Plus Jakarta Sans /
  JetBrains Mono, ikon Material Symbols Rounded, Font Awesome). Tidak ada lagi permintaan ke CDN.
- Foto contoh (Unsplash) yang gagal dimuat saat offline otomatis diganti gambar pengganti hijau berisi keterangan foto.
  Ganti dengan foto pondok sendiri melalui menu CMS Landing.
- Video profil: bila belum diisi di CMS, kini tampil pesan "Video profil belum tersedia" (sebelumnya memutar video
  YouTube contoh yang tidak terkait pondok).
- Nomor WhatsApp contoh tidak lagi ikut tersimpan saat admin menyimpan pengaturan PSB di CMS, dan tombol WhatsApp
  di halaman PSB tidak lagi mengarah ke nomor contoh sebelum data CMS termuat.
- Jika class Tailwind di salah satu halaman tersebut diubah, buat ulang CSS-nya dengan `npm run build:static-pages`
  (butuh internet sekali untuk mengunduh Tailwind v3).

Catatan: ukuran font ikon Material Symbols ±5,4 MB (berisi semua ikon karena admin bisa memilih ikon bebas di CMS);
hanya diunduh sekali lalu disimpan di cache browser.

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Muat ulang browser (Ctrl+F5).

---

# Update 21 — Tahap 18: Tidak ada lagi data contoh yang tampil sebagai data asli

Sebagian layar masih memakai data contoh bawaan (santri, perangkat, log, pengguna, kelas, audit) bila cache browser
kosong atau data tertentu tidak pernah dikirim server. Perbaikan:

- **Log perangkat** kini dari server (`GET /attendance/device-logs`) — Laporan Perangkat & Monitoring RFID SDM tidak lagi
  menampilkan perangkat/log contoh (Monitoring RFID SDM sebelumnya membaca cache yang tak pernah terisi).
- **Riwayat koreksi presensi** ikut dikirim di snapshot absensi.
- **Audit Keamanan**: log audit contoh ("KH. Abdullah Syukri", dsb.) dihapus dan dibersihkan dari cache browser;
  log kini dari server (`GET /audit-logs`, izin `system.security_audit`) digabung dengan log perangkat.
- **Tombol "Buat Backup" di Audit Keamanan** dulu hanya mencatat "backup berhasil" tanpa membuat file — kini membuat
  backup sungguhan di server. "Drill pemulihan" rekaan diganti petunjuk ke Maintenance Hub → Pusat Backup.
- **Filter kelas** di Absensi Manual & Detail Sesi, **filter kategori** dan nama kegiatan di Sesi Absensi & Dashboard
  Absensi kini memakai data server (sebelumnya daftar kelas/kegiatan contoh).
- Data awal aplikasi, daftar santri, kelas, kamar, dan pengguna tidak lagi diisi data contoh sebelum/ tanpa sinkron
  server (perangkat baru menampilkan daftar kosong sampai tersambung ke server).
- Hari libur untuk jadwal kerja SDM kini dari kalender akademik server (bukan kalender contoh).
- Fungsi reset lokal lama yang mengisi ulang data contoh dihapus (reset kini hanya lewat server).

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Muat ulang browser (Ctrl+F5).

---

# Update 22 — Tahap 19: Presensi mengajar guru (KBM) tersimpan di server

Sebelumnya presensi mengajar guru hanya tersimpan di browser (diawali jadwal contoh), dan halamannya bahkan
belum terpasang di menu mana pun.

- Menu **Presensi SDM & Guru → tab "Presensi Mengajar (KBM)"**: daftar jam pelajaran per tanggal, ringkasan
  (hadir, terlambat, izin/sakit/alpa, digantikan, belum tercatat), detail sesi, scanner QR guru, dan guru pengganti.
- API baru `/api/v1/teaching/*`: daftar & detail sesi, scan QR/RFID guru (scan pertama = mulai mengajar,
  scan kedua = selesai), presensi manual (hadir / izin / sakit / alpa), **jurnal mengajar** (materi, catatan,
  jumlah santri hadir), finalisasi akhir hari (yang belum presensi → alpa), dan penetapan guru pengganti.
- Terlambat dihitung dari jam mulai pelajaran + toleransi di Pengaturan Absensi (bawaan 15 menit).
- Presensi mengajar dicatat sebagai presensi SDM tipe "teaching", sehingga langsung masuk Laporan SDM.
- Guru yang hanya punya akses Dashboard Guru hanya melihat & mencatat sesinya sendiri; peran "guru" bawaan
  (yang juga punya akses monitoring KBM) dapat memantau semua sesi seperti sebelumnya.
- **Dashboard Guru KBM**: tombol baru "Catat Hadir Mengajar (Saya)".
- Sesi KBM tetap dibuat dari menu **Jadwal Pelajaran → Generate Sesi**.
- Perbaikan umum: tanggal "hari ini" di 56 tempat dihitung dengan jam UTC, sehingga sebelum pukul 07.00 WIB
  aplikasi menganggap hari masih kemarin (presensi pagi, scanner, laporan, dashboard) — kini memakai tanggal lokal.
- Data contoh tidak lagi dipakai sebagai cadangan di layanan latihan ekskul, guru/pelatih pengganti, dan sesi
  mengajar lama.

## Langkah setelah update

Ada **1 migrasi baru** (kolom jurnal mengajar):

```bash
php artisan migrate --force
php artisan optimize:clear
```
(`jalankan-siuba.bat` menjalankan keduanya otomatis.) Muat ulang browser (Ctrl+F5).

---

# Update 23 — Tahap 20: Jadwal kerja SDM & Kebijakan Keamanan benar-benar berlaku di server

## Jadwal kerja SDM
- Tab **Presensi SDM & Guru → Jadwal Kerja** kini menyimpan ke server (`PUT /staff-attendance/work-schedule`).
  Sebelumnya perubahan hanya tersimpan di browser, sementara server tetap memakai jadwal tetap di `config/siuba.php`.
- Jam buka presensi, jam masuk, batas terlambat, jam pulang, tutup presensi, dan hari kerja per hari langsung dipakai
  untuk scan/presensi manual, finalisasi alpa, dan ringkasan. Urutan jam divalidasi; perubahan dicatat di log audit.
- **Hari libur kalender akademik** (Jadwal Pelajaran → kalender, tipe "libur") kini dianggap bukan hari kerja SDM:
  scan menampilkan "Hari ini libur: …" dan finalisasi tidak menandai alpa.
- Nama hari di kartu jadwal kini dalam Bahasa Indonesia.

## Kebijakan Keamanan (Audit Keamanan → Kebijakan Keamanan)
Disimpan di server (`PUT /settings/security`, khusus pemegang izin Audit Keamanan / Super Admin) dan DITEGAKKAN:
- Batas waktu sesi tidak aktif (0 = nonaktif, bawaan; disarankan tetap nonaktif untuk perangkat scanner gerbang).
- Penguncian akun setelah N kali login gagal, selama X menit.
- Aturan kata sandi (panjang minimal, wajib angka, wajib simbol) untuk akun baru & ganti kata sandi.
- Izin login multi-sesi (bawaan: login baru mengakhiri sesi di perangkat lain — sama seperti sebelumnya).
- Masa simpan log audit (log lebih lama dibersihkan otomatis tiap malam bersama log perangkat).
Nilai bawaan sama dengan perilaku sebelumnya, jadi tidak ada yang berubah sampai admin mengubahnya.

## Lain-lain
- Bila sesi login ditolak server (berakhir / login di perangkat lain), aplikasi kini kembali ke halaman login
  dengan pesan penjelasan (sebelumnya token terhapus diam-diam dan layar penuh pesan galat).

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Muat ulang browser (Ctrl+F5).

---

# Update 24 — Tahap 21: Aturan Absensi berlaku sungguhan + penjadwal Windows

Sebelumnya lima dari enam isian di **Pengaturan Sistem → Aturan Absensi** hanya tersimpan, tidak dipakai di mana pun.
Kini semuanya berlaku:

| Pengaturan | Perilaku sekarang |
|---|---|
| Toleransi terlambat | Bawaan untuk sesi KBM baru dan untuk kegiatan yang toleransinya dikosongkan (kolom kegiatan kini boleh kosong = ikut pengaturan). Kegiatan dengan toleransi sendiri tetap memakai nilainya. |
| Auto-close sesi (menit) | Penjadwal mengecek tiap 5 menit: sesi berstatus *dibuka* yang waktu selesainya sudah lewat N menit ditutup, peserta yang belum tercatat ditandai **Alpa** (atau Sakit/Izin/Dispensasi bila ada izin disetujui). 0 = nonaktif. Bawaan 30 menit. Perintah manual: `php artisan attendance:auto-close`. |
| Debounce RFID (detik) | Tap ulang kartu yang sama dalam N detik diabaikan; alat menerima kode `DUPLICATE_TAP` ("Tunggu Sebentar"). 0 = nonaktif. |
| Izin mandiri | Bila dimatikan, hanya pemegang izin *attendance.excuses* yang boleh menginput surat izin; guru/wali kelas/petugas absensi mendapat pesan penolakan. |
| Bunyi konfirmasi | Menjadi bawaan bunyi di semua halaman scanner (QR, manual, simulator RFID); tombol bunyi di halaman scanner tetap bisa dipakai. |
| Mode kios layar penuh | Halaman scanner masuk layar penuh pada sentuhan/klik pertama (browser melarang layar penuh tanpa interaksi). |

## Penjadwal otomatis di Windows (XAMPP)
Pekerjaan otomatis (auto-close sesi, backup harian 01:30, pembersihan log 02:15, tanda penjadwal hidup)
butuh `php artisan schedule:run` tiap menit. Di Windows:

1. Klik dua kali **`pasang-penjadwal-windows.bat`** (sekali saja). Ini membuat tugas Task Scheduler
   bernama **"SIUBA Penjadwal"** yang menjalankan `siuba-penjadwal.vbs` tiap menit tanpa jendela.
2. Cek di aplikasi: **Maintenance Hub → Status** — tanda penjadwal harus "hidup".
3. Untuk melepas: **`hapus-penjadwal-windows.bat`**.

Tugas berjalan selama pengguna Windows yang memasangnya sedang login. `jalankan-siuba.bat` kini mengingatkan
bila penjadwal belum dipasang.

## Langkah setelah update

```bash
php artisan migrate --force
php artisan optimize:clear
```
(`jalankan-siuba.bat` menjalankan keduanya otomatis.) Lalu jalankan `pasang-penjadwal-windows.bat` sekali.
Muat ulang browser (Ctrl+F5).

---

# Update 25 — Tahap 22: Keamanan & Audit memakai data server (bukan angka contoh)

Sebelumnya tab **Status & Kesehatan**, **Integritas Data**, dan **Disaster Recovery** di menu Keamanan & Audit
menampilkan angka rekaan (disk 68,4%, "PostgreSQL 16", backup "3,5 jam lalu", semua kontrol "PASS",
tanggal uji pemulihan fiktif) dan "perbaikan otomatis" yang hanya mengubah data di browser.

## Status & Kesehatan Server
- Diambil dari server (`GET /system/health-report`) saat halaman dibuka dan tiap 60 detik:
  versi & mode debug, jenis/latensi database, disk bebas, folder storage, penjadwal (kapan terakhir berjalan),
  backup terverifikasi terakhir & jumlahnya, alat IoT online (aktif 10 menit terakhir), akun nonaktif.
- **Login gagal hari ini** kini dihitung sungguhan: setiap login gagal dicatat di log audit
  (`auth.login_failed`, hanya username — kata sandi tidak pernah disimpan).
- Daftar "Kontrol Keamanan" mengikuti Kebijakan Keamanan yang berlaku dan memberi tanda **PERLU DIUBAH**
  bila mode debug aktif atau kunci perangkat IoT (`NEXABSEN_GLOBAL_KEY`) belum diisi.

## Integritas Data
- Pemindaian dilakukan di server atas seluruh database (`POST /system/integrity`).
- Perbaikan otomatis yang aman, dijalankan di server dan dicatat di log audit:
  - sesi sudah ditutup tetapi peserta belum lengkap → peserta yang belum tercatat diberi status izin/Alpa;
  - alat masih terikat ke sesi yang sudah selesai → dilepas;
  - baris peserta ganda → dihapus, satu dipertahankan.
- Temuan lain (presensi ganda, kartu QR/RFID ganda, presensi di luar peserta) ditandai "Perlu Tinjauan Manual".
- Perbaikan bug pemeriksaan "sesi ditutup belum lengkap": peserta tanpa status kelayakan sebelumnya tidak terhitung,
  dan pemeriksaan bisa gagal karena memakai kolom yang tidak ada.

## Disaster Recovery
- SOP ditulis ulang untuk instalasi Windows + XAMPP (perintah & menu yang benar-benar ada), plus SOP baru
  "Alat RFID hilang/rusak/kunci bocor".
- Hasil uji pemulihan dicatat di server (tombol **Catat Berhasil / Catat Gagal** di setiap SOP),
  lengkap dengan tanggal, petugas, dan catatan. Tidak ada lagi tanggal uji fiktif.

## Langkah setelah update

```bash
php artisan optimize:clear
```
Tidak ada migrasi baru. Muat ulang browser (Ctrl+F5).

---

# Update 26 — Pemeriksaan ulang tahap 1–22 dan perbaikan temuan

Pemeriksaan menyeluruh: 161 tes otomatis lulus di SQLite **dan** MariaDB (seluruhnya), instalasi baru dari nol
+ rollback migrasi terakhir berhasil, 45 menu dibuka tanpa galat. Temuan yang langsung diperbaiki:

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Tombol "+ Uji Catatan Offline" di Pusat Sinkronisasi | Membuat presensi palsu (santri acak, "hadir") di antrean yang lalu **terkirim ke server sebagai presensi asli** | Tombol dihapus |
| Simulator Scanner & Simulator RFID saat server offline | Hasil simulasi masuk antrean offline dan ikut tersinkron sebagai presensi asli | Hasil simulasi disimpan terpisah, tidak pernah masuk antrean/daftar presensi asli |
| Dispensasi peserta event (Manajemen Event) | Hanya tampil di layar, hilang ≤ 60 detik, presensi santri tetap Alpa | Disimpan ke server (endpoint baru `POST /student-excusals/bulk`, tanpa duplikat) |
| Tombol tanggal "Hari ini / 7 hari / Bulan ini" di laporan & "Hari ini / Kemarin" di Dashboard Terpadu | Sebelum pukul 07:00 WIB memilih tanggal kemarin | Memakai tanggal lokal |
| Grafik tren 7 hari SDM di Dashboard Terpadu | Hanya data 1 hari yang dimuat, 6 hari lainnya kosong | Data 7 hari dimuat dari server |
| Tombol "Kirim Sinyal Ping Heartbeat" di Device Management | Membuat alat tampak online padahal tidak | Tombol dihapus (status online hanya dari alat sungguhan) |
| Dua berkas backup uji coba ikut masuk repositori & paket update | Berkas data uji di folder backup Anda | Dihapus; folder `storage/app/backups` dikecualikan dari repositori |
| Berkas tampilan lama menumpuk di `public/assets` setiap update | ±60 MB berkas tak terpakai | `jalankan-siuba.bat` menjalankan `php artisan siuba:bersihkan-aset` |
