/**
 * SOP operasional SIUBA untuk instalasi Windows + XAMPP. Setiap langkah merujuk menu / berkas yang benar-benar ada.
 * (Versi lama menyebut berkas, perangkat, dan tombol yang tidak ada di aplikasi.)
 */
export interface SopStep { title: string; instruction: string; check: string }
export interface SopDoc { id: string; title: string; audience: string; when: string; steps: SopStep[]; fallback: string }

export const SOPS: SopDoc[] = [
  {
    id: 'SOP-01',
    title: 'Pemeriksaan Pagi Admin',
    audience: 'Admin / operator server',
    when: 'Setiap pagi sebelum Subuh / KBM',
    steps: [
      { title: 'Nyalakan server', instruction: 'Pastikan komputer server menyala dan jendela jalankan-siuba.bat terbuka.', check: 'Aplikasi bisa dibuka dari HP petugas.' },
      { title: 'Cek kesehatan server', instruction: 'Buka Keamanan & Audit → Status & Kesehatan.', check: 'Database, penjadwal, dan backup berstatus SEHAT.' },
      { title: 'Cek backup semalam', instruction: 'Buka Maintenance Hub → Pusat Backup; backup terakhir harus dari pukul 01:30 hari ini. Uji pulih sesekali (ikon perisai).', check: 'Backup terverifikasi ≤ 1 hari.' },
      { title: 'Cek alat RFID', instruction: 'Buka Device Management.', check: 'Alat yang dipakai hari ini berstatus online.' },
    ],
    fallback: 'Bila penjadwal mati: jalankan pasang-penjadwal-windows.bat. Bila backup tidak ada: buat backup manual di Maintenance Hub.',
  },
  {
    id: 'SOP-02',
    title: 'Petugas Presensi Santri',
    audience: 'Petugas absensi, guru piket, musyrif',
    when: 'Setiap sesi kegiatan',
    steps: [
      { title: 'Pilih sesi', instruction: 'Buka Monitoring / Scanner, pilih sesi kegiatan yang sedang berlangsung.', check: 'Nama kegiatan & jam sesuai.' },
      { title: 'Catat kehadiran', instruction: 'Scan kartu QR atau tap RFID; santri tanpa kartu dicatat lewat Absensi Manual.', check: 'Setiap scan menampilkan nama santri & status.' },
      { title: 'Izin & sakit', instruction: 'Santri berizin dicatat di Izin Santri (surat izin) — bukan ditandai hadir.', check: 'Izin tampil di daftar peserta.' },
      { title: 'Tutup sesi', instruction: 'Tutup sesi setelah selesai; yang belum tercatat otomatis Alpa (atau sesuai izin). Bila lupa, Auto-Close menutupnya.', check: 'Status sesi "Ditutup".' },
    ],
    fallback: 'Bila server tidak terjangkau, tetap scan: data masuk antrean offline di HP dan terkirim otomatis saat tersambung (cek di Pusat Sinkronisasi).',
  },
  {
    id: 'SOP-03',
    title: 'Listrik Padam / Jaringan Putus',
    audience: 'Petugas & admin',
    when: 'Saat gangguan',
    steps: [
      { title: 'Tetap catat di HP', instruction: 'HP/tablet yang sudah pernah login tetap bisa mencatat presensi; aplikasi menampilkan status offline.', check: 'Pesan "tersimpan di antrean" muncul.' },
      { title: 'Jangan logout', instruction: 'Jangan keluar akun dan jangan hapus data browser selama offline.', check: 'Jumlah antrean di Pusat Sinkronisasi bertambah.' },
      { title: 'Saat pulih', instruction: 'Nyalakan server (jalankan-siuba.bat). Buka Pusat Sinkronisasi di setiap HP petugas.', check: 'Antrean = 0, konflik ditinjau di tab Resolusi Konflik.' },
    ],
    fallback: 'Bila HP juga mati, catat di kertas lalu masukkan lewat Absensi Manual (susulan) setelah pulih.',
  },
  {
    id: 'SOP-04',
    title: 'Update Aplikasi & Pemulihan',
    audience: 'Admin / Super Admin',
    when: 'Saat memasang update atau ada kerusakan',
    steps: [
      { title: 'Backup dulu', instruction: 'Sebelum update: Maintenance Hub → Pusat Backup → Buat Backup, lalu unduh ke flashdisk.', check: 'Backup baru terverifikasi & tersalin di luar server.' },
      { title: 'Pasang update', instruction: 'Ekstrak ZIP update ke folder aplikasi, hapus berkas di FILE-YANG-HARUS-DIHAPUS.txt, jalankan jalankan-siuba.bat.', check: 'Aplikasi terbuka, Ctrl+F5 di browser.' },
      { title: 'Uji kesiapan', instruction: 'Buka Go-Live & QA → Uji Kesiapan Sistem → Jalankan.', check: 'Tidak ada pemeriksaan GAGAL.' },
      { title: 'Bila rusak', instruction: 'Pulihkan backup sebelum update (khusus Super Admin, Maintenance Hub). Presensi setelah backup itu perlu dimasukkan ulang.', check: 'Data kembali seperti sebelum update.' },
    ],
    fallback: 'Simpan salinan folder aplikasi lama sebelum menimpa, agar bisa kembali ke versi sebelumnya.',
  },
];

export const ERROR_CODES = [
  { code: 'ALREADY_RECORDED', meaning: 'Santri sudah tercatat di sesi ini.', action: 'Abaikan — duplikasi ditolak otomatis.' },
  { code: 'DUPLICATE_TAP', meaning: 'Kartu yang sama di-tap ulang dalam beberapa detik.', action: 'Tunggu sebentar; atur jeda di Pengaturan → Aturan Absensi.' },
  { code: 'STUDENT_NOT_PARTICIPANT', meaning: 'Santri bukan peserta sesi ini.', action: 'Arahkan ke sesi yang benar atau periksa aturan peserta kegiatan.' },
  { code: 'SESSION_NOT_OPEN / SESSION_CLOSED', meaning: 'Sesi belum dibuka atau sudah ditutup.', action: 'Buka sesi, atau lakukan koreksi resmi dengan alasan.' },
  { code: 'RFID_NOT_REGISTERED / CARD_NOT_REGISTERED', meaning: 'UID kartu belum terdaftar.', action: 'Pasangkan kartu di Master Santri / Master SDM.' },
  { code: 'NO_ACTIVE_SESSION', meaning: 'Tidak ada sesi aktif untuk alat ini.', action: 'Pastikan sesi dibuka / jadwal rutin aktif.' },
  { code: 'DEVICE_DISABLED / DEVICE_MAINTENANCE', meaning: 'Alat dinonaktifkan atau sedang perawatan.', action: 'Aktifkan di Device Management.' },
  { code: 'NOT_WORKING_DAY', meaning: 'Hari libur / bukan hari kerja SDM.', action: 'Periksa Jadwal Kerja & Kalender Akademik.' },
];
