<?php

use App\Models\SystemBackup;
use App\Services\Security\DataIntegrityAuditService;
use App\Services\System\BackupService;
use App\Services\System\RestoreService;
use App\Services\System\SystemHealthService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

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

Artisan::command('system:backup {--type=database} {--notes=}', function () {
    $type = $this->option('type') ?: 'database';
    $notes = $this->option('notes') ?: 'Manual CLI Backup';

    $this->info("Menjalankan backup sistem ({$type})...");
    try {
        $backup = BackupService::createBackup($type, $notes);
        $this->info("✓ Backup Berhasil Terverifikasi: {$backup->backup_id}");
        $this->line("  File     : {$backup->filename}");
        $this->line("  Ukuran   : " . round($backup->size / 1024, 2) . " KB");
        $this->line("  SHA-256  : {$backup->checksum}");
    } catch (\Throwable $e) {
        $this->error("✗ Backup Gagal: " . $e->getMessage());
    }
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
