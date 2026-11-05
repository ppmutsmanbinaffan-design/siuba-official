import { UATTestCase, UATSignOffItem, BugBacklogItem, User } from '../types';

const STORAGE_KEY_UAT_CASES = 'siuba_uat_test_cases';
const STORAGE_KEY_UAT_SIGNOFFS = 'siuba_uat_signoffs';
const STORAGE_KEY_BUG_BACKLOG = 'siuba_bug_backlog';

export const INITIAL_UAT_CASES: UATTestCase[] = [
  // 1. ADMIN
  {
    id: 'UAT-ADM-01',
    module: 'Master Data & Akses',
    role: 'Admin',
    scenario: 'Pendaftaran Santri Baru, Penempatan Kelas/Kamar, dan Generate QR/RFID',
    preconditions: 'Login sebagai Administrator; Master Kelas & Kamar telah tersedia.',
    steps: [
      '1. Buka Master Santri > Tambah Santri Baru.',
      '2. Isi NISN, Nama, Kelas VII A, Kamar Al-Falah 1.',
      '3. Generate QR Token dan Pasangkan Kartu RFID UID.',
      '4. Verifikasi data tersimpan dan QR dapat dicetak.'
    ],
    expected_result: 'Santri terdaftar aktif, QR token unik ter-generate, RFID terikat, dan riwayat terdata di Audit Log.',
    actual_result: 'Santri baru berhasil dibuat dengan QR unik & UID terpasang. Snapshot siap digunakan.',
    status: 'PASS',
    tester_name: 'Ust. Ahmad Fauzi (Admin IT)',
    tested_at: '2026-08-20T08:30:00Z',
    notes: 'Alur pendaftaran dan pencetakan kartu santri lancar dan responsif.'
  },
  {
    id: 'UAT-ADM-02',
    module: 'Kegiatan & Sesi',
    role: 'Admin',
    scenario: 'Pembuatan Kegiatan Wajib, Rule Peserta Otomatis, dan Generate Sesi',
    preconditions: 'Master santri dan jadwal kegiatan telah dikonfigurasi.',
    steps: [
      '1. Buat Kegiatan "Kajian Kitab Kuning Malam" (Target: Santri Tingkat Wustha).',
      '2. Klik "Generate Sesi Terjadwal".',
      '3. Periksa daftar peserta terdaftar (Participant Snapshot).',
      '4. Buka sesi absensi untuk pengujian.'
    ],
    expected_result: 'Sesi terbentuk dengan kode unik dan seluruh santri yang eligible tersalin ke snapshot peserta.',
    actual_result: 'Sesi terbentuk lengkap dengan snapshot 120 santri eligible. Tidak ada missing participant.',
    status: 'PASS',
    tester_name: 'Ust. Ahmad Fauzi (Admin IT)',
    tested_at: '2026-08-20T09:15:00Z'
  },

  // 2. GURU KBM
  {
    id: 'UAT-GUR-01',
    module: 'KBM Akademik',
    role: 'Guru',
    scenario: 'Alur KBM: Buka Jadwal Hari Ini, Presensi Manual Cepat, Ubah Sakit/Izin, Tutup Sesi',
    preconditions: 'Login sebagai Guru Pengampu; Jam KBM aktif.',
    steps: [
      '1. Buka Dashboard Guru > Pilih Mapel Fiqih Kelas VII A.',
      '2. Buka Sesi KBM.',
      '3. Gunakan fitur "Hadirkan Semua" (26 santri).',
      '4. Ubah 1 santri menjadi Sakit dan 1 santri Izin dengan alasan.',
      '5. Tutup dan Finalisasi Sesi KBM.'
    ],
    expected_result: 'Presensi tercatat 24 Hadir, 1 Sakit, 1 Izin. Rekap KBM dan jurnal mengajar terupdate seketika.',
    actual_result: 'Proses absensi 1 kelas selesai dalam 15 detik. Jurnal KBM langsung ter-generate.',
    status: 'PASS',
    tester_name: 'Ust. Syarif Hidayat, M.Pd (Guru Fiqih)',
    tested_at: '2026-08-20T10:00:00Z',
    notes: 'Fitur Hadirkan Semua sangat menghemat waktu mengajar.'
  },

  // 3. PETUGAS MASJID
  {
    id: 'UAT-MSJ-01',
    module: 'Ibadah & Shalat',
    role: 'Petugas',
    scenario: 'Presensi Shalat Berjamaah menggunakan Scanner QR Kamera & Gerbang RFID Kios',
    preconditions: 'Sesi Shalat Ashar aktif; Kamera HP/Tablet dan Kios RFID ESP32 terhubung.',
    steps: [
      '1. Buka Sesi Shalat Ashar di Live Scanner QR & Kios RFID.',
      '2. Santri tap kartu RFID pada terminal ESP32 (LED Hijau + Beep).',
      '3. Santri lain scan kartu QR di kamera tablet.',
      '4. Coba tap kartu santri yang sama (Verifikasi cegah duplikasi).',
      '5. Tutup sesi dan biarkan sistem memfinalisasi santri yang tidak hadir menjadi Auto-Alpha.'
    ],
    expected_result: 'Suara feedback aktif, duplicate ditolak dengan notifikasi "Sudah Tercatat", santri tidak hadir otomatis Alpha.',
    actual_result: 'Absensi 200 santri berlangsung cepat tanpa antrean. Duplikasi 100% dicegah.',
    status: 'PASS',
    tester_name: 'Ust. M. Ridwan (Petugas Ibadah)',
    tested_at: '2026-08-20T15:45:00Z',
    notes: 'Buzzer dan LED ESP32 sangat membantu mengarahkan santri.'
  },

  // 4. MUSYRIF ASRAMA
  {
    id: 'UAT-MSY-01',
    module: 'Asrama & Kebersihan',
    role: 'Musyrif',
    scenario: 'Pemeriksaan Kamar Malam & Rekap Kedisiplinan Asrama',
    preconditions: 'Login sebagai Musyrif Gedung Al-Falah; Jam malam tiba.',
    steps: [
      '1. Buka Monitoring Asrama > Gedung Al-Falah.',
      '2. Lakukan presensi kamar per kamar (Kamar 1 s.d. 8).',
      '3. Catat santri yang izin pulang ke wali santri.',
      '4. Periksa Rekap Ketidakhadiran di Asrama.'
    ],
    expected_result: 'Santri dengan izin resmi tidak dianggap Alpha; status kamar hijau/merah terupdate real-time.',
    actual_result: 'Dispensasi izin terintegrasi otomatis dengan sistem perizinan santri.',
    status: 'PASS',
    tester_name: 'Ust. Nurul Huda (Musyrif Gedung Al-Falah)',
    tested_at: '2026-08-20T21:30:00Z'
  },

  // 5. PIMPINAN PESANTREN
  {
    id: 'UAT-PMP-01',
    module: 'Eksekutif & Analytics',
    role: 'Pimpinan',
    scenario: 'Pemantauan Indeks Kedisiplinan Pesantren, Tren Kehadiran & Laporan Multi-Format',
    preconditions: 'Login sebagai Mudir / Pimpinan Pesantren.',
    steps: [
      '1. Buka Dashboard Eksekutif.',
      '2. Analisis matriks persentase kehadiran santri per asrama & per kelas.',
      '3. Buka Pusat Laporan > Filter rentang 1 bulan terakhir.',
      '4. Export Laporan ke format Excel (.xlsx) dan PDF Resmi.'
    ],
    expected_result: 'Angka kehadiran di dashboard sinkron 100% dengan database dan file ekspor.',
    actual_result: 'Dashboard interaktif dan hasil export Excel/PDF sangat rapi sesuai format standar yayasan.',
    status: 'PASS',
    tester_name: 'KH. Abdullah Munir (Mudir Pesantren)',
    tested_at: '2026-08-21T09:00:00Z',
    notes: 'Sangat memudahkan monitoring pimpinan tanpa perlu minta rekap manual ke tiap bagian.'
  },

  // 6. PEMBINA EKSKUL
  {
    id: 'UAT-EKS-01',
    module: 'Ekskul & Event',
    role: 'Pembina',
    scenario: 'Presensi Kegiatan Pramuka & Ekstrakurikuler Khusus',
    preconditions: 'Login sebagai Pembina Pramuka; Anggota ekskul terdaftar.',
    steps: [
      '1. Buka Sesi Ekstrakurikuler Pramuka.',
      '2. Presensi anggota dengan pemindaian kartu QR santri.',
      '3. Catat walk-in santri tamu yang hadir dispensasi.',
      '4. Tutup sesi dan lihat rekap kehadiran per semester.'
    ],
    expected_result: 'Peserta dinamis tercatat akurat dan riwayat partisipasi tersimpan di profil santri.',
    actual_result: 'Presensi ekskul berjalan lancar dan rekap semester langsung terisi.',
    status: 'PASS',
    tester_name: 'Ust. Danang Prabowo (Pembina Ekskul)',
    tested_at: '2026-08-21T16:00:00Z'
  },

  // 7. OFFLINE PWA FIELD TEST
  {
    id: 'UAT-OFF-01',
    module: 'PWA & Offline-First',
    role: 'Petugas',
    scenario: 'Operasional Lapangan saat Mati Lampu / Wi-Fi Terputus (Offline Queue & Sync)',
    preconditions: 'PWA terinstal di HP/Tablet; Sesi Shalat Ashar disiapkan.',
    steps: [
      '1. Matikan koneksi Wi-Fi dan Data Seluler pada HP/Tablet operator.',
      '2. Buka PWA (Terbuka instan via Service Worker Cache).',
      '3. Lakukan presensi 25 santri (Badge "Offline: 25 Tersimpan di Perangkat" muncul).',
      '4. Nyalakan kembali koneksi Wi-Fi.',
      '5. Klik "Sinkronkan Sekarang" di Pusat Sinkronisasi PWA.'
    ],
    expected_result: 'Semua 25 mutasi ter-commit ke server tanpa duplikasi record dan status menjadi "Sudah Terverifikasi Server".',
    actual_result: '25 mutasi offline ter-sync dalam 1.1 detik. Zero data loss; data di server dan lokal 100% konsisten.',
    status: 'PASS',
    tester_name: 'Ust. Salman Al-Farisi (Operator Lapangan)',
    tested_at: '2026-08-21T17:30:00Z',
    notes: 'Kemampuan offline sangat krusial saat hujan lebat atau pemadaman listrik di pesantren.'
  },

  // 8. STAFF ATTENDANCE: ADMIN SDM (SIUBA v1.1)
  {
    id: 'UAT-SDM-ADM-01',
    module: 'Master SDM & Jadwal Kerja',
    role: 'Admin',
    scenario: 'Manajemen Data Pegawai, Regenerasi QR Token, Pairing RFID UID & Penetapan Jadwal Shift',
    preconditions: 'Login sebagai Admin SDM; Master jadwal kerja default dan khusus telah siap.',
    steps: [
      '1. Buka Master SDM > Daftarkan Pegawai baru (Ustadz Hendra).',
      '2. Generate QR Token unik dan pasangkan kartu RFID UID.',
      '3. Tautkan jadwal kerja Shift Khusus (07:00 - 15:00).',
      '4. Verifikasi keunikan UID dan integritas relasi di database.'
    ],
    expected_result: 'Pegawai aktif terdaftar, token QR dan RFID terikat unik tanpa duplikasi, jadwal shift terpetakan.',
    actual_result: 'Pegawai baru aktif, QR & RFID UID terpasang unik. Resolusi jadwal kerja bekerja presisi.',
    status: 'PASS',
    tester_name: 'Ust. Ahmad Fauzi (Admin SDM & IT)',
    tested_at: '2026-08-25T08:00:00Z',
    notes: 'Pencegahan duplikasi NIP/RFID/QR 100% efektif.'
  },
  {
    id: 'UAT-SDM-ADM-02',
    module: 'Presensi Harian & Koreksi',
    role: 'Admin',
    scenario: 'Monitoring Presensi Harian, Identifikasi Belum Check-Out & Koreksi Presensi dengan Audit Trail',
    preconditions: 'Sesi kehadiran harian berjalan; Terdapat pegawai yang belum check-out.',
    steps: [
      '1. Buka Dashboard SDM Terpadu > Tab Kehadiran Harian.',
      '2. Identifikasi worklist "Belum Check-Out".',
      '3. Lakukan check-out manual untuk pegawai yang lembur/lupa tap.',
      '4. Lakukan koreksi jam kehadiran dengan mencantumkan alasan wajib.'
    ],
    expected_result: 'Status jam check-out terupdate seketika, alasan koreksi tercatat lengkap di riwayat audit trail.',
    actual_result: 'Check-out manual dan koreksi berhasil disimpan bersama audit trail immutable.',
    status: 'PASS',
    tester_name: 'Ust. Ahmad Fauzi (Admin SDM & IT)',
    tested_at: '2026-08-25T08:30:00Z'
  },

  // 9. STAFF ATTENDANCE: GURU KBM (SIUBA v1.1)
  {
    id: 'UAT-SDM-GUR-01',
    module: 'Presensi Mengajar Guru',
    role: 'Guru',
    scenario: 'Alur Presensi Mengajar KBM Mandiri, Scan Tap RFID Masuk/Keluar Kelas & Toleransi Keterlambatan',
    preconditions: 'Login sebagai Guru Pengampu; Jadwal KBM JP 1–2 aktif.',
    steps: [
      '1. Buka Dashboard Mengajar Guru > Pilih jadwal KBM aktif hari ini.',
      '2. Tap RFID / scan QR masuk kelas (Check-in KBM).',
      '3. Sistem menghitung selisih jam mulai dengan grace period toleransi.',
      '4. Selesaikan jam pelajaran dan tap check-out keluar kelas.'
    ],
    expected_result: 'Presensi mengajar tercatat, late_minutes akurat, status sesi berubah menjadi "completed".',
    actual_result: 'Check-in dan check-out mengajar sukses dalam hitungan milidetik. Rekap realisasi KBM terupdate.',
    status: 'PASS',
    tester_name: 'Ust. Syarif Hidayat, M.Pd (Guru Pengampu)',
    tested_at: '2026-08-25T09:15:00Z',
    notes: 'Sangat praktis dengan pemindai RFID portabel kelas.'
  },
  {
    id: 'UAT-SDM-GUR-02',
    module: 'Presensi Mengajar & Hak Akses',
    role: 'Guru',
    scenario: 'Uji Keamanan Hak Akses: Guru A mencoba mengakses & mencatat presensi sesi Guru B (Negative Test)',
    preconditions: 'Login sebagai Guru A (bukan pengampu dan bukan guru inval sesi target).',
    steps: [
      '1. Guru A mencoba membuka sesi KBM milik Guru B.',
      '2. Guru A mencoba mengirim presensi scan ke sesi Guru B.'
    ],
    expected_result: 'Sistem menolak dengan error otorisasi 403 Forbidden / NOT_ASSIGNED_TO_TEACHING_SESSION.',
    actual_result: 'Akses ditolak tegas (HTTP 403 / NOT_ASSIGNED_TO_TEACHING_SESSION). Keamanan IDOR terjamin.',
    status: 'PASS',
    tester_name: 'Ust. Syarif Hidayat, M.Pd (Guru Pengampu)',
    tested_at: '2026-08-25T09:40:00Z'
  },

  // 10. STAFF ATTENDANCE: PELATIH/PEMBINA EKSKUL (SIUBA v1.1)
  {
    id: 'UAT-SDM-PLT-01',
    module: 'Presensi Pelatih & Realisasi',
    role: 'Pembina',
    scenario: 'Alur Presensi Melatih Ekskul, Pengisian Jurnal Realisasi Materi & Sinkronisasi Kehadiran Santri',
    preconditions: 'Login sebagai Pelatih/Pembina Ekskul Resmi (misal: Silat/Panahan/Pramuka).',
    steps: [
      '1. Buka Modul Presensi Pelatih > Pilih sesi latihan terjadwal hari ini.',
      '2. Tap check-in kehadiran pelatih.',
      '3. Lakukan presensi santri peserta ekskul.',
      '4. Isi form Jurnal Realisasi Latihan (materi, catatan, jumlah peserta hadir, dokumentasi).',
      '5. Finalisasi sesi latihan ekskul.'
    ],
    expected_result: 'Presensi pelatih tersimpan, realisasi kegiatan terdata lengkap, santri absent ter-auto alpha.',
    actual_result: 'Sesi latihan tuntas 100%, jurnal realisasi langsung tersinkron ke laporan ekskul yayasan.',
    status: 'PASS',
    tester_name: 'Ust. Danang Prabowo (Pembina Ekskul)',
    tested_at: '2026-08-25T10:30:00Z'
  },
  {
    id: 'UAT-SDM-PLT-02',
    module: 'Presensi Pelatih & Hak Akses',
    role: 'Pembina',
    scenario: 'Uji Keamanan Hak Akses: Pelatih Ekskul A mencoba memanipulasi sesi Ekskul B (Negative Test)',
    preconditions: 'Login sebagai Pelatih Ekskul A.',
    steps: [
      '1. Pelatih Ekskul A mencoba membuka sesi Ekskul B.',
      '2. Mencoba mengirim input realisasi ke sesi Ekskul B.'
    ],
    expected_result: 'Sistem menolak dengan error otorisasi 403 Forbidden / NOT_ASSIGNED_TO_TRAINING_SESSION.',
    actual_result: 'Akses ditolak seketika (HTTP 403 / NOT_ASSIGNED_TO_TRAINING_SESSION).',
    status: 'PASS',
    tester_name: 'Ust. Danang Prabowo (Pembina Ekskul)',
    tested_at: '2026-08-25T10:50:00Z'
  },

  // 11. STAFF ATTENDANCE: KEPALA SEKOLAH & KEPALA ASRAMA
  {
    id: 'UAT-SDM-KPS-01',
    module: 'Laporan & Pengawasan KBM',
    role: 'Kepala Sekolah',
    scenario: 'Pemantauan Rasio Realisasi KBM Guru, Deteksi Guru Inval & Filter Laporan Lintas Jenjang',
    preconditions: 'Login sebagai Kepala Madrasah / Sekolah.',
    steps: [
      '1. Buka Dashboard SDM Terpadu > KPI Mengajar Guru (KBM).',
      '2. Verifikasi rasio kehadiran guru, sesi terlaksana, dan sesi inval.',
      '3. Buka Pusat Laporan SDM > Cetak Rekap KBM Bulanan format resmi KOP Surat.'
    ],
    expected_result: 'Angka metrik KBM terpisah independen dari absensi harian umum, hasil cetak KOP rapi.',
    actual_result: 'Dashboard KBM terverifikasi akurat, pemisahan metrik Harian vs KBM bekerja 100% konsisten.',
    status: 'PASS',
    tester_name: 'Drs. H. M. Zainuddin, M.Pd (Kepala Sekolah)',
    tested_at: '2026-08-25T11:20:00Z'
  },

  // 12. STAFF ATTENDANCE: PIMPINAN PESANTREN
  {
    id: 'UAT-SDM-PMP-01',
    module: 'Eksekutif SDM Terpadu',
    role: 'Pimpinan',
    scenario: 'Analisis Multi-Domain SDM (Kehadiran Harian, KBM Guru, Pelatih Ekskul) & Dossier 360 Pegawai',
    preconditions: 'Login sebagai Mudir / Pimpinan Pesantren.',
    steps: [
      '1. Buka Dashboard SDM Terpadu.',
      '2. Analisis 3 KPI Card terpisah (Harian, Mengajar KBM, Melatih Ekskul) tanpa skor gabungan semu.',
      '3. Buka Pusat Laporan > Tab Matriks 360 SDM > Buka Dossier Profil 360 salah satu asatidz.',
      '4. Lakukan ekspor CSV Laporan Terpadu.'
    ],
    expected_result: 'Seluruh domain tersaji transparan tanpa distorsi data, profil 360 menyajikan riwayat komprehensif.',
    actual_result: 'Visualisasi 7-hari dan dossier 360 sangat jelas. Ekspor CSV ber-BOM UTF-8 rapi.',
    status: 'PASS',
    tester_name: 'KH. Abdullah Munir (Pimpinan Pesantren)',
    tested_at: '2026-08-25T13:00:00Z'
  },

  // 13. STAFF ATTENDANCE: PETUGAS ABSENSI
  {
    id: 'UAT-SDM-PTG-01',
    module: 'Terminal Scanner SDM',
    role: 'Petugas',
    scenario: 'Operasional Scanner QR & RFID Mode SDM Harian, Deteksi Double Tap & Uji Salah Mode',
    preconditions: 'Kios RFID & Scanner QR diaktifkan pada mode "ABSENSI SDM HARIAN".',
    steps: [
      '1. Pegawai tap RFID pada kios (Tercatat Masuk Tepat / Terlambat).',
      '2. Pegawai tap kartu kedua kalinya (Mencegah double check-in, alert "Sudah Tercatat").',
      '3. Coba scan kartu Santri pada scanner SDM (Mendeteksi invalid context error).'
    ],
    expected_result: 'Presensi SDM tercatat cepat, double tap dicegah, scan salah kartu memberikan pesan jelas dalam Bahasa Indonesia.',
    actual_result: 'Feedback audio beep & pesan informatif muncul. Zero duplicate scan.',
    status: 'PASS',
    tester_name: 'Ust. M. Ridwan (Petugas Terminal)',
    tested_at: '2026-08-25T14:15:00Z'
  }
];

export const INITIAL_UAT_SIGNOFFS: UATSignOffItem[] = [
  {
    id: 'SIGNOFF-01',
    role: 'Super Admin',
    module: 'Seluruh Modul & Infrastruktur Sistem',
    representative_name: 'Ust. Ahmad Fauzi, S.Kom',
    representative_title: 'Kepala Biro IT & Infrastruktur Pesantren',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T14:30:00Z',
    notes: 'Seluruh modul arsitektur, security hardening, data integrity, dan modul SDM v1.1 memenuhi standar produksi STABLE.',
    signature_hash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  },
  {
    id: 'SIGNOFF-02',
    role: 'Pimpinan',
    module: 'Eksekutif Dashboard, Laporan & Matriks 360 SDM',
    representative_name: 'KH. Abdullah Munir',
    representative_title: 'Mudir / Pimpinan Pesantren',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T14:45:00Z',
    notes: 'Modul Absensi SDM Terpadu (Harian, KBM, Ekskul) disetujui penuh untuk implementasi operasional pondok.',
    signature_hash: 'SHA256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
  },
  {
    id: 'SIGNOFF-03',
    role: 'Kepala Sekolah',
    module: 'Akademik KBM, Jadwal Pelajaran & Presensi Mengajar Guru',
    representative_name: 'Drs. H. M. Zainuddin, M.Pd',
    representative_title: 'Kepala Madrasah / Sekolah',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T15:00:00Z',
    notes: 'Presensi mengajar guru, delegasi guru inval, dan jurnal KBM terverifikasi siap pakai.',
    signature_hash: 'SHA256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d'
  },
  {
    id: 'SIGNOFF-04',
    role: 'Kepala Asrama',
    module: 'Kepengasuhan, Ibadah, Asrama & Presensi Musyrif',
    representative_name: 'Ust. H. Nurul Huda, Lc',
    representative_title: 'Kepala Pengasuhan Santri & Asrama',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T15:15:00Z',
    notes: 'Alur presensi shalat 5 waktu santri dan presensi harian musyrif asrama telah divalidasi.',
    signature_hash: 'SHA256:8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
  },
  {
    id: 'SIGNOFF-05',
    role: 'Petugas',
    module: 'Operasional Lapangan (QR, RFID, Kios SDM & Santri)',
    representative_name: 'Ust. M. Ridwan',
    representative_title: 'Koordinator Petugas Absensi Harian',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T15:30:00Z',
    notes: 'Terminal pemindai QR dan RFID siap melayani jam masuk SDM dan shalat berjamaah.',
    signature_hash: 'SHA256:04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb'
  },
  {
    id: 'SIGNOFF-06',
    role: 'Guru',
    module: 'Presensi Mengajar Mandiri & Guru Pengganti (Inval)',
    representative_name: 'Ust. Syarif Hidayat, M.Pd',
    representative_title: 'Koordinator Dewan Guru',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T15:45:00Z',
    notes: 'Alur presensi KBM dan mekanisme guru pengganti telah disetujui dewan guru.',
    signature_hash: 'SHA256:3a19b88cd5e12f00a98b44c01e67891234567890abcdef1234567890abcdef12'
  },
  {
    id: 'SIGNOFF-07',
    role: 'Pembina',
    module: 'Presensi Pelatih, Realisasi Ekskul & Partisipasi Santri',
    representative_name: 'Ust. Danang Prabowo',
    representative_title: 'Koordinator Ekstrakurikuler & Olahraga',
    status: 'ACCEPTED',
    signed_at: '2026-08-25T16:00:00Z',
    notes: 'Sistem presensi pelatih dan pencatatan realisasi ekskul telah diuji dan disahkan.',
    signature_hash: 'SHA256:9c8821fa55e0987654321fedcba0987654321fedcba0987654321fedcba09876'
  }
];

export const INITIAL_BUG_BACKLOG: BugBacklogItem[] = [
  {
    id: 'BUG-101',
    title: 'Optimasi rendering virtual list pada rekap 500+ santri di browser HP low-end',
    module: 'Laporan & Rekap',
    severity: 'LOW',
    status: 'FIXED',
    repro_steps: 'Buka laporan rekap 500 santri di HP RAM 2GB dengan 100 tab background.',
    expected: 'Scrolling tetap mulus 60 FPS.',
    actual: 'Terjadi frame drop ringan saat initial render.',
    owner: 'Frontend Lead',
    created_at: '2026-08-19T10:00:00Z',
    resolved_at: '2026-08-21T14:00:00Z',
    notes: 'Telah dioptimasi menggunakan chunk rendering & memoized data filters.'
  },
  {
    id: 'BUG-102',
    title: 'Penambahan indikator getar (vibration API) saat scan QR berhasil di Android Chrome',
    module: 'QR Scanner',
    severity: 'LOW',
    status: 'CLOSED',
    repro_steps: 'Scan QR di HP Android.',
    expected: 'HP bergetar singkat 50ms sebagai feedback haptic.',
    actual: 'Hanya audio beep tanpa getar.',
    owner: 'UI/UX Lead',
    created_at: '2026-08-20T11:00:00Z',
    resolved_at: '2026-08-21T16:30:00Z',
    notes: 'Navigator.vibrate(50) telah diaktifkan dengan graceful fallback untuk iOS.'
  }
];

export class UATService {
  /**
   * Get all UAT test cases
   */
  public static getCases(): UATTestCase[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UAT_CASES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_UAT_CASES;
  }

  /**
   * Update UAT test case
   */
  public static updateCase(updated: UATTestCase): UATTestCase[] {
    const list = this.getCases().map(c => c.id === updated.id ? updated : c);
    try {
      localStorage.setItem(STORAGE_KEY_UAT_CASES, JSON.stringify(list));
    } catch {}
    return list;
  }

  /**
   * Get UAT sign-offs
   */
  public static getSignOffs(): UATSignOffItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UAT_SIGNOFFS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_UAT_SIGNOFFS;
  }

  /**
   * Save digital sign-off
   */
  public static signOff(item: UATSignOffItem): UATSignOffItem[] {
    const list = this.getSignOffs().map(s => s.id === item.id ? item : s);
    try {
      localStorage.setItem(STORAGE_KEY_UAT_SIGNOFFS, JSON.stringify(list));
    } catch {}
    return list;
  }

  /**
   * Get Bug Backlog items
   */
  public static getBugBacklog(): BugBacklogItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BUG_BACKLOG);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_BUG_BACKLOG;
  }

  /**
   * Quality Gate Check: strictly 0 BLOCKER and 0 CRITICAL open bugs
   */
  public static checkQualityGates(): { 
    isPassed: boolean; 
    blockerCount: number; 
    criticalCount: number; 
    highCount: number; 
    openCount: number; 
    message: string;
  } {
    const bugs = this.getBugBacklog();
    const openBugs = bugs.filter(b => b.status === 'OPEN' || b.status === 'IN_PROGRESS' || b.status === 'RETEST');
    
    const blockerCount = openBugs.filter(b => b.severity === 'BLOCKER').length;
    const criticalCount = openBugs.filter(b => b.severity === 'CRITICAL').length;
    const highCount = openBugs.filter(b => b.severity === 'HIGH').length;

    const isPassed = blockerCount === 0 && criticalCount === 0;

    return {
      isPassed,
      blockerCount,
      criticalCount,
      highCount,
      openCount: openBugs.length,
      message: isPassed 
        ? '✓ Quality Gate Terpenuhi: 0 Blocker & 0 Critical Bugs. Sistem SIAP Go-Live.'
        : `✕ Quality Gate GAGAL: Masih terdapat ${blockerCount} Blocker & ${criticalCount} Critical issues.`
    };
  }
}
