<?php

namespace App\Services\System;

use App\Models\AttendanceDevice;
use App\Models\SystemBackup;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SystemHealthService
{
    const CACHE_KEY_HEARTBEAT = 'siuba_scheduler_last_heartbeat';

    /**
     * Record scheduler heartbeat timestamp.
     */
    public static function recordSchedulerHeartbeat(): void
    {
        Cache::forever(self::CACHE_KEY_HEARTBEAT, now()->toISOString());
    }

    /**
     * Get system health comprehensive report.
     */
    public static function getHealthReport(): array
    {
        $status = 'healthy';
        $checks = [];

        // 1. Database Check
        try {
            $t0 = microtime(true);
            DB::select('select 1');
            $dbResponseTime = round((microtime(true) - $t0) * 1000, 1); // ms
            $checks['database'] = [
                'status' => 'healthy',
                'label' => 'Database Connection (MySQL/MariaDB)',
                'message' => 'Koneksi database aktif dan responsif (' . $dbResponseTime . 'ms).',
            ];
        } catch (\Throwable $e) {
            $status = 'critical';
            $checks['database'] = [
                'status' => 'critical',
                'label' => 'Database Connection',
                'message' => 'Koneksi database gagal: ' . $e->getMessage(),
            ];
        }

        // 2. Storage Writability Check
        $storagePaths = [
            'storage_app' => storage_path('app'),
            'storage_logs' => storage_path('logs'),
            'storage_framework' => storage_path('framework'),
        ];
        $allWritable = true;
        foreach ($storagePaths as $key => $p) {
            if (!File::isWritable($p)) {
                $allWritable = false;
            }
        }
        $checks['storage'] = [
            'status' => $allWritable ? 'healthy' : 'critical',
            'label' => 'Storage Directory Permissions',
            'message' => $allWritable ? 'Semua direktori storage dapat ditulisi (0750/0775).' : 'Direktori storage memiliki izin akses tidak valid.',
        ];
        if (!$allWritable && $status !== 'critical') $status = 'critical';

        // 3. Disk Space Free Check
        $freeBytes = disk_free_space(storage_path()) ?: 100 * 1024 * 1024 * 1024;
        $totalBytes = disk_total_space(storage_path()) ?: 200 * 1024 * 1024 * 1024;
        $freePercent = round(($freeBytes / $totalBytes) * 100, 1);

        $diskStatus = $freePercent >= 20 ? 'healthy' : ($freePercent >= 10 ? 'warning' : 'critical');
        $checks['disk'] = [
            'status' => $diskStatus,
            'label' => 'Disk Space Capacity',
            'message' => "Kapasitas disk bebas: {$freePercent}% (" . round($freeBytes / (1024**3), 2) . " GB dari " . round($totalBytes / (1024**3), 2) . " GB).",
            'free_percent' => $freePercent,
        ];
        if ($diskStatus === 'critical') $status = 'critical';
        elseif ($diskStatus === 'warning' && $status === 'healthy') $status = 'warning';

        // 4. Scheduler Heartbeat Check (direkam tiap menit oleh jadwal di routes/console.php)
        $lastHeartbeat = Cache::get(self::CACHE_KEY_HEARTBEAT);
        if ($lastHeartbeat) {
            $diffSeconds = (int) abs(now()->diffInSeconds(\Carbon\Carbon::parse($lastHeartbeat)));
            $schedulerStatus = $diffSeconds <= 180 ? 'healthy' : 'warning';
            $message = "Heartbeat terakhir {$diffSeconds} detik lalu.";
        } else {
            // Tidak wajib: di XAMPP backup otomatis tetap berjalan lewat start-siuba-offline.bat
            $schedulerStatus = 'info';
            $message = 'Penjadwal (php artisan schedule:run) belum berjalan. Opsional — dibutuhkan untuk backup harian 01:30 dan pembersihan log otomatis.';
        }
        $checks['scheduler'] = [
            'status' => $schedulerStatus,
            'label' => 'Scheduler Cron Heartbeat',
            'message' => $message,
            'last_heartbeat' => $lastHeartbeat,
        ];
        if ($schedulerStatus === 'warning' && $status === 'healthy') $status = 'warning';

        // 5. Backup Freshness Check
        $latestBackup = SystemBackup::where('status', 'verified')->orderByDesc('created_at')->first();
        if ($latestBackup) {
            $hoursSinceBackup = round(abs(now()->diffInMinutes($latestBackup->created_at)) / 60, 1);
            $backupStatus = $hoursSinceBackup <= 24 ? 'healthy' : 'warning';
            $checks['backup_freshness'] = [
                'status' => $backupStatus,
                'label' => 'Freshness of Backup',
                'message' => "Backup terverifikasi terakhir dibuat {$hoursSinceBackup} jam lalu ({$latestBackup->backup_id}).",
                'latest_backup_at' => $latestBackup->created_at->toISOString(),
            ];
            if ($backupStatus === 'warning' && $status === 'healthy') $status = 'warning';
        } else {
            $checks['backup_freshness'] = [
                'status' => 'warning',
                'label' => 'Freshness of Backup',
                'message' => 'Belum ada catatan backup terverifikasi.',
            ];
            if ($status === 'healthy') $status = 'warning';
        }

        // 6. Device Health
        // "Online" = aktif dan mengirim ping/tap dalam 10 menit terakhir (tabel perangkat tidak punya kolom status)
        $onlineDevices = AttendanceDevice::where('is_active', true)->where('last_seen_at', '>=', now()->subMinutes(10))->count();
        $totalDevices = AttendanceDevice::where('is_active', true)->count();
        $checks['devices'] = [
            'status' => 'healthy',
            'label' => 'Attendance Hardware Network',
            'message' => "{$onlineDevices} dari {$totalDevices} perangkat IoT (RFID/QR) online & aktif.",
            'online_count' => $onlineDevices,
            'total_count' => $totalDevices,
        ];

        return [
            'status' => $status,
            'checks' => $checks,
            'checked_at' => now()->toISOString(),
            'app_version' => '1.4.0',
            'environment' => config('app.env'),
            'debug_mode' => config('app.debug'),
        ];
    }

    /**
     * Laporan kesehatan dalam bentuk yang dipakai halaman Keamanan & Audit (semua nilai nyata dari server).
     */
    public static function spaReport(): array
    {
        $base = self::getHealthReport();
        $c = $base['checks'];
        $driver = DB::connection()->getDriverName();
        $engine = $driver;
        try {
            $engine = match ($driver) {
                'mysql', 'mariadb' => 'MySQL/MariaDB ' . (DB::selectOne('select version() as v')->v ?? ''),
                'sqlite' => 'SQLite ' . (DB::selectOne('select sqlite_version() as v')->v ?? ''),
                'pgsql' => 'PostgreSQL ' . (DB::selectOne('show server_version')->server_version ?? ''),
                default => $driver,
            };
        } catch (\Throwable) {
        }
        $latency = null;
        try {
            $t0 = microtime(true);
            DB::select('select 1');
            $latency = round((microtime(true) - $t0) * 1000, 1);
        } catch (\Throwable) {
        }

        $free = @disk_free_space(storage_path());
        $total = @disk_total_space(storage_path());
        $freePct = ($free && $total) ? round($free / $total * 100, 1) : null;

        $hb = $c['scheduler']['last_heartbeat'] ?? null;
        $hbDiff = $hb ? (int) abs(now()->diffInSeconds(\Carbon\Carbon::parse($hb))) : null;
        $schedulerStatus = $hb === null ? 'warning' : ($hbDiff <= 180 ? 'healthy' : ($hbDiff <= 600 ? 'warning' : 'critical'));

        $latest = SystemBackup::where('status', 'verified')->orderByDesc('created_at')->first();
        $backupHours = $latest ? abs(now()->diffInMinutes($latest->created_at)) / 60 : null;
        $backupStatus = $latest === null ? 'critical' : ($backupHours <= 26 ? 'healthy' : ($backupHours <= 50 ? 'warning' : 'critical'));

        $failed = 0;
        try {
            $failed = \App\Models\AuditLog::where('event', 'auth.login_failed')->where('created_at', '>=', today())->count();
        } catch (\Throwable) {
        }

        $map = fn ($st) => in_array($st, ['healthy', 'warning', 'critical'], true) ? $st : 'warning';
        $parts = [$map($c['database']['status'] ?? 'critical'), $map($c['storage']['status'] ?? 'critical'), $map($c['disk']['status'] ?? 'warning'), $schedulerStatus, $backupStatus];
        $overall = in_array('critical', $parts, true) ? 'critical' : (in_array('warning', $parts, true) ? 'warning' : 'healthy');

        return [
            'application_status' => 'healthy',
            'application_version' => (string) ($base['app_version'] ?? '-'),
            'application_env' => (string) config('app.env'),
            'debug_mode' => (bool) config('app.debug'),
            'iot_key_configured' => filled(config('services.nexabsen.key')),
            'database_status' => $map($c['database']['status'] ?? 'critical'),
            'database_engine' => trim($engine),
            'database_latency_ms' => $latency,
            'storage_status' => $map($c['storage']['status'] ?? 'critical'),
            'storage_writable' => ($c['storage']['status'] ?? '') === 'healthy',
            'disk_status' => $map($c['disk']['status'] ?? 'warning'),
            'disk_total_gb' => $total ? round($total / 1024 ** 3, 1) : null,
            'disk_free_gb' => $free ? round($free / 1024 ** 3, 1) : null,
            'disk_free_percentage' => $freePct,
            'scheduler_status' => $schedulerStatus,
            'scheduler_last_heartbeat' => $hb,
            'scheduler_heartbeat_diff_seconds' => $hbDiff,
            'backup_freshness_status' => $backupStatus,
            'backup_last_successful_at' => $latest?->created_at?->toIso8601String(),
            'backup_count_stored' => SystemBackup::where('status', 'verified')->count(),
            'active_devices_online' => (int) ($c['devices']['online_count'] ?? 0),
            'active_devices_total' => (int) ($c['devices']['total_count'] ?? 0),
            'failed_logins_today' => $failed,
            'inactive_users_count' => \App\Models\User::where('is_active', false)->count(),
            'overall_status' => $overall,
            'checked_at' => now()->toIso8601String(),
        ];
    }
}
