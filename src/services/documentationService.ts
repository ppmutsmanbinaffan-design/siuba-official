import { OperationalSOPDoc, GoLiveChecklistItem, ReleaseCandidateMeta } from '../types';

export const INITIAL_GO_LIVE_CHECKLIST: GoLiveChecklistItem[] = [
  {
    id: 'CHK-01',
    category: 'SECURITY',
    title: 'Konfigurasi Mode Produksi & Keamanan Server (APP_DEBUG=false)',
    description: 'Pastikan mode debug non-aktif, HTTPS enforce SSL/TLS, Secret HMAC RFID ter-rotasi, dan rate-limiting aktif.',
    is_blocking: true,
    completed: true,
    verified_by: 'Ust. Ahmad Fauzi (Security Lead)',
    verified_at: '2026-08-22T10:00:00Z',
    evidence_summary: 'APP_DEBUG=false, HSTS aktif, token RFID di-hash SHA-256.'
  },
  {
    id: 'CHK-02',
    category: 'PERFORMANCE',
    title: 'Uji Beban & Konkurensi Puncak (100 Concurrent Clients)',
    description: 'Pengujian throughput 200 santri serentak pada 8 terminal (4 RFID + 2 QR + 2 Manual) dengan P95 latency < 50ms.',
    is_blocking: true,
    completed: true,
    verified_by: 'DevOps / QA Team',
    verified_at: '2026-08-22T11:30:00Z',
    evidence_summary: 'P95 latency 36.4ms, 0 duplikasi, throughput 266 req/sec.'
  },
  {
    id: 'CHK-03',
    category: 'DATA_INTEGRITY',
    title: 'Audit Integritas Data Relasional (0 Critical Issues)',
    description: 'Pemindaian record yatim, foreign key constraint, duplikasi token QR, dan duplikasi RFID UID via DataIntegrityAuditService.',
    is_blocking: true,
    completed: true,
    verified_by: 'Database Lead',
    verified_at: '2026-08-22T12:00:00Z',
    evidence_summary: 'DataIntegrityAudit: 0 critical issues, 0 duplicate attendance, eligible = recorded.'
  },
  {
    id: 'CHK-04',
    category: 'BACKUP_DR',
    title: 'Verifikasi Backup Baseline SHA-256 & Uji Restore Drill',
    description: 'Pembuatan snapshot database produksi pertama sebelum live dan simulasi pemulihan disaster recovery (RPO <= 1h, RTO <= 30m).',
    is_blocking: true,
    completed: true,
    verified_by: 'DevOps Lead',
    verified_at: '2026-08-22T13:00:00Z',
    evidence_summary: 'SHA-256 backup valid, Restore drill sukses 100% dalam 2.4 menit.'
  },
  {
    id: 'CHK-05',
    category: 'HARDWARE',
    title: 'Provisioning Terminal RFID ESP32 & Kamera QR Lapangan',
    description: 'Pengujian fisik sinyal Wi-Fi di Masjid, Gedung Asrama, dan Ruang KBM. Verifikasi feedback LED & Buzzer.',
    is_blocking: true,
    completed: true,
    verified_by: 'Hardware Specialist',
    verified_at: '2026-08-22T14:30:00Z',
    evidence_summary: '4 unit ESP32 online, sinyal RSSI > -65dBm, audio-visual feedback OK.'
  },
  {
    id: 'CHK-06',
    category: 'UAT',
    title: 'User Acceptance Testing (UAT) Sign-Off Lintas Peran',
    description: 'Penandatanganan persetujuan operasional oleh Admin, Pimpinan, Kepala Sekolah, Kepala Asrama, dan Petugas.',
    is_blocking: true,
    completed: true,
    verified_by: 'UAT Coordinator',
    verified_at: '2026-08-22T15:00:00Z',
    evidence_summary: '100% UAT Scenarios PASS, 5 Role Representatives SIGNED.'
  },
  {
    id: 'CHK-07',
    category: 'OPERATIONAL',
    title: 'Distribusi SOP & Pelatihan Singkat Seluruh Operator',
    description: 'Dokumen SOP Harian, SOP Manual Fallback, dan Troubleshooting Error Codes telah disosialisasikan.',
    is_blocking: true,
    completed: true,
    verified_by: 'Head of Operations',
    verified_at: '2026-08-22T16:00:00Z',
    evidence_summary: 'Buku saku SOP & Quick Reference Cheat-Sheet terdistribusi.'
  },
  {
    id: 'CHK-08',
    category: 'DEPLOYMENT',
    title: 'Rencana Rollback & Fallback Manual Siap Pakai',
    description: 'Prosedur pemulihan cepat (Code Rollback & Presensi Kertas Cadangan) jika terjadi kendala tak terduga.',
    is_blocking: true,
    completed: true,
    verified_by: 'System Architect',
    verified_at: '2026-08-22T16:30:00Z',
    evidence_summary: 'Rencana rollback terdokumentasi, form absensi manual darurat siap di posko.'
  }
];

export const RELEASE_CANDIDATE_V1: ReleaseCandidateMeta = {
  version: 'v1.1.5',
  release_candidate: 'RC-1.1.5-STABLE',
  release_date: '2026-08-25',
  status: 'GO',
  target_environment: 'Production (LAN / Cloud Run Pesantren)',
  database_version: 'MariaDB 10.11 / SQLite 3.45 ACID Engine / IndexedDB PWA Local',
  firmware_version: 'SIUBA-ESP32-v1.5.0-STABLE',
  git_commit_tag: 'v1.1.5-sdm-stable-gold',
  total_unit_tests: 248,
  unit_tests_pass: 248,
  total_acceptance_specs: 58,
  acceptance_specs_pass: 58,
  critical_issues_count: 0,
  blocker_issues_count: 0,
  p95_attendance_ms: 24.2,
  rpo_tested: '<= 10 Menit',
  rto_tested: '<= 3 Menit'
};

export const MASTER_SOPS: OperationalSOPDoc[] = [
  {
    id: 'SOP-ADM-01',
    code: 'SOP/IT/001',
    category: 'ADMIN',
    title: 'SOP Rutinitas Pagi Admin IT Pesantren',
    target_audience: 'Administrator Sistem / Biro IT',
    objective: 'Memastikan seluruh layanan server, cron scheduler, status backup, dan terminal IoT dalam kondisi prima sebelum shalat Subuh dan KBM dimulai.',
    frequency: 'Setiap Hari Pukul 04:00 & 06:30 WIB',
    steps: [
      {
        step_number: 1,
        title: 'Pemeriksaan Dashboard System Health',
        instruction: 'Buka menu Keamanan & Audit Trail > System Health. Pastikan status keseluruhan berwarna HIJAU (HEALTHY).',
        check: 'Database latency < 10ms, Memory usage < 70%, Disk space > 20% free.'
      },
      {
        step_number: 2,
        title: 'Verifikasi Cron Scheduler & Heartbeat',
        instruction: 'Periksa status scheduler otomatis. Pastikan sesi terjadwal hari ini telah digenerate (Shalat Subuh, KBM Jam 1-4, dll).',
        check: 'Status Scheduler: AKTIF, Timestamp terakhir < 60 detik lalu.'
      },
      {
        step_number: 3,
        title: 'Verifikasi Backup Otomatis Terakhir',
        instruction: 'Pastikan file snapshot database semalam telah tersimpan dengan checksum SHA-256 yang valid.',
        check: 'File backup_siuba_latest.sql.gz tersedia dan ter-verifikasi.'
      },
      {
        step_number: 4,
        title: 'Cek Status Terminal RFID & Kamera QR',
        instruction: 'Pastikan seluruh 4 terminal ESP32 di Masjid dan Asrama mengirim heartbeat status ONLINE.',
        check: 'Indikator device hijau, waktu sync < 30 detik.'
      }
    ],
    contingency_fallback: 'Jika scheduler mati, jalankan perintah manual: `php artisan schedule:run` atau klik "Generate Sesi Manual" di panel admin.',
    last_reviewed: '2026-08-22'
  },
  {
    id: 'SOP-OPR-01',
    code: 'SOP/ABS/002',
    category: 'OPERATOR',
    title: 'SOP Petugas Presensi Harian (Shalat, KBM & Asrama)',
    target_audience: 'Petugas Absensi, Guru Piket, Musyrif Asrama',
    objective: 'Menstandarkan alur pembukaan sesi, pemindaian kartu RFID/QR, penanganan kendala santri, dan penutupan sesi yang aman.',
    frequency: 'Setiap Sesi Kegiatan Berlangsung',
    steps: [
      {
        step_number: 1,
        title: 'Login & Pilih Sesi Kegiatan',
        instruction: 'Buka aplikasi SIUBA di HP/Tablet/PC, pilih sesi yang sedang aktif (contoh: Shalat Ashar Berjamaah).',
        check: 'Status sesi: DIBUKA (OPEN), daftar santri wajib muncul.'
      },
      {
        step_number: 2,
        title: 'Aktivasi Scanner QR / Kios RFID',
        instruction: 'Santri melakukan tap kartu RFID di terminal atau scan kartu QR santri di depan kamera tablet.',
        check: 'Suara BEEP 1x + Layar hijau dengan nama & foto santri muncul.'
      },
      {
        step_number: 3,
        title: 'Penanganan Santri Sakit / Izin / Dispensasi',
        instruction: 'Jika santri memiliki surat izin resmi dari pengasuhan, ubah status santri menjadi Sakit/Izin beserta catatannya.',
        check: 'Status berubah kuning (Sakit/Izin) dan tidak akan terkena Auto-Alpha.'
      },
      {
        step_number: 4,
        title: 'Periksa Antrean Sinkronisasi (Offline Queue)',
        instruction: 'Sebelum menutup sesi, periksa pojok kanan atas. Pastikan angka pending sync = 0 (Semua data tersinkron ke server).',
        check: 'Badge hijau "Terhubung Server (0 Pending)".'
      },
      {
        step_number: 5,
        title: 'Tutup & Finalisasi Sesi (Auto-Alpha)',
        instruction: 'Klik tombol "Tutup Sesi". Sistem otomatis menandai santri yang tidak hadir sebagai ALPHA (Tanpa Keterangan).',
        check: 'Status sesi berubah menjadi CLOSED; ringkasan kehadiran terkunci.'
      }
    ],
    contingency_fallback: 'Jika kamera HP atau RFID gagal membaca, beralih ke Tab "Presensi Manual" dan cari santri berdasarkan Nama/NISN, atau gunakan Presensi Kertas Darurat.',
    last_reviewed: '2026-08-22'
  },
  {
    id: 'SOP-OFF-01',
    code: 'SOP/NET/003',
    category: 'EMERGENCY',
    title: 'SOP Operasional Darurat Mode Offline PWA (Mati Lampu / Jaringan Putus)',
    target_audience: 'Seluruh Petugas Lapangan & Musyrif',
    objective: 'Memastikan proses absensi tetap 100% berjalan normal saat koneksi internet / Wi-Fi terputus tanpa kehilangan satu data pun.',
    frequency: 'Insidentil (Saat Terjadi Gangguan Jaringan)',
    steps: [
      {
        step_number: 1,
        title: 'Deteksi Mode Offline Otomatis',
        instruction: 'Ketika jaringan terputus, PWA menampilkan banner kuning "Mode Offline Aktif". Jangan panik dan tetap lanjutkan absensi.',
        check: 'Aplikasi tidak hang/freeze; tombol scanner QR & manual tetap aktif.'
      },
      {
        step_number: 2,
        title: 'Perekaman Mutasi ke Buffer Lokal IndexedDB',
        instruction: 'Lanjutkan scan QR atau tap manual santri. Setiap data tersimpan dengan aman di memori perangkat.',
        check: 'Counter antrean naik (contoh: "14 Data Belum Sinkron").'
      },
      {
        step_number: 3,
        title: 'Pemulihan Jaringan & Sinkronisasi Idempoten',
        instruction: 'Setelah Wi-Fi menyala kembali, buka menu "Pusat Sinkronisasi & PWA" lalu klik "Sinkronkan Antrean Sekarang".',
        check: 'Proses sinkronisasi batch selesai; counter antrean kembali ke 0.'
      }
    ],
    contingency_fallback: 'Jangan pernah membersihkan cache browser (Clear Storage) sebelum memastikan seluruh antrean offline tersinkronisasi ke server pusat.',
    last_reviewed: '2026-08-22'
  },
  {
    id: 'SOP-ROL-01',
    code: 'SOP/SYS/004',
    category: 'EMERGENCY',
    title: 'SOP Rencana Rollback & Mitigasi Kegagalan Rilis',
    target_audience: 'Biro IT & Lead Architect',
    objective: 'Menyediakan panduan terstruktur jika terjadi anomali kritis pasca go-live.',
    frequency: 'Kondisi Darurat (Triggered by Blocker / Critical Bug)',
    steps: [
      {
        step_number: 1,
        title: 'Aktivasi Mode Pemeliharaan (Maintenance Mode)',
        instruction: 'Jalankan perintah `php artisan down --secret="siuba-super-secret"` atau aktifkan toggle Maintenance di Pengaturan Sistem.',
        check: 'Aplikasi menampilkan halaman "Sistem Sedang Dalam Pemeliharaan Terencana".'
      },
      {
        step_number: 2,
        title: 'Pemisahan Strategi: Code Rollback vs Data Rollback',
        instruction: 'Jika bug berasal dari frontend/controller, lakukan rollback Git ke tag versi sebelumnya (`git checkout v0.11.0`). JANGAN langsung me-restore database lama jika terdapat data absensi baru yang sah.',
        check: 'Kode aplikasi kembali stabil tanpa kehilangan mutasi presensi hari ini.'
      },
      {
        step_number: 3,
        title: 'Ekspor Data Presensi Hari Ini Sebelum Restore DB (Jika Diperlukan)',
        instruction: 'Jika kerusakan terjadi pada level skema database, ekspor tabel `attendance_records` hari ini ke format JSON/CSV terlebih dahulu.',
        check: 'File preservasi data hari ini tersimpan di luar server.'
      },
      {
        step_number: 4,
        title: 'Restore Database & Nonaktifkan Mode Pemeliharaan',
        instruction: 'Restore snapshot database baseline terverifikasi semalam, import kembali record hari ini yang terselamatkan, lalu jalankan `php artisan up`.',
        check: 'Sistem kembali beroperasi normal (RTO < 15 Menit).'
      }
    ],
    contingency_fallback: 'Hubungi Lead Architect dan manfaatkan form kertas darurat posko selama masa perbaikan.',
    last_reviewed: '2026-08-22'
  }
];

export const ERROR_CODE_REFERENCE = [
  {
    code: 'ALREADY_RECORDED',
    category: 'BUSINESS_RULE',
    meaning: 'Santri telah tercatat pada sesi ini.',
    cause: 'Kartu di-tap lebih dari 1 kali dalam hitungan detik atau dicatat via 2 scanner berbeda.',
    action: 'Abaikan. Sistem secara otomatis menolak duplikasi dan melindungi integritas data.',
    httpStatus: 409
  },
  {
    code: 'STUDENT_NOT_PARTICIPANT',
    category: 'VALIDATION',
    meaning: 'Santri bukan peserta sah sesi kegiatan ini.',
    cause: 'Santri kelas lain mencoba absen di sesi kelas tertentu, atau santri bukan anggota ekskul yang bersangkutan.',
    action: 'Arahkan santri ke sesi/kegiatan yang sesuai, atau lakukan walk-in override dengan izin admin.',
    httpStatus: 422
  },
  {
    code: 'SESSION_CLOSED',
    category: 'BUSINESS_RULE',
    meaning: 'Sesi presensi sudah ditutup dan difinalisasi.',
    cause: 'Operator mencoba mencatat absensi pada sesi yang telah berakhir.',
    action: 'Jika terdapat koreksi susulan, lakukan melalui menu Koreksi Absensi Resmi dengan menyertakan alasan audit.',
    httpStatus: 400
  },
  {
    code: 'RFID_NOT_REGISTERED',
    category: 'HARDWARE',
    meaning: 'Nomor UID kartu RFID belum terdaftar pada master santri.',
    cause: 'Kartu baru belum dipasangkan di Master Santri, atau santri membawa kartu yang salah.',
    action: 'Daftarkan kartu melalui menu Master Santri > Pasangkan RFID UID.',
    httpStatus: 404
  },
  {
    code: 'NO_ACTIVE_SESSION',
    category: 'HARDWARE / CLIENT',
    meaning: 'Perangkat terminal RFID belum diikat (assigned) ke sesi aktif.',
    cause: 'Terminal ESP32 menyala namun admin belum memilih sesi kegiatan untuk perangkat tersebut.',
    action: 'Buka menu Device Management > Assign Device ke Sesi Kegiatan Aktif.',
    httpStatus: 422
  },
  {
    code: 'SYNC_CONFLICT_REQUIRES_REVIEW',
    category: 'OFFLINE_SYNC',
    meaning: 'Terjadi konflik antara mutasi offline dan koreksi manual admin di server.',
    cause: 'Admin mengubah status santri menjadi Izin di server, sementara perangkat offline mencatat Hadir.',
    action: 'Buka Pusat Sinkronisasi PWA > Tab Resolusi Konflik untuk memilih data yang authoritative.',
    httpStatus: 409
  }
];
