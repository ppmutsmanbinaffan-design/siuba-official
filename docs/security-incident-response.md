# SIUBA Security Incident Response Plan

## 1. Fase Penanganan Insiden (6 Tahap)
1. **Identifikasi (Identify)**: Deteksi anomali akses, brute force, atau kebocoran kredensial via `audit_logs` dan `SystemHealthService`.
2. **Isolasi (Contain)**: Putuskan koneksi akun/perangkat yang terkompromi secara instan.
3. **Pelestarian Bukti (Preserve Evidence)**: Unduh salinan log sistem, riwayat presensi `attendance_record_histories`, dan `audit_logs`.
4. **Pembersihan (Eradicate)**: Hapus token otentikasi yang disusupi, rotasi secret perangkat, dan perbaiki celah.
5. **Pemulihan (Recover)**: Pulihkan integritas data yang terpengaruh dan aktifkan kembali akun dengan kredensial baru.
6. **Tinjauan & Evaluasi (Review)**: Analisis akar masalah dan perbarui aturan proteksi/kebijakan.

## 2. Skenario Kompromi Kredensial Admin
1. Nonaktifkan akun admin terkait (`users.is_active = false`).
2. Cabut seluruh session aktif di database/Redis (`DB::table('sessions')->where('user_id', $adminId)->delete()`).
3. Reset kata sandi admin dengan kredensial yang kuat.
4. Lakukan audit pada seluruh aksi yang dilakukan akun tersebut selama 48 jam terakhir melalui menu **Audit Trail**.

## 3. Skenario Kebocoran Secret Perangkat IoT (RFID Reader / QR Kiosk)
1. Buka menu **Manajemen Perangkat (IoT)**.
2. Klik tombol **Rotasi Secret** pada perangkat bersangkutan.
3. Secret lama seketika tidak berlaku; perangkat wajib di-flash/dikonfigurasi dengan secret baru.
4. Periksa log presensi perangkat tersebut untuk mendeteksi potensi injeksi kehadiran palsu.
