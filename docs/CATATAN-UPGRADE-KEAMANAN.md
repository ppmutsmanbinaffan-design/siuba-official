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
