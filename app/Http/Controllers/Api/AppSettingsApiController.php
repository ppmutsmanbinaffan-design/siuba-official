<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Pengaturan Sistem: identitas lembaga, aturan absensi, desain kartu santri, info server (baca saja),
 * dan bersihkan cache. Sebelumnya halaman Pengaturan hanya menyimpan ke browser dan beberapa tombolnya simulasi.
 */
class AppSettingsApiController extends Controller
{
    /** Identitas lembaga untuk halaman login, kop laporan, dan kartu (tanpa login; tidak berisi data rahasia). */
    public function publicInstitution(): JsonResponse
    {
        $i = AppSetting::get('institution');

        return response()->json(['success' => true, 'data' => array_intersect_key($i, array_flip([
            'foundation_name', 'name', 'short_name', 'slogan', 'address', 'phone', 'email', 'website', 'city', 'leader_name', 'leader_title',
        ]))]);
    }

    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => [
            'institution' => AppSetting::get('institution'),
            'attendance' => AppSetting::get('attendance'),
            'security' => AppSetting::get('security'),
        ]]);
    }

    /** Kebijakan keamanan (izin system.security_audit). */
    public function updateSecurity(Request $request): JsonResponse
    {
        return $this->update($request, 'security');
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $rules = match ($key) {
            'institution' => [
                'foundation_name' => 'nullable|string|max:150', 'name' => 'required|string|max:150', 'short_name' => 'nullable|string|max:60',
                'slogan' => 'nullable|string|max:200', 'address' => 'nullable|string|max:300', 'phone' => 'nullable|string|max:40',
                'email' => 'nullable|email|max:120', 'website' => 'nullable|string|max:150', 'leader_name' => 'nullable|string|max:120',
                'leader_title' => 'nullable|string|max:80', 'city' => 'nullable|string|max:80',
                'active_academic_year' => 'nullable|string|max:20', 'active_semester' => 'nullable|string|max:20', 'time_format' => 'nullable|in:24h,12h',
            ],
            'attendance' => [
                'late_tolerance_minutes' => 'required|integer|min:0|max:120', 'auto_close_session_minutes' => 'required|integer|min:0|max:600',
                'rfid_debounce_seconds' => 'required|integer|min:0|max:300', 'allow_self_excusal' => 'boolean',
                'enable_kiosk_fullscreen' => 'boolean', 'enable_audio_chime' => 'boolean',
            ],
            'security' => [
                'session_timeout_minutes' => 'required|integer|min:0|max:1440',
                'max_login_attempts_before_lockout' => 'required|integer|min:3|max:20',
                'lockout_duration_minutes' => 'required|integer|min:1|max:1440',
                'min_password_length' => 'required|integer|min:6|max:64',
                'require_numbers' => 'boolean',
                'require_special_char' => 'boolean',
                'allow_concurrent_sessions' => 'boolean',
                'audit_retention_days' => 'required|integer|min:30|max:3650',
            ],
            default => null,
        };
        if ($rules === null) {
            return ApiResponse::error('UNKNOWN_SETTING', 'Jenis pengaturan tidak dikenal.', null, 404);
        }
        $data = $request->validate($rules, ['name.required' => 'Nama lembaga wajib diisi.']);
        $old = AppSetting::get($key);
        AppSetting::put($key, array_merge($old, $data), $request->user()?->id);
        if ($key === 'security') {
            \App\Services\Security\AuditService::log(event: 'security_policy_updated', auditableType: 'SecurityPolicy', auditableId: 0,
                oldValues: $old, newValues: AppSetting::get('security'), reason: 'Perubahan kebijakan keamanan', userId: $request->user()?->id);
        }

        return response()->json(['success' => true, 'message' => 'Pengaturan tersimpan di server dan berlaku untuk semua perangkat.', 'data' => AppSetting::get($key)]);
    }

    // ================================================================== Desain kartu santri

    public function cardTemplates(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => AppSetting::get('student_card_templates')]);
    }

    public function saveCardTemplates(Request $request): JsonResponse
    {
        $request->validate(['templates' => 'present|array|max:50', 'templates.*.id' => 'required']);
        $templates = $request->input('templates'); // validate() hanya menyisakan kolom yang punya aturan
        $data = ['templates' => $templates];
        $json = json_encode($templates, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 7 * 1024 * 1024) {
            return ApiResponse::error('TEMPLATES_TOO_LARGE', 'Desain kartu terlalu besar (gambar latar terlalu besar). Kecilkan ukuran gambar lalu simpan lagi.', null, 413);
        }
        AppSetting::put('student_card_templates', $data['templates'], $request->user()?->id);

        return response()->json(['success' => true, 'message' => 'Desain kartu tersimpan di server.']);
    }

    // ================================================================== Info server & cache

    public function systemInfo(): JsonResponse
    {
        $driver = DB::connection()->getDriverName();
        try {
            $dbVersion = match ($driver) {
                'mysql', 'mariadb' => DB::selectOne('select version() as v')->v,
                'sqlite' => 'SQLite ' . DB::selectOne('select sqlite_version() as v')->v,
                default => $driver,
            };
        } catch (\Throwable) {
            $dbVersion = $driver;
        }
        $ips = array_values(array_filter((array) @gethostbynamel(gethostname()), fn ($ip) => $ip !== '127.0.0.1'));

        return response()->json(['success' => true, 'data' => [
            'app_name' => config('app.name'),
            'app_env' => config('app.env'),
            'app_debug' => (bool) config('app.debug'),
            'app_url' => config('app.url'),
            'timezone' => config('app.timezone'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'db_driver' => $driver,
            'db_version' => $dbVersion,
            'db_database' => DB::connection()->getDatabaseName(),
            'cache_driver' => config('cache.default'),
            'session_driver' => config('session.driver'),
            'queue_driver' => config('queue.default'),
            'log_level' => config('logging.channels.' . config('logging.default') . '.level', 'debug'),
            'server_ips' => $ips,
            'server_hostname' => gethostname(),
            'iot_key_configured' => strlen((string) config('services.nexabsen.key')) >= 32,
            'server_time' => now()->toIso8601String(),
        ]]);
    }

    public function clearCache(Request $request): JsonResponse
    {
        $type = $request->validate(['type' => 'required|in:app,data'])['type'];
        if ($type === 'app') {
            Artisan::call('optimize:clear');
            $msg = 'Cache konfigurasi, rute, dan tampilan server dibersihkan.';
        } else {
            Artisan::call('cache:clear');
            Artisan::call('permission:cache-reset');
            $msg = 'Cache data & hak akses server dibersihkan.';
        }

        return response()->json(['success' => true, 'message' => $msg]);
    }
}
