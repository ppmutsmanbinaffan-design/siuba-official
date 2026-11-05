# Panduan Pengguna — Administrator SIUBA

## 1. Manajemen Master Data
- **Santri & Identitas**: Kelola data biodata, NIS, NISN, status aktif, penugasan kelas, kamar asrama, serta token QR dan UID RFID.
- **Generator QR Massal**: Gunakan tombol *Generate Missing QR* di menu santri untuk men-generate token unik secara otomatis bagi santri baru.
- **Cetak Kartu Massal**: Navigasi ke *Cetak Kartu & Label QR* untuk mencetak ID Card santri dengan layout kartu resmi pesantren.

## 2. Pengelolaan Jadwal & Generator Sesi
- **Jadwal Akademik**: Atur tahun ajaran, semester, mata pelajaran, guru pengampu, dan jadwal pelajaran mingguan.
- **Kegiatan Rutin**: Konfigurasi jadwal Shalat 5 Waktu, Asrama, Halaqah, dan Piket Kebersihan pada modul *Jadwal Rutin & Override*.
- **Auto Generate Sesi**: Sesi presensi dibuat otomatis oleh sistem berdasarkan jadwal aktif dan kalender waktu shalat.

## 3. Manajemen Keamanan & Perangkat
- **Perangkat RFID**: Daftarkan terminal ESP32, set lokasi, dan lakukan rotasi token rahasia (Device Secret) secara berkala.
- **Hak Akses & Pengguna**: Tentukan peran (Admin, Guru, Wali Kelas, Musyrif, dll.) dengan permission berbasis Spatie RBAC.
- **Backup & Restore**: Lakukan dump snapshot berkala di tab *Pusat Sinkronisasi* atau *Keamanan & Audit*.
