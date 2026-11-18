<?php

use App\Models\SystemBackup;
use App\Services\Security\DataIntegrityAuditService;
use App\Services\System\BackupService;
use App\Services\System\RestoreService;
use App\Services\System\SystemHealthService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('system:audit-integrity', function () {
    $this->info('Memulai Audit Integritas Data Presensi & Master SIUBA...');
    $result = DataIntegrityAuditService::runFullAudit();

    $fgColor = $result['status'] === 'PASS' ? 'green' : 'red';
    $this->line("Status: <fg={$fgColor}>{$result['status']}</>");
    $this->line("Critical Issues : {$result['critical_count']}");
    $this->line("Warning Issues  : {$result['warning_count']}");
    $this->line("Info Issues     : {$result['info_count']}");

    if (!empty($result['issues'])) {
        $this->table(
            ['Tipe', 'Severity', 'Deskripsi', 'Entitas'],
            array_map(fn($i) => [$i['type'], $i['severity'], $i['description'], $i['entity_type']], $result['issues'])
        );
    } else {
        $this->info('✓ Integritas Data Sempurna (0 Konflik / 0 Duplikat).');
    }
})->purpose('Audit seluruh integritas data, relasi presensi, dan keunikan kredensial IoT');

Artisan::command('system:backup {--type=database} {--notes=} {--if-older-than= : Lewati bila backup terakhir lebih baru dari N jam}', function () {
    $type = $this->option('type') ?: 'database';
    $notes = $this->option('notes') ?: 'Backup otomatis';
    $hours = $this->option('if-older-than');
    if ($hours !== null && $hours !== '') {
        $last = SystemBackup::where('status', 'verified')->latest('created_at')->first();
        if ($last && $last->created_at->gt(now()->subHours((int) $hours))) {
            $this->line("Backup terakhir {$last->created_at->diffForHumans()} — tidak perlu backup baru.");
            return 0;
        }
    }

    $this->info("Menjalankan backup sistem ({$type})...");
    try {
        $backup = BackupService::createBackup($type, $notes);
        $this->info("✓ Backup Berhasil Terverifikasi: {$backup->backup_id}");
        $this->line("  File     : storage/app/backups/{$backup->filename}");
        $this->line("  Ukuran   : " . round($backup->size / 1024, 2) . " KB");
        $this->line("  Isi      : {$backup->notes}");
    } catch (\Throwable $e) {
        $this->error("✗ Backup Gagal: " . $e->getMessage());
        return 1;
    }
    return 0;
})->purpose('Membuat berkas cadangan database/metadata terverifikasi');

Artisan::command('system:restore {--backup-id=} {--reason=}', function () {
    $backupId = $this->option('backup-id');
    $reason = $this->option('reason') ?: 'Manual CLI Restoration';

    if (!$backupId) {
        $this->error('Parameter --backup-id wajib diisi.');
        return;
    }

    $backup = SystemBackup::where('backup_id', $backupId)->first();
    if (!$backup) {
        $this->error("Catatan backup dengan ID {$backupId} tidak ditemukan.");
        return;
    }

    $this->warn("PERINGATAN: Restorasi akan menimpa basis data aktif dengan backup {$backupId}.");
    if (!$this->confirm('Apakah Anda yakin ingin melanjutkan restorasi?')) {
        $this->line('Restorasi dibatalkan.');
        return;
    }

    $this->info("Memulai restorasi dari backup {$backupId}...");
    try {
        $result = RestoreService::restoreFromBackup($backup, $reason);
        $this->info("✓ Restorasi Sukses! Snapshot pengaman: {$result['safety_backup_id']}");
        $this->line("  Status Integritas Pasca-Restore: {$result['integrity_result']['status']}");
    } catch (\Throwable $e) {
        $this->error("✗ Restorasi Gagal: " . $e->getMessage());
    }
})->purpose('Me-restore data dari berkas backup terverifikasi');

Artisan::command('system:health', function () {
    $this->info('Pemeriksaan Kesehatan Sistem (SIUBA Health Monitor)...');
    $report = SystemHealthService::getHealthReport();

    $statusFg = $report['status'] === 'healthy' ? 'green' : ($report['status'] === 'warning' ? 'yellow' : 'red');
    $this->line("Status Umum: <fg={$statusFg}>" . strtoupper($report['status']) . "</>");
    $this->line("Versi App  : {$report['app_version']}");
    $this->line("Lingkungan : {$report['environment']} (Debug: " . ($report['debug_mode'] ? 'ON' : 'OFF') . ")");

    $rows = [];
    foreach ($report['checks'] as $key => $check) {
        $rows[] = [$check['label'], strtoupper($check['status']), $check['message']];
    }
    $this->table(['Komponen', 'Status', 'Keterangan'], $rows);
})->purpose('Memeriksa status konektivitas, kapasitas storage, scheduler, dan kesehatan perangkat IoT');

Artisan::command('siuba:devices', function () {
    $rows = \App\Models\AttendanceDevice::orderBy('device_code')->get()->map(fn ($d) => [
        $d->id, $d->device_code, $d->device_name, $d->location ?? '-',
        $d->is_active ? 'AKTIF' : 'MENUNGGU/NONAKTIF', $d->ip_address ?? '-', $d->last_seen_at?->format('Y-m-d H:i:s') ?? '-',
    ]);
    $this->table(['ID', 'Kode', 'Nama', 'Lokasi', 'Status', 'IP', 'Terakhir Terlihat'], $rows->all());
})->purpose('Daftar perangkat RFID/ESP32 beserta status aktivasinya');

Artisan::command('siuba:device-activate {code} {--name=} {--location=}', function () {
    $device = \App\Models\AttendanceDevice::where('device_code', $this->argument('code'))->first();
    if (!$device) {
        $this->error('Perangkat tidak ditemukan. Nyalakan alat agar melakukan ping/tap sekali, lalu cek dengan: php artisan siuba:devices');
        return 1;
    }
    $device->is_active = true;
    if ($this->option('name')) $device->device_name = $this->option('name');
    if ($this->option('location')) $device->location = $this->option('location');
    $device->save();
    $this->info("✓ Perangkat {$device->device_code} sekarang AKTIF.");
    return 0;
})->purpose('Aktifkan perangkat RFID agar boleh mengirim tap');

Artisan::command('siuba:device-deactivate {code}', function () {
    $updated = \App\Models\AttendanceDevice::where('device_code', $this->argument('code'))->update(['is_active' => false]);
    $updated ? $this->info('✓ Perangkat dinonaktifkan.') : $this->error('Perangkat tidak ditemukan.');
    return $updated ? 0 : 1;
})->purpose('Nonaktifkan perangkat RFID (tap dari alat ini akan ditolak)');

Artisan::command('attendance:auto-open', function () {
    $r = app(\App\Services\Attendance\SessionService::class)->autoOpenDue();
    $this->line($r['opened'] ? "{$r['opened']} sesi dibuka otomatis: " . implode(', ', $r['sessions']) : 'Tidak ada sesi yang perlu dibuka.');
    return 0;
})->purpose('Buka sesi absensi dari Jadwal Rutin saat jam mulai tiba (Pengaturan → Aturan Absensi)');

Artisan::command('attendance:auto-close {--minutes= : Abaikan pengaturan dan pakai N menit}', function () {
    $minutes = $this->option('minutes');
    $result = app(\App\Services\Attendance\SessionService::class)->autoCloseExpired($minutes !== null && $minutes !== '' ? (int) $minutes : null);
    if ($result['closed'] === 0) {
        $this->line('Tidak ada sesi yang perlu ditutup otomatis.');
        return 0;
    }
    $this->info("✓ {$result['closed']} sesi ditutup otomatis; {$result['finalized']} peserta ditandai Alpa / sesuai izin.");
    foreach ($result['sessions'] as $code) {
        $this->line("  - {$code}");
    }
    return 0;
})->purpose('Tutup sesi absensi yang sudah lewat waktu selesai + N menit (Pengaturan → Aturan Absensi → Auto-Close)');

Artisan::command('siuba:bersihkan-aset', function () {
    // Paket update (ZIP) menambah berkas index-*.js/css baru tetapi tidak menghapus yang lama.
    // Hapus berkas aset yang tidak lagi dirujuk public/app.html.
    $html = @file_get_contents(public_path('app.html')) ?: '';
    $used = [];
    if (preg_match_all('#/assets/([A-Za-z0-9_\-]+\.(?:js|css))#', $html, $m)) {
        $used = array_unique($m[1]);
    }
    if (count($used) < 2) {
        $this->warn('Berkas app.html tidak merujuk aset yang dikenali; tidak ada yang dihapus.');
        return 0;
    }
    $removed = 0;
    foreach (array_merge(glob(public_path('assets/index-*.js')) ?: [], glob(public_path('assets/index-*.css')) ?: []) as $file) {
        if (!in_array(basename($file), $used, true) && @unlink($file)) {
            $removed++;
        }
    }
    $this->line($removed ? "✓ {$removed} berkas aset lama dihapus." : 'Tidak ada aset lama.');
    return 0;
})->purpose('Hapus berkas tampilan (JS/CSS) lama yang tertinggal dari update sebelumnya');

// Tahap 30: sesi presensi rutin (asrama/shalat/dll.) & KBM dibuat otomatis dari jadwal — dulu hanya lewat tombol.
// Aman diulang: sesi yang sudah ada dilewati; KBM dilewati pada hari libur kalender akademik.
Artisan::command('attendance:generate-sessions {--date= : Tanggal awal (YYYY-MM-DD), bawaan hari ini} {--days=1 : Jumlah hari}', function () {
    $start = $this->option('date') ? \Carbon\Carbon::parse($this->option('date'), 'Asia/Jakarta') : today('Asia/Jakarta');
    $days = max(1, min(14, (int) $this->option('days')));
    $routine = app(\App\Services\Routine\RoutineSessionGenerator::class);
    $kbm = app(\App\Services\Academic\AcademicSessionGenerator::class);
    $hasYear = \App\Models\AcademicYear::where('is_active', true)->exists();
    for ($i = 0; $i < $days; $i++) {
        $d = $start->copy()->addDays($i);
        $parts = [];
        try {
            $r = $routine->generateForDate($d->copy());
            $parts[] = 'rutin ' . (int) ($r['sessions_created'] ?? 0) . ' baru';
        } catch (\Throwable $e) {
            report($e);
            $parts[] = 'rutin GAGAL: ' . $e->getMessage();
        }
        if ($hasYear) {
            try {
                $r = $kbm->generateForDate($d->copy());
                $parts[] = !empty($r['is_holiday']) ? 'KBM libur' : 'KBM ' . (int) ($r['sessions_created'] ?? 0) . ' baru';
            } catch (\Throwable $e) {
                report($e);
                $parts[] = 'KBM GAGAL: ' . $e->getMessage();
            }
        } else {
            $parts[] = 'KBM dilewati (belum ada tahun ajaran aktif)';
        }
        $this->line("{$d->toDateString()}: " . implode(', ', $parts));
    }
    return 0;
})->purpose('Buat sesi presensi rutin & KBM dari jadwal (aman diulang)');

Artisan::command('trainer:generate {--date= : Tanggal (YYYY-MM-DD), bawaan hari ini}', function () {
    $date = $this->option('date') ? \Carbon\Carbon::parse($this->option('date')) : today();
    $r = \App\Http\Controllers\Api\TrainerApiController::generateFor($date);
    if (!empty($r['is_holiday'])) {
        $this->line("Tanggal {$r['date']} libur ({$r['holiday_name']}); sesi latihan tidak dibuat.");
        return 0;
    }
    $this->info("✓ {$r['date']}: {$r['sessions_created']} sesi latihan dibuat, {$r['sessions_existing']} sudah ada (dari {$r['schedules_found']} jadwal).");
    return 0;
})->purpose('Buat sesi latihan ekskul dari jadwal mingguan');

Artisan::command('trainer:finalize {--date= : Tanggal (YYYY-MM-DD), bawaan kemarin}', function () {
    $date = $this->option('date') ?: today()->subDay()->toDateString();
    $n = \App\Http\Controllers\Api\TrainerApiController::finalizeFor($date);
    $this->info("✓ {$date}: {$n} sesi latihan tanpa presensi pelatih ditandai alpa.");
    return 0;
})->purpose('Tandai alpa pelatih yang tidak presensi pada sesi latihan yang sudah lewat');

// Bersihkan log perangkat > 60 hari setiap malam (butuh cron: * * * * * php artisan schedule:run)
Schedule::command('model:prune', ['--model' => [\App\Models\AttendanceDeviceLog::class, \App\Models\AuditLog::class]])->dailyAt('02:15');

// Backup database harian (bila server memakai cron / Task Scheduler). Di XAMPP, start-siuba-offline.bat juga
// membuat backup saat aplikasi dinyalakan bila backup terakhir lebih dari 20 jam lalu.
Schedule::command('system:backup', ['--notes' => 'Backup harian terjadwal', '--if-older-than' => 20])->dailyAt('01:30');

// Tanda penjadwal hidup (ditampilkan di Maintenance Hub → Status)
Schedule::call(fn () => \App\Services\System\SystemHealthService::recordSchedulerHeartbeat())->everyMinute()->name('siuba-heartbeat')->withoutOverlapping();

// Tutup otomatis sesi absensi yang sudah lewat waktu selesai + N menit (0 = nonaktif)
Schedule::command('attendance:auto-close')->everyFiveMinutes()->withoutOverlapping();
// Buka otomatis sesi dari Jadwal Rutin saat jam mulai tiba
Schedule::command('attendance:auto-open')->everyMinute()->withoutOverlapping();

// Sesi latihan ekskul hari ini dibuat otomatis dari jadwal mingguan; latihan kemarin difinalisasi
// Sesi hari ini & besok; tiap jam agar tetap terbuat walau komputer server baru dinyalakan siang hari
Schedule::command('attendance:generate-sessions', ['--days' => 2])->hourlyAt(3)->withoutOverlapping();
Schedule::command('trainer:generate')->dailyAt('00:20')->withoutOverlapping();
Schedule::command('trainer:finalize')->dailyAt('00:40')->withoutOverlapping();

// Akun contoh bawaan versi lama: hapus yang tidak terpakai, nonaktifkan yang pernah dipakai (aman diulang)
Artisan::command('siuba:hapus-akun-contoh {--dry-run : Hanya tampilkan, jangan ubah apa pun}', function () {
    $r = app(\App\Services\System\ExampleAccountCleanup::class)->run((bool) $this->option('dry-run'));
    if (!$r['deleted'] && !$r['deactivated']) {
        $this->line('Akun contoh: tidak ada yang perlu dibersihkan.');
        return 0;
    }
    $pre = $this->option('dry-run') ? '[uji] ' : '';
    foreach ($r['deleted'] as $u) $this->info("{$pre}Akun contoh dihapus: {$u}");
    foreach ($r['deactivated'] as $u => $why) $this->warn("{$pre}Akun contoh dinonaktifkan (pernah dipakai: {$why}): {$u}");
    return 0;
})->purpose('Hapus akun contoh bawaan yang tidak terpakai; nonaktifkan yang pernah dipakai');
