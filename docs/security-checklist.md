# SIUBA Security Checklist & Hardening Guide

## 1. Authentication & Session Security
- [x] **Deny by Default & Least Privilege**: Seluruh routing dan action Livewire/API mewajibkan autentikasi dan otorisasi eksplisit via Policy/Gate.
- [x] **Inactive Account Enforcement**: User dengan `is_active = false` ditolak saat login dan session aktif dibatalkan seketika.
- [x] **Password Hashing**: Menggunakan algoritma hashing standar Laravel (Bcrypt/Argon2id) dengan work factor memadai. Tidak ada MD5/SHA1/Plaintext.
- [x] **Default Account Audit**: Seeder produksi tidak memuat password default lemah (seperti `admin123`, `12345678`). Password di-generate secara acak atau diwajibkan reset saat first login.
- [x] **Session Security**: Session regeneration pada login/logout, cookie bertanda `HttpOnly`, `SameSite=Lax/Strict`, serta `Secure` flag aktif pada HTTPS.
- [x] **CSRF Protection**: Token CSRF wajib pada seluruh permintaan form dan AJAX web.

## 2. Authorization & Scope Isolation
- [x] **Role Scope Isolation**:
  - **Guru/Pengajar**: Hanya dapat mencatat presensi pada jadwal KBM yang diampu.
  - **Wali Kelas**: Hanya dapat melihat dan mengoreksi presensi santri di rombel/kelas perwaliannya.
  - **Musyrif**: Terbatas pada kamar asrama dan halaqah yang dibina.
  - **Pembina Ekskul**: Terbatas pada anggota ekskul yang terdaftar aktif.
  - **Petugas Masjid / Security**: Presensi shalat berjamaah dan gerbang RFID/QR.
- [x] **IDOR (Insecure Direct Object Reference) Protection**: Seluruh binding model di-resolve dengan pemeriksaan hak akses berbasis user role dan context ownership.
- [x] **Mass Assignment Protection**: Atribut sensitif seperti `is_admin`, `role`, `recorded_by`, `approved_by`, `status` diproteksi dari `$fillable` tak terkontrol.

## 3. IoT & Edge Device Security
- [x] **Device Secret Onetime Display**: Secret perangkat RFID reader & QR Kiosk hanya ditampilkan sekali saat pembuatan, disimpan dalam bentuk hash di database.
- [x] **Device Secret Rotation**: Dukungan rotasi secret kapan saja, menonaktifkan secret lama secara instan.
- [x] **Disabled Device Enforcement**: Perangkat non-aktif (`is_active = false`) langsung ditolak server dengan HTTP 403.
- [x] **QR Token Security**: Token QR santri berupa string acak opaque (UUID/nanoid) tanpa memuat NIS/NISN atau data pribadi dalam plaintext.
- [x] **Per-Device Rate Limiting**: Throttling diterapkan per identity perangkat (`attendance_device_id`), bukan global IP.

## 4. PWA & Offline Security
- [x] **Sensitive Field Exclusion**: Cache IndexedDB pada browser klien tidak menyimpan kata sandi, NIK/NISN, atau data kontak sensitif.
- [x] **User Ownership Binding**: Antrean offline presensi terikat pada `user_id` dan `installation_id`.
- [x] **Revoked User Rejection**: Apabila hak akses pengguna dicabut saat dalam keadaan offline, sinkronisasi presensi ditolak saat rekoneksi online.
- [x] **No Cache for Success API**: Service Worker tidak meng-cache respons API presensi untuk menghindari false success lokal.

## 5. Security Headers & Network Security
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: SAMEORIGIN`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- [x] `Content-Security-Policy`: Diatur ketat namun mendukung kamera QR scanner dan Web Worker.
