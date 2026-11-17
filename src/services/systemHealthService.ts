import { DisasterRecoveryPlan } from '../types';

/**
 * SOP pemulihan bencana untuk instalasi SIUBA (Windows + XAMPP / server Linux).
 * Status kesehatan & hasil uji pemulihan TIDAK lagi dikarang di sini: keduanya diambil dari server
 * (lihat systemStatusService.ts — GET /system/health-report dan /system/dr-drills).
 */
export class SystemHealthService {
  public static getDisasterRecoveryPlans(): DisasterRecoveryPlan[] {
    return [
      {
        id: 'dr_server_hardware_failure',
        title: 'Komputer Server Rusak / Mati Total',
        scenario: 'PC server (tempat XAMPP & database) tidak bisa menyala atau harddisk rusak.',
        rpo_target: 'Data hilang maks. sejak backup terakhir (harian 01:30)',
        rto_target: 'Target pulih ± 1 jam dengan PC cadangan',
        severity: 'CRITICAL',
        steps: [
          'Siapkan PC pengganti, pasang XAMPP di C:\\xampp.',
          'Salin folder aplikasi SIUBA (dari GitHub atau salinan terakhir) ke C:\\siuba-official-main.',
          'Salin berkas backup terbaru dari flashdisk/NAS ke storage\\app\\backups (simpan backup di luar PC server secara rutin!).',
          'Jalankan jalankan-siuba.bat sekali agar database & struktur tabel dibuat.',
          'Pulihkan data: Maintenance Hub → Pusat Backup → pilih backup → Pulihkan (Super Admin), atau perintah: C:\\xampp\\php\\php.exe artisan system:restore --backup-id=ID --reason="PC rusak".',
          'Jalankan Audit Integritas di halaman ini, lalu pasang ulang penjadwal: pasang-penjadwal-windows.bat.',
          'Atur ulang IP statis PC pengganti seperti PC lama agar alat RFID & HP petugas tersambung kembali.',
        ],
      },
      {
        id: 'dr_database_corruption',
        title: 'Database Rusak (Mati Listrik Mendadak)',
        scenario: 'MySQL XAMPP gagal menyala atau tabel rusak setelah listrik padam tanpa UPS.',
        rpo_target: 'Data hilang maks. sejak backup terakhir',
        rto_target: 'Target pulih ± 30 menit',
        severity: 'CRITICAL',
        steps: [
          'Matikan aplikasi (tutup jendela jalankan-siuba.bat) agar tidak ada data baru masuk.',
          'Salin folder C:\\xampp\\mysql\\data ke tempat lain sebagai cadangan (JANGAN dihapus).',
          'Coba nyalakan ulang MySQL dari XAMPP Control Panel; bila tetap gagal, lanjutkan pemulihan dari backup.',
          'Pulihkan backup terverifikasi terakhir: Maintenance Hub → Pusat Backup → Pulihkan (sistem membuat backup pengaman otomatis sebelum menimpa).',
          'Jalankan Audit Integritas di halaman ini dan perbaiki temuan yang bisa diperbaiki otomatis.',
          'Minta petugas membuka Pusat Sinkronisasi agar antrean offline di HP/tablet terkirim ulang.',
        ],
      },
      {
        id: 'dr_accidental_mass_deletion',
        title: 'Data Terhapus Tidak Sengaja',
        scenario: 'Admin keliru menghapus data santri, kelas, atau sesi penting.',
        rpo_target: 'Data hilang maks. sejak backup terakhir',
        rto_target: 'Target pulih ± 15 menit',
        severity: 'HIGH',
        steps: [
          'Buka tab Audit Trail di halaman ini: cari siapa dan kapan data dihapus.',
          'Buat backup baru dulu (tombol Backup Terverifikasi) agar data yang masuk setelah penghapusan tidak hilang.',
          'Bila penghapusan baru terjadi, pulihkan backup sebelum waktu penghapusan dari Maintenance Hub → Pusat Backup.',
          'Masukkan ulang data yang tercatat setelah backup itu (lihat Audit Trail / backup yang baru dibuat).',
          'Catat alasan pemulihan; tinjau ulang hak akses pengguna yang melakukan penghapusan.',
        ],
      },
      {
        id: 'dr_power_outage_blackout',
        title: 'Listrik Padam Seluruh Pesantren',
        scenario: 'Server dan jaringan mati saat kegiatan berlangsung.',
        rpo_target: 'Tanpa kehilangan data bila presensi dicatat di HP petugas (mode offline)',
        rto_target: 'Presensi tetap berjalan di HP; server pulih saat listrik menyala',
        severity: 'HIGH',
        steps: [
          'Petugas tetap mencatat presensi lewat HP/tablet yang sudah pernah login (aplikasi menyimpan antrean offline).',
          'Saat listrik kembali, nyalakan PC server dan jalankan jalankan-siuba.bat.',
          'Pastikan Maintenance Hub → Status menunjukkan database & penjadwal sehat.',
          'Petugas membuka Pusat Sinkronisasi; antrean offline terkirim otomatis saat server terjangkau.',
          'Tutup sesi yang terlewat atau biarkan Auto-Close menutupnya; periksa Audit Integritas.',
        ],
      },
      {
        id: 'dr_device_failure',
        title: 'Alat RFID Hilang, Rusak, atau Kunci Bocor',
        scenario: 'Alat tap kartu di gerbang/masjid hilang, rusak, atau kunci perangkat (NEXABSEN_GLOBAL_KEY) diketahui orang lain.',
        rpo_target: 'Tanpa kehilangan data',
        rto_target: 'Target ± 10 menit',
        severity: 'MEDIUM',
        steps: [
          'Buka Device Management, nonaktifkan alat yang hilang/rusak — tap dari alat itu langsung ditolak server.',
          'Sementara itu gunakan presensi QR atau manual di HP petugas.',
          'Bila kunci bocor: ganti NEXABSEN_GLOBAL_KEY di file .env, jalankan php artisan optimize:clear, lalu isi kunci baru ke semua alat yang sah.',
          'Daftarkan alat pengganti; alat baru otomatis tercatat "menunggu" sampai diaktifkan admin.',
          'Periksa Audit Trail & log perangkat untuk tap mencurigakan selama alat hilang.',
        ],
      },
    ];
  }
}
