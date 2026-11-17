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

// Bersihkan log perangkat > 60 hari setiap malam (butuh cron: * * * * * php artisan schedule:run)
Schedule::command('model:prune', ['--model' => [\App\Models\AttendanceDeviceLog::class, \App\Models\AuditLog::class]])->dailyAt('02:15');

// Backup database harian (bila server memakai cron / Task Scheduler). Di XAMPP, start-siuba-offline.bat juga
// membuat backup saat aplikasi dinyalakan bila backup terakhir lebih dari 20 jam lalu.
Schedule::command('system:backup', ['--notes' => 'Backup harian terjadwal', '--if-older-than' => 20])->dailyAt('01:30');

// Tanda penjadwal hidup (ditampilkan di Maintenance Hub → Status)
Schedule::call(fn () => \App\Services\System\SystemHealthService::recordSchedulerHeartbeat())->everyMinute()->name('siuba-heartbeat')->withoutOverlapping();
