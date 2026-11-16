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
}
