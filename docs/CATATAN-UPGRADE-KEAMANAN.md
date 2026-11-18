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

---

# Update 27 — Tahap 23: Presensi melatih (pelatih & pembina ekskul) dirapikan

## Satu sumber data
- **Presensi SDM & Guru** kini punya tab **Presensi Melatih (Ekskul)** — isinya sama dengan menu **Presensi Pelatih**,
  semuanya dari server.
- Halaman-halaman presensi melatih lama yang tidak tampil di menu dan masih membaca data di browser (dengan jadwal
  latihan contoh yang tertanam di kode: Panahan Senin, Tapak Suci Selasa, dst.) dihapus.
- Laporan Melatih: daftar pelatih kini mencakup semua staf yang punya penugasan ekskul (banyak ustadz/guru juga
  melatih), bukan hanya staf berjenis "pelatih".

## Aturan presensi melatih (server)
| Aturan | Sebelumnya | Sekarang |
|---|---|---|
| Siapa yang boleh dicatat | Siapa saja oleh siapa saja | Pelatih hanya untuk dirinya; petugas ekskul/SDM untuk semua |
| Sesi yang boleh dicatat | Sesi mana pun | Hanya pelatih utama/pengganti sesi itu atau yang ditugaskan di ekskulnya |
| Kartu/QR | Bisa untuk sesi tanggal lain | Hanya sesi hari ini |
| Presensi susulan | Tidak ada (jam tercatat = jam klik) | Petugas mencatat manual → hadir sesuai jadwal, ditandai "susulan" |
| Batas terlambat | Tetap 15 menit | Ikut Pengaturan → Aturan Absensi → Toleransi Terlambat |
| Jurnal latihan | Siapa saja | Pelatih sesi itu atau petugas |
| Pelatih biasa melihat | Semua sesi & semua staf | Hanya sesi/ekskul miliknya |
| Pembuatan sesi | Harus klik tombol | Otomatis tiap 00:20 (penjadwal) dan saat scan pertama hari itu |
| Finalisasi alpa | Manual; bisa menandai alpa latihan yang belum selesai | Otomatis tiap 00:40 untuk kemarin; latihan yang belum selesai tidak ditandai |

Perintah manual: `php artisan trainer:generate --date=YYYY-MM-DD`, `php artisan trainer:finalize --date=YYYY-MM-DD`.

## Tampilan
- Kartu **Latihan Saya** untuk pelatih yang login (tombol Mulai/Selesai Melatih).
- Tombol "Simulasi Tap Cepat" (mencatat presensi asli dengan label RFID) diganti **Catat Manual oleh Petugas**
  per sesi latihan.
- Tombol kelola (buat sesi, finalisasi, inval, penugasan, jadwal) hanya tampil untuk petugas.
- Tombol "Cetak / Export Laporan" yang hanya memunculkan pesan kini benar-benar mengunduh rekap (CSV, bisa dibuka di Excel).

## Langkah setelah update
Tidak ada migrasi baru. Jalankan `jalankan-siuba.bat`, lalu Ctrl+F5. Pastikan penjadwal Windows terpasang
(`pasang-penjadwal-windows.bat`) agar sesi latihan dibuat & difinalisasi otomatis.

---

# Update 28 — Tahap 24: Pusat Sinkronisasi — backup & kesiapan perangkat sungguhan

## Tab "Backup & Pemulihan Database"
- Sebelumnya: riwayat backup contoh (berkas `siuba_backup_20260823_020000.json`, "287 santri") yang dibaca dari browser,
  dan tombol "Uji Validasi Restore" yang hanya menghitung data di layar.
- Sekarang: daftar backup **di server** (sama dengan Maintenance Hub → Pusat Backup), buat & unduh backup, dan tombol
  **Uji Pulih** (ikon perisai) yang membaca seluruh isi berkas backup di server tanpa mengubah database:
  checksum SHA-256, berkas utuh sampai penanda akhir, jumlah baris per tabel, dan kecocokan dengan versi aplikasi.
  Backup yang gagal uji ditandai **Gagal** dan tidak lagi ditawarkan untuk pemulihan.
- Tombol Uji Pulih juga tersedia di Maintenance Hub → Pusat Backup. Hapus & pulihkan tetap hanya di Maintenance Hub.
- Pengguna tanpa izin backup melihat penjelasan, bukan pesan galat.
- Endpoint baru: `POST /maintenance/backups/{id}/verify`.

## Tab "Kesiapan Perangkat & Server" (dulu "Arsitektur Local LAN & PWA")
Dulu berisi daftar centang statis untuk server Linux. Kini diperiksa sungguhan:
- **Perangkat ini:** kamera untuk scan QR (butuh HTTPS/localhost — beserta cara mengatasinya di HP), mode offline,
  penyimpanan antrean, dan selisih jam perangkat dengan server.
- **Server (admin):** penjadwal, backup terakhir, ruang disk, kunci alat RFID, mode debug.
- Panduan singkat server Windows (IP tetap, jalankan-siuba.bat, penjadwal, UPS).

## Jam perangkat & absensi offline
- Selisih jam HP/tablet dengan server sebelumnya tidak pernah diukur (selalu tertulis "0 ms (Sinkron)").
  Kini setiap respons server membawa jam server (`X-Server-Time`) dan aplikasi mengukur selisihnya.
- Saat antrean offline dikirim, server memakai waktu yang sudah dikoreksi — jam HP yang terlambat 20 menit
  tidak lagi membuat santri tercatat tepat waktu padahal terlambat (atau sebaliknya). Waktu di masa depan ditolak
  dan diganti waktu server.

## Langkah setelah update
Tidak ada migrasi baru. Jalankan `jalankan-siuba.bat`, lalu Ctrl+F5.

---

# Update 29 — Tahap 25: Uji Kesiapan Sistem & Go-Live & QA memakai data sungguhan

## Sebelumnya
- **Acceptance Tests** menjalankan ±60 "tes" terhadap mesin perhitungan lama di browser dengan tanggal & data contoh,
  sebagian menulis data uji ke cache browser, dan hasilnya hampir selalu LULUS.
- **Go-Live & QA Master** berisi hasil UAT "LULUS" dengan nama penguji rekaan, tanda tangan pimpinan rekaan
  (lengkap dengan hash palsu), uji beban & uji chaos simulasi, bug contoh, dan SOP yang menyebut berkas/perangkat
  yang tidak ada. Semuanya tersimpan di browser.

## Sekarang
- Menu **Uji Kesiapan Sistem** (dulu Acceptance Tests, kini di kelompok SISTEM): server menjalankan ±27 pemeriksaan
  baca-saja atas data sungguhan, dikelompokkan:
  - *Konfigurasi server*: koneksi database, migrasi tertunda, APP_KEY, mode debug, zona waktu, folder storage, kunci alat RFID.
  - *Keamanan & cadangan*: akun Super Admin, berkas kata sandi awal yang tertinggal, pengguna tanpa peran,
    umur & keutuhan backup, penjadwal, integritas data.
  - *Data master*: identitas lembaga, tahun ajaran aktif, santri (tanpa kelas / tanpa kartu), kelas, SDM, guru tanpa akun.
  - *Operasional*: kegiatan aktif, sesi 7 hari terakhir, sesi lupa ditutup, alat RFID yang tidak terhubung,
    izin santri yang tertahan.
  Setiap butir berstatus Lulus / Perlu perhatian / Gagal lengkap dengan cara memperbaikinya.
- Menu **Go-Live & QA** (semua tersimpan di server bersama nama pencatat & waktu):
  - **Gerbang go-live** dihitung otomatis: uji kesiapan tanpa GAGAL (≤ 7 hari), semua skenario UAT diuji tanpa gagal,
    tidak ada bug BLOCKER/CRITICAL terbuka, dan semua perwakilan menyetujui.
  - **Skenario UAT** (17 skenario per peran) — mulai dari "Belum diuji"; petugas mencatat hasil sungguhan.
  - **Persetujuan** per peran — nama perwakilan diisi sendiri, tanpa nama/tanda tangan bawaan.
  - **Catatan bug** — mulai kosong; catat, ubah status (terbuka → diperbaiki → selesai).
  - **SOP & kode galat** ditulis ulang untuk instalasi Windows + XAMPP, hanya merujuk menu & berkas yang ada.
- Dihapus: uji beban & chaos simulasi, daftar periksa go-live berisi hasil rekaan, dan seluruh layanan pendukungnya.
- Endpoint baru: `GET /golive`, `POST /golive/self-test`, `POST /golive/uat/{id}`, `POST /golive/signoffs`,
  `POST /golive/bugs`, `PATCH /golive/bugs/{id}` (izin Pemeliharaan Sistem / Audit Keamanan).

## Langkah setelah update
Tidak ada migrasi baru. Jalankan `jalankan-siuba.bat`, lalu Ctrl+F5. Buka **Uji Kesiapan Sistem** dan tekan
**Jalankan Uji Kesiapan** — benahi butir yang GAGAL lebih dulu.

---

# Update 30 — Tahap 26: Pembersihan kode lama

Tidak ada fitur baru; aplikasi diperkecil dan dirapikan agar lebih mudah dirawat dan tidak ada lagi jalur
tersembunyi yang menyimpan data hanya di browser.

## Yang dihapus
- **±22.700 baris kode tidak terpakai** (184 berkas berubah), antara lain:
  - 38 halaman/komponen/layanan yang tidak pernah tampil di menu (Daftar Santri lama, Scanner QR lama,
    Absensi Manual lama, Pusat Laporan lama, Dashboard SDM lama, halaman presensi harian SDM lama, dll.).
  - 115 fungsi layanan browser yang tidak dipanggil lagi (mesin presensi lama, generator sesi KBM contoh,
    pengganti guru/pelatih lokal, dll.).
  - ±870 impor yang tidak terpakai.
  - Data contoh `initialData.ts` (2.090 baris santri, sesi, presensi, SDM, jadwal contoh) — tersisa hanya
    kategori kegiatan bawaan dan sidik jari data contoh untuk pembersihan cache lama.
- Server: 12 berkas PHP yang tidak pernah dipanggil (controller web lama, form request lama, komponen Livewire
  tanpa paket Livewire, aksi & layanan lama).
- Lencana versi yang tidak konsisten ("SIUBA v1.1.3 PRODUCTION", "Sprint 4", dll.) dan tab **Roadmap** di
  Presensi SDM yang menampilkan rencana fitur lama.

## Perbaikan yang ditemukan saat pembersihan
- **Presensi & izin SDM saat server offline:** sebelumnya tap kartu SDM, pengajuan/persetujuan izin SDM
  "berhasil" disimpan hanya di browser dan **tidak pernah terkirim ke server**. Kini aplikasi menyatakan dengan
  jelas bahwa data SDM tidak bisa disimpan saat offline dan meminta mencoba lagi setelah tersambung.
  (Presensi santri tetap punya antrean offline yang terkirim otomatis.)

## Hasil
- Berkas tampilan: JS 2,44 MB → 2,34 MB, CSS 235 KB → 211 KB.
- Semua tes otomatis lulus (SQLite & MariaDB), 45 menu terbuka tanpa galat, kontras warna bersih.

## Langkah setelah update
Tidak ada migrasi baru. **Penting:** hapus semua berkas di `FILE-YANG-HARUS-DIHAPUS.txt` (cukup banyak kali ini).
Jalankan `jalankan-siuba.bat`, lalu Ctrl+F5.

---

# Update 31 — Tahap 27: Tahun Ajaran & Semester

Sebelumnya tidak ada menu untuk membuat atau mengganti tahun ajaran; sistem hanya membuatnya diam-diam saat
data KBM pertama disimpan, dan Uji Kesiapan Sistem menyarankan menu yang tidak ada.

## Yang baru
- **Master Akademik → tab Tahun Ajaran** (tab ini terbuka otomatis bila belum ada tahun ajaran aktif):
  - Tambah tahun ajaran (format `2026/2027`); Semester Ganjil (s.d. 31 Des) dan Genap (mulai 1 Jan) dibuat otomatis.
  - **Aktifkan** tahun ajaran dan **Jadikan semester aktif** — hanya satu tahun ajaran dan satu semester yang aktif.
    Saat tahun ajaran diaktifkan, semester yang memuat tanggal hari ini ikut diaktifkan.
  - Ubah tanggal tahun ajaran/semester, tambah semester yang hilang.
  - Hapus hanya untuk tahun ajaran/semester yang **tidak aktif dan belum dipakai** (penugasan, jadwal, agenda
    kalender). Ini penting karena di database penghapusan tahun ajaran ikut menghapus jadwal & penugasannya.
- Validasi: nama dua tahun berurutan, tanggal tidak bertabrakan dengan tahun ajaran lain, semester harus di
  dalam rentang tahun ajarannya, tidak boleh dua Ganjil/Genap di tahun yang sama.
- Setiap perubahan dicatat di Log Audit (`academic.year.*`, `academic.semester.*`).
- Uji Kesiapan Sistem kini menunjuk ke tab Tahun Ajaran.

## API baru (izin Master KBM)
`GET /academic/periods`, `POST /academic/years`, `PATCH /academic/years/{id}`, `POST /academic/years/{id}/activate`,
`DELETE /academic/years/{id}`, `POST /academic/semesters`, `PATCH /academic/semesters/{id}`,
`POST /academic/semesters/{id}/activate`, `DELETE /academic/semesters/{id}`.

## Langkah setelah update
Tidak ada migrasi baru. Jalankan `jalankan-siuba.bat`, lalu Ctrl+F5. Buka **Master Akademik → Tahun Ajaran**,
tambah dan aktifkan tahun ajaran 2026/2027, lalu jalankan ulang Uji Kesiapan Sistem.

---

# Update 32 — Tahap 28: Antrean offline presensi SDM

Sejak tahap 26 aplikasi jujur bahwa tap SDM saat server mati tidak tersimpan. Kini tap itu **disimpan dan
dikirim belakangan**, sama seperti presensi santri.

## Cara kerja
- Saat server tidak terjangkau, tap kartu/QR/NIP di **Presensi SDM → Dashboard & Scanner** disimpan di perangkat
  dengan **jam tap aslinya** (jam perangkat dikoreksi dengan selisih jam server yang diukur aplikasi).
  Pesan kuning "DISIMPAN OFFLINE" menandainya. Tap ganda kartu yang sama dalam 1 menit tidak disimpan dua kali.
- Antrean dikirim **otomatis** saat server kembali (serta tiap 60 detik), atau lewat tombol **Kirim sekarang**
  di panel **Antrean Offline Presensi SDM** (di halaman Presensi SDM dan Pusat Sinkronisasi → Antrean).
  Jumlah antrean SDM ikut tampil di lencana antrean di bagian atas layar.
- Server memproses tap menurut urutan jam tap dan memakai aturan jam kerja yang sama dengan tap biasa
  (terlambat, pulang cepat, hari libur, izin disetujui).
- **Tidak pernah dobel:** setiap tap punya kode unik; kiriman ulang mengembalikan hasil yang sama.
- **Tap offline yang lebih awal** dari jam masuk yang sudah tercatat (misalnya tap pagi di perangkat offline baru
  terkirim sore setelah tap pulang di perangkat lain) dianggap sebagai jam masuk sebenarnya; tap yang tadinya
  dianggap masuk menjadi jam pulang. Catatan presensi diberi keterangan "Tap offline …".
- Ditolak dengan alasan jelas (tidak dicoba ulang): kartu tidak dikenal, jam perangkat lebih maju dari server,
  tap lebih dari 7 hari lalu (`SIUBA_STAFF_OFFLINE_MAX_DAYS`), di luar jam presensi, dll.
- Setiap tap offline tercatat di tabel `staff_offline_scans` (siapa, jam tap, jam perangkat, hasil).

## Perbaikan ikutan
- Mengetik **token QR (STF-…)** atau UID kartu di kolom scanner lalu menekan Enter dulu selalu "tidak ditemukan"
  karena hanya NIP yang dicari. Kini NIP, token QR, UID kartu, dan ID semuanya dikenali.

Belum termasuk: pengajuan/persetujuan izin SDM saat offline (tetap memerlukan server).

## API baru
`POST /staff-attendance/daily/offline-sync` (izin Presensi SDM).

## Langkah setelah update
**Ada migrasi baru** (`staff_offline_scans`) — dijalankan otomatis oleh `jalankan-siuba.bat`. Lalu Ctrl+F5.

---

# Update 33 — Tahap 29: HTTPS di jaringan pesantren (kamera HP untuk scan QR)

Browser HP hanya mengizinkan kamera di alamat aman (HTTPS). Lewat `http://192.168.x.x:8000` kamera diblokir.
Kini tersedia HTTPS lokal tanpa internet dan tanpa mengubah pengaturan Chrome di tiap HP.

## Cara kerja
- `pasang-https-lan.bat` (sekali, di komputer server; meminta izin administrator):
  1. membuat **sertifikat induk SIUBA** (CA lokal, berlaku 10 tahun) — dibuat sekali, dipakai ulang;
  2. membuat **sertifikat server** untuk semua IP komputer ini + `localhost` + nama komputer (825 hari);
  3. menulis `C:\xampp\apache\conf\extra\siuba-https.conf`: Apache XAMPP mendengarkan **port 8443 (HTTPS)**
     dan meneruskan ke aplikasi di port 8000; httpd.conf dicadangkan dulu (`httpd.conf.sebelum-siuba-https`)
     dan **dikembalikan otomatis bila konfigurasi ditolak** (`httpd -t`);
  4. membuka port 8443 di Firewall Windows (jaringan Private/Domain);
  5. menyalakan ulang Apache dan menampilkan alamat `https://IP:8443`.
- Di tiap HP, **sekali saja**: buka `http://IP-SERVER:8000/sertifikat`, unduh dan pasang sertifikat SIUBA
  (petunjuk Android, iPhone, dan Windows ada di halaman itu, beserta sidik jari SHA-256 untuk dicocokkan).
  Setelah itu buka SIUBA lewat `https://IP-SERVER:8443` — kamera scan QR dan mode offline aplikasi
  (service worker) aktif.
- `jalankan-siuba.bat` menyalakan Apache otomatis bila HTTPS sudah dipasang dan menampilkan alamat HTTPS-nya.
- Bila IP komputer server berubah, jalankan `pasang-https-lan.bat` lagi — HP **tidak** perlu memasang ulang.
- Untuk melepas: `hapus-https-lan.bat` (menghapus konfigurasi Apache & aturan firewall).
- **Pusat Sinkronisasi → Kesiapan Perangkat** kini memeriksa apakah HTTPS sudah siap dan dipercaya perangkat itu,
  dan memberi langkah yang sesuai.

## Keamanan
- Kunci privat CA dan server tersimpan di `storage\app\https\` (tidak ikut git, tidak bisa diunduh);
  halaman `/sertifikat` hanya menyajikan sertifikat publik.
- Laravel hanya mempercayai header `X-Forwarded-*` dari komputer itu sendiri (Apache lokal), sehingga
  perangkat lain tidak bisa berpura-pura memakai HTTPS.
- Siapa pun yang memegang `siuba-ca.key` bisa membuat sertifikat palsu yang dipercaya HP petugas — jangan
  salin folder `storage\app\https` ke komputer lain.

## Bila Apache gagal menyala
Biasanya port 80/443 dipakai program lain (Skype, IIS, VMware). Lihat `C:\xampp\apache\logs\error.log`,
atau nyalakan Apache dari XAMPP Control Panel untuk melihat pesannya.

---

# Update 34 — Akun login milik SDM sendiri, akun contoh tanpa nama orang

## Masalah
- Pilihan **Tautkan Akun Pengguna** di formulir SDM menampilkan semua akun, termasuk 10 **akun contoh bawaan**
  bernama orang (sebagian nama tokoh nyata) yang tidak ada hubungannya dengan pesantren.
- Tombol Tambah/Import/Edit/Nonaktifkan di Master SDM selalu tersembunyi (pemeriksaan izin keliru) — sudah diperbaiki.
- Pesan galat per kolom di formulir SDM (misalnya NIP ganda) tidak pernah tampil di bawah kolomnya.

## Perubahan
- Bagian **Akun Login SIUBA** di formulir SDM kini punya tiga pilihan:
  - **Tanpa akun login** — hanya data pegawai & kartu presensi;
  - **Buat akun untuk SDM ini** — akun atas nama SDM itu sendiri (nama & email dari data SDM), username bawaan
    = Nomor SDM/NIP, Anda memilih **peran** (Guru, Musyrif, Pelatih, Petugas Masjid, Operator, dll.).
    Password awal acak ditampilkan **sekali** setelah disimpan, dengan tombol Salin.
    Perlu izin Manajemen Pengguna (`users.create`); peran Admin/Pimpinan/Kepala Sekolah hanya bisa diberikan Super Admin;
  - **Tautkan akun yang ada** — hanya akun yang **belum dipakai SDM lain**, ditampilkan sebagai `username — Peran`;
    akun contoh dikelompokkan terpisah. Akun Super Admin tidak bisa ditautkan.
- **Akun contoh bawaan** di database diganti namanya menjadi nama peran (`Akun Contoh – Guru`, dst.) dan email
  berisi nama orang dikosongkan; username, password, dan peran tidak diubah. Akun yang namanya sudah Anda ganti dibiarkan.
- Instalasi baru hanya membuat akun **superadmin** (tidak lagi 10 akun contoh dengan password yang sama).

## Saran
Akun contoh memakai password awal yang sama. Bila tidak dipakai, nonaktifkan atau hapus di **Manajemen Pengguna**.

## Langkah setelah update
**Ada migrasi baru** — jalankan `jalankan-siuba.bat`, lalu Ctrl+F5.

## Tambahan: pembersihan akun contoh
`jalankan-siuba.bat` kini menjalankan `php artisan siuba:hapus-akun-contoh` **sesudah backup otomatis**:
- akun contoh yang **tidak pernah dipakai** (tidak pernah login, tanpa sesi login, tidak dirujuk tabel mana pun —
  diperiksa ke semua kolom yang berelasi ke akun pengguna) **dihapus**;
- akun contoh yang **pernah dipakai** hanya **dinonaktifkan** dan sesi loginnya dicabut, agar riwayat data utuh;
- akun yang namanya sudah Anda ubah, atau yang sudah nonaktif, tidak disentuh. Aman diulang.
- Hasilnya tercatat di Log Audit (`users.example_accounts_cleaned`). Uji tanpa mengubah: `--dry-run`.

---

# Update 35 — Sesi presensi dibuat otomatis

Sebelumnya sesi presensi rutin (shalat, asrama, dll.) dan sesi KBM **hanya** terbentuk bila seseorang menekan
tombol Generate Sesi setiap hari; penjadwal hanya membuat sesi latihan ekskul.
- Perintah baru `php artisan attendance:generate-sessions --days=N` membuat sesi rutin & KBM dari jadwal.
  Aman diulang (sesi yang sudah ada dilewati); KBM dilewati pada hari libur kalender akademik dan bila belum ada
  tahun ajaran aktif.
- Penjadwal menjalankannya **tiap jam** (menit ke-3) untuk hari ini & besok, sehingga tetap jalan walau komputer
  server baru dinyalakan siang hari. `jalankan-siuba.bat` juga menjalankannya sekali saat start.
- Penjadwal hanya berjalan bila `pasang-penjadwal-windows.bat` sudah dipasang (sekali, Run as administrator).

---

# Update 36 — Program alat RFID (ESP32 / NodeMCU + RC522)

- Folder baru `firmware/siuba-rfid/`: program alat lengkap + `PANDUAN.md` (kabel, pemasangan, pengaturan, arti bunyi).
- `bin/siuba-rfid-esp32.bin` dan `bin/siuba-rfid-nodemcu.bin` siap dipasang dari browser (esptool-js) tanpa Arduino IDE;
  diuji kompilasi dengan core ESP32 2.0.17 dan ESP8266 3.1.2.
- Pengaturan Wi-Fi, alamat server, kode alat, dan token diisi lewat HP (portal Wi-Fi "SIUBA-RFID-xxxx").
- Antrean offline di alat (hingga 800 tap) dengan jam tap asli; jam alat disetel dari header `X-Server-Time` server.
- Ping tiap 60 detik ke `/api/v1/iot/ping` (status "terakhir terlihat" di Device Management).
- Device Management: "Header Config Generator" diganti **Isian Pengaturan Alat RFID** sesuai program baru.
- Penting: `NEXABSEN_GLOBAL_KEY` di `.env` wajib terisi walaupun alat memakai token sendiri.

---

# Update 37 — Mesin jadi Nexabsen V.4

SIUBA sudah memakai format Nexabsen V.4 (`/api/tap.php`, header `X-GLOBAL-KEY`, `{device_id, uid, tapped_at}`,
balasan `message` + `data.name`, `action: RESET_CONFIG`). Penyesuaian:
- Di alamat `/api/tap.php`, penolakan yang sudah final (tidak ada sesi, bukan peserta, santri/SDM nonaktif,
  di luar waktu) kini dibalas **200 + success=false** (dulu 403/409/422). Dokumen pabrik hanya mengenal
  200/401/404, sehingga kode lain berisiko dianggap "gagal kirim" dan tap dikirim ulang terus dari antrean mesin.
  401 (kunci salah), 404 (kartu ditolak), alat belum aktif, dan mode perawatan tidak berubah.
  Alamat `/api/v1/iot/rfid-tap` (program rakitan) tetap memakai kode semantik.
- `tapped_at` tanpa zona waktu ("2026-07-28 07:15:30") dibaca sebagai WIB.

Pengisian portal NEXABSEN-CONFIG:
- URL Endpoint Tap Absen: `http://IP-SERVER:8000/api/tap.php`
- Global API Key: sama persis dengan `NEXABSEN_GLOBAL_KEY` di `.env` (ganti bawaan pabrik `5daj3fk73`)
- ID Alat: biarkan bawaan (NX-…) atau beri nama, mis. `GERBANG-PUTRA`
- UID Kartu Master Admin: UID kartu teknisi Anda; samakan dengan `NEXABSEN_MASTER_ADMIN_UID` di `.env` (opsional)
Mesin baru tampil di Device Management sebagai **nonaktif** setelah tap pertama → klik Aktifkan.

---

# Update 38 — Mesin RFID Absensindo

Mesin Absensindo (ESP32 Wemos D1 R32 + RC522) memakai protokol sendiri: aktivasi dengan Serial Number + MAC
menghasilkan token Bearer, lalu cek/heartbeat/tap ke `{Server URL}/api/device/...`, balasan
`{success, code, message, data.reason}`. SIUBA kini melayani protokol ini (`AbsensindoDeviceApiController`),
memakai aturan tap SIUBA yang sama (santri & SDM, jam tap offline, kartu baru → Registrasi Kartu RFID).

Sumber: dokumen panduan pabrik + bagian aplikasi Absensindo yang tidak diacak (controller, validasi, middleware,
migrasi). Daftar rute pabrik diacak dan tidak dibuka; karena itu fungsi dikenali dari isi permintaan, dan jalur yang
dipakai mesin dicatat di log perangkat saat aktivasi.

Pemasangan:
1. Device Management → Tambah Perangkat, **Kode Perangkat = Serial Number** mesin (tampil di LCD). Bila lupa,
   mesin yang meminta aktivasi otomatis tercatat NONAKTIF → klik Aktifkan → restart mesin.
2. Setup mesin (tahan tombol ±5 detik): Server URL `http://IP-SERVER:8000` **tanpa /api**, zona WIB, Wi-Fi 2,4 GHz
   yang sama dengan server dan **tersambung internet** (mesin menyetel jam dari internet).
3. Mesin mengaktifkan diri; Device Management menampilkan SN, MAC, versi firmware.
   Ganti unit / MAC MISMATCH / TOKEN INVALID → **Reset Pasangan Mesin**, lalu restart mesin.

Disesuaikan dengan dokumentasi resmi absensindo.id/api-docs: jalur `/api/device/activate|cek|attendance|heartbeat`,
`time` berformat HH:MM, `student_name` maks. 20 karakter, heartbeat `reason: ok`, mesin nonaktif → 403 `device_inactive`.
Bila token tidak dikenal (`invalid_token`), mesin menghapus tokennya dan aktivasi ulang sendiri.

Catatan: dokumen pabrik meminta HTTPS. Bila mesin menolak `http://`, gunakan HTTPS LAN (pasang-https-lan.bat,
`https://IP-SERVER:8443`).

---

# Update 39 — Satu kartu, nomor sama di semua mesin

Mesin Absensindo menulis UID kartu sebagai angka **desimal dengan urutan byte terbalik**; Nexabsen menulis
**heksadesimal**. Contoh kartu yang sama: Nexabsen `AA38A284`, Absensindo `2225223850`
(= 0x84A238AA → dibalik per byte = AA38A284).
- `Student::normalizeRfidUid` kini mengubah UID desimal 9–17 digit (selain 14) ke bentuk baku heksadesimal.
  Berlaku di semua tempat: tap kedua mesin, Registrasi Kartu RFID, formulir & impor santri/SDM.
  UID heksadesimal 4 byte (8 karakter) dan 7 byte (14 karakter) tidak berubah.
- Migrasi mengubah UID desimal yang sudah tersimpan; bila bentuk bakunya sudah dipakai kartu lain, dilewati
  dan dicatat di `storage/logs/laravel.log`.
