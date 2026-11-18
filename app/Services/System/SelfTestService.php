<?php

namespace App\Services\System;

use App\Models\AcademicYear;
use App\Models\Activity;
use App\Models\AppSetting;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\StudentExcusal;
use App\Models\SystemBackup;
use App\Models\User;
use App\Services\Security\DataIntegrityAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Uji Kesiapan Sistem: pemeriksaan BACA-SAJA atas konfigurasi & data sungguhan sebelum / selama dipakai.
 * Menggantikan "Acceptance Tests" lama yang menguji mesin perhitungan di browser dengan data contoh.
 *
 * Status: pass (siap), warn (sebaiknya dibenahi), fail (harus dibenahi sebelum go-live).
 */
class SelfTestService
{
    /** @return array{ran_at:string, summary:array<string,int>, ready:bool, checks:array<int,array<string,mixed>>} */
    public static function run(): array
    {
        $checks = [];
        $add = function (string $group, string $id, string $label, string $status, string $detail, ?string $fix = null) use (&$checks) {
            $checks[] = compact('group', 'id', 'label', 'status', 'detail', 'fix');
        };
        $safe = function (callable $fn, string $group, string $id, string $label) use ($add) {
            try {
                $fn();
            } catch (\Throwable $e) {
                $add($group, $id, $label, 'fail', 'Pemeriksaan gagal dijalankan: ' . $e->getMessage());
            }
        };

        // ------------------------------------------------------------ Konfigurasi
        $g = 'Konfigurasi Server';
        $safe(function () use ($add, $g) {
            DB::select('select 1');
            $add($g, 'db', 'Koneksi database', 'pass', 'Database ' . DB::connection()->getDriverName() . ' terhubung.');
        }, $g, 'db', 'Koneksi database');
        $safe(function () use ($add, $g) {
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles([database_path('migrations')]);
            $ran = $migrator->repositoryExists() ? $migrator->getRepository()->getRan() : [];
            $pending = count(array_diff(array_keys($files), $ran));
            $add($g, 'migrations', 'Struktur database terbaru', $pending ? 'fail' : 'pass',
                $pending ? "{$pending} migrasi belum dijalankan." : 'Semua migrasi sudah dijalankan.',
                $pending ? 'Jalankan jalankan-siuba.bat (atau php artisan migrate --force).' : null);
        }, $g, 'migrations', 'Struktur database terbaru');
        $add($g, 'app_key', 'Kunci aplikasi (APP_KEY)', config('app.key') ? 'pass' : 'fail',
            config('app.key') ? 'Sudah diisi.' : 'APP_KEY kosong — login & enkripsi tidak aman.', config('app.key') ? null : 'Jalankan php artisan key:generate.');
        $add($g, 'debug', 'Mode debug', config('app.debug') ? 'warn' : 'pass',
            config('app.debug') ? 'APP_DEBUG aktif: pesan galat rinci bisa terlihat pengguna.' : 'Nonaktif.', config('app.debug') ? 'Ubah APP_DEBUG=false di .env.' : null);
        $tz = config('app.timezone');
        $add($g, 'timezone', 'Zona waktu server', $tz === 'Asia/Jakarta' ? 'pass' : 'warn', "Zona waktu: {$tz}.",
            $tz === 'Asia/Jakarta' ? null : 'Atur APP_TIMEZONE=Asia/Jakarta di .env.');
        $writable = is_writable(storage_path()) && is_writable(storage_path('app'));
        $add($g, 'storage', 'Folder penyimpanan', $writable ? 'pass' : 'fail',
            $writable ? 'Folder storage bisa ditulis.' : 'Folder storage tidak bisa ditulis — backup & log gagal.', $writable ? null : 'Periksa hak akses folder storage.');
        $iot = filled(config('services.nexabsen.key'));
        $add($g, 'iot_key', 'Kunci alat RFID', $iot ? 'pass' : 'warn',
            $iot ? 'NEXABSEN_GLOBAL_KEY sudah diisi.' : 'NEXABSEN_GLOBAL_KEY kosong — alat RFID tidak bisa mengirim tap.',
            $iot ? null : 'Isi NEXABSEN_GLOBAL_KEY di .env (abaikan bila tidak memakai alat RFID).');

        // ------------------------------------------------------------ Keamanan & cadangan
        $g = 'Keamanan & Cadangan';
        $safe(function () use ($add, $g) {
            $supers = User::role('super-admin')->where('is_active', true)->count();
            $add($g, 'super_admin', 'Akun Super Admin aktif', $supers >= 1 ? ($supers > 3 ? 'warn' : 'pass') : 'fail',
                "{$supers} akun Super Admin aktif.", $supers > 3 ? 'Batasi Super Admin seperlunya (1–2 akun).' : ($supers ? null : 'Buat minimal satu Super Admin.'));
        }, $g, 'super_admin', 'Akun Super Admin aktif');
        $initialPw = File::exists(storage_path('app/initial-admin-password.txt'));
        $add($g, 'initial_password', 'Berkas kata sandi awal', $initialPw ? 'warn' : 'pass',
            $initialPw ? 'storage/app/initial-admin-password.txt masih ada.' : 'Tidak ada berkas kata sandi awal yang tertinggal.',
            $initialPw ? 'Ganti kata sandi akun bawaan lalu hapus berkas itu.' : null);
        $safe(function () use ($add, $g) {
            $noRole = User::where('is_active', true)->doesntHave('roles')->count();
            $add($g, 'users_role', 'Pengguna tanpa peran', $noRole ? 'warn' : 'pass',
                $noRole ? "{$noRole} akun aktif belum diberi peran (tidak bisa membuka menu apa pun)." : 'Semua akun aktif punya peran.',
                $noRole ? 'Atur di Role & Permission.' : null);
        }, $g, 'users_role', 'Pengguna tanpa peran');
        $safe(function () use ($add, $g) {
            $last = SystemBackup::where('status', 'verified')->latest('created_at')->first();
            $hours = $last ? abs(now()->diffInMinutes($last->created_at)) / 60 : null;
            $status = $last === null ? 'fail' : ($hours <= 26 ? 'pass' : ($hours <= 72 ? 'warn' : 'fail'));
            $add($g, 'backup', 'Backup database', $status,
                $last ? 'Backup terakhir ' . $last->created_at->diffForHumans() . " ({$last->backup_id})." : 'Belum ada backup.',
                $status === 'pass' ? null : 'Buat backup di Maintenance Hub dan pasang penjadwal agar backup harian berjalan.');
            if ($last) {
                $ok = BackupService::verifyBackup($last);
                $add($g, 'backup_file', 'Berkas backup terakhir utuh', $ok ? 'pass' : 'fail',
                    $ok ? 'Checksum berkas backup terakhir cocok.' : 'Berkas backup terakhir hilang atau rusak.', $ok ? null : 'Buat backup baru dan uji pulih.');
            }
        }, $g, 'backup', 'Backup database');
        $safe(function () use ($add, $g) {
            $hb = \Illuminate\Support\Facades\Cache::get('siuba_scheduler_last_heartbeat');
            $diff = $hb ? abs(now()->diffInSeconds(\Carbon\Carbon::parse($hb))) : null;
            $status = $diff === null ? 'warn' : ($diff <= 180 ? 'pass' : 'warn');
            $add($g, 'scheduler', 'Penjadwal otomatis', $status,
                $diff === null ? 'Belum pernah berjalan.' : 'Terakhir berjalan ' . \Carbon\Carbon::parse($hb)->diffForHumans() . '.',
                $status === 'pass' ? null : 'Jalankan pasang-penjadwal-windows.bat sekali (backup harian, auto-close sesi, sesi latihan).');
        }, $g, 'scheduler', 'Penjadwal otomatis');
        $safe(function () use ($add, $g) {
            $r = DataIntegrityAuditService::runFullAudit();
            $status = $r['critical_count'] > 0 ? 'fail' : ($r['warning_count'] > 0 ? 'warn' : 'pass');
            $add($g, 'integrity', 'Integritas data', $status,
                "{$r['critical_count']} masalah kritis, {$r['warning_count']} peringatan.",
                $status === 'pass' ? null : 'Buka Keamanan & Audit → Integritas Data.');
        }, $g, 'integrity', 'Integritas data');

        // ------------------------------------------------------------ Data master
        $g = 'Data Master';
        $inst = (array) AppSetting::get('institution');
        $instOk = filled($inst['name'] ?? null) && filled($inst['address'] ?? null);
        $add($g, 'institution', 'Identitas lembaga', $instOk ? 'pass' : 'warn',
            $instOk ? 'Nama & alamat lembaga terisi (muncul di kop laporan).' : 'Alamat lembaga belum diisi — kop laporan & kartu tidak lengkap.',
            $instOk ? null : 'Isi di Pengaturan → Identitas Lembaga.');
        $safe(function () use ($add, $g) {
            $year = AcademicYear::where('is_active', true)->first();
            $add($g, 'academic_year', 'Tahun ajaran aktif', $year ? 'pass' : 'fail',
                $year ? "Tahun ajaran aktif: {$year->name}." : 'Belum ada tahun ajaran yang aktif.', $year ? null : 'Buka Master Akademik → tab Tahun Ajaran, lalu tambah dan aktifkan tahun ajaran.');
        }, $g, 'academic_year', 'Tahun ajaran aktif');
        $safe(function () use ($add, $g) {
            $active = Student::where('is_active', true)->count();
            $add($g, 'students', 'Data santri', $active > 0 ? 'pass' : 'fail', "{$active} santri aktif.",
                $active ? null : 'Impor data santri (Master Santri → Impor Excel).');
            if ($active > 0) {
                $noClass = Student::where('is_active', true)->whereNull('classroom_id')->count();
                $add($g, 'students_class', 'Santri tanpa kelas', $noClass ? 'warn' : 'pass',
                    $noClass ? "{$noClass} santri aktif belum punya kelas (tidak ikut sesi berbasis kelas)." : 'Semua santri aktif punya kelas.',
                    $noClass ? 'Lengkapi kelas di Master Santri.' : null);
                $noCard = Student::where('is_active', true)->whereNull('qr_token')->whereNull('rfid_uid')->count();
                $add($g, 'students_card', 'Santri tanpa kartu', $noCard ? 'warn' : 'pass',
                    $noCard ? "{$noCard} santri aktif belum punya QR maupun RFID (hanya bisa diabsen manual)." : 'Semua santri aktif punya kartu QR/RFID.',
                    $noCard ? 'Buat & cetak kartu di Kartu Santri.' : null);
            }
        }, $g, 'students', 'Data santri');
        $safe(function () use ($add, $g) {
            $classes = Classroom::count();
            $add($g, 'classrooms', 'Kelas', $classes > 0 ? 'pass' : 'warn', "{$classes} kelas terdaftar.", $classes ? null : 'Buat kelas di Master Akademik.');
            $staff = StaffProfile::where('is_active', true)->count();
            $add($g, 'staff', 'Data SDM (guru & pegawai)', $staff > 0 ? 'pass' : 'warn', "{$staff} SDM aktif.", $staff ? null : 'Isi Master SDM.');
            if ($staff > 0) {
                $teachersNoLogin = StaffProfile::where('is_active', true)->where('staff_type', 'teacher')->whereNull('user_id')->count();
                $add($g, 'staff_login', 'Guru tanpa akun login', $teachersNoLogin ? 'warn' : 'pass',
                    $teachersNoLogin ? "{$teachersNoLogin} guru belum terhubung ke akun login (tidak bisa presensi mengajar mandiri)." : 'Semua guru terhubung ke akun.',
                    $teachersNoLogin ? 'Hubungkan akun di Master SDM.' : null);
            }
        }, $g, 'classrooms', 'Kelas & SDM');

        // ------------------------------------------------------------ Operasional
        $g = 'Operasional Presensi';
        $safe(function () use ($add, $g) {
            $acts = Activity::where('is_active', true)->count();
            $add($g, 'activities', 'Kegiatan presensi', $acts > 0 ? 'pass' : 'fail', "{$acts} kegiatan aktif.", $acts ? null : 'Buat kegiatan (shalat, KBM, asrama) di Timeline Rutin / Kegiatan.');
            $recent = AttendanceSession::where('session_date', '>=', today()->subDays(7))->count();
            $add($g, 'sessions', 'Sesi presensi 7 hari terakhir', $recent > 0 ? 'pass' : 'warn',
                $recent ? "{$recent} sesi dalam 7 hari terakhir." : 'Belum ada sesi presensi dalam 7 hari terakhir.',
                $recent ? null : 'Pastikan jadwal rutin aktif dan penjadwal berjalan.');
            $stale = AttendanceSession::where('status', 'open')->whereNotNull('end_at')->where('end_at', '<', now()->subHours(6))->count();
            $add($g, 'stale_sessions', 'Sesi lupa ditutup', $stale ? 'warn' : 'pass',
                $stale ? "{$stale} sesi masih dibuka lebih dari 6 jam setelah selesai." : 'Tidak ada sesi yang lupa ditutup.',
                $stale ? 'Aktifkan Auto-Close di Pengaturan → Aturan Absensi dan pasang penjadwal.' : null);
        }, $g, 'activities', 'Kegiatan & sesi');
        $safe(function () use ($add, $g) {
            $devices = AttendanceDevice::where('is_active', true)->count();
            if ($devices === 0) {
                $add($g, 'devices', 'Alat RFID', 'pass', 'Tidak ada alat RFID terdaftar (presensi memakai QR/manual).');
            } else {
                $online = AttendanceDevice::where('is_active', true)->where('last_seen_at', '>=', now()->subDay())->count();
                $add($g, 'devices', 'Alat RFID', $online === $devices ? 'pass' : 'warn', "{$online} dari {$devices} alat aktif terhubung dalam 24 jam terakhir.",
                    $online === $devices ? null : 'Periksa daya, jaringan, dan kunci alat yang tidak terhubung (Device Management).');
            }
            $pending = StudentExcusal::where('status', 'pending')->where('created_at', '<', now()->subDays(3))->count();
            $add($g, 'excusals', 'Izin santri menunggu persetujuan', $pending ? 'warn' : 'pass',
                $pending ? "{$pending} surat izin menunggu lebih dari 3 hari." : 'Tidak ada izin yang tertahan lama.', $pending ? 'Proses di menu Izin Santri.' : null);
        }, $g, 'devices', 'Alat & izin');

        $summary = ['pass' => 0, 'warn' => 0, 'fail' => 0];
        foreach ($checks as $c) {
            $summary[$c['status']]++;
        }
        $result = ['ran_at' => now()->toIso8601String(), 'summary' => $summary, 'ready' => $summary['fail'] === 0, 'checks' => $checks];

        return $result;
    }
}
