<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use App\Services\Security\AuditService;
use App\Services\System\SelfTestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * Go-Live & QA: uji kesiapan sistem (data sungguhan), hasil UAT per peran, persetujuan (sign-off),
 * dan catatan bug — semuanya disimpan di server. Sebelumnya halaman ini berisi hasil uji, nama penguji,
 * tanda tangan, dan bug rekaan yang tersimpan di browser.
 */
class GoLiveApiController extends Controller
{
    private const UAT_KEY = 'golive_uat_results';
    private const SIGN_KEY = 'golive_signoffs';
    private const BUG_KEY = 'golive_bugs';
    private const SELFTEST_KEY = 'golive_self_test_last';
    private const SEVERITIES = ['BLOCKER', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    private const BUG_STATUSES = ['OPEN', 'IN_PROGRESS', 'FIXED', 'RETEST', 'CLOSED', 'DEFERRED'];
    private const OPEN_STATUSES = ['OPEN', 'IN_PROGRESS', 'RETEST'];

    private static function templates(): array
    {
        static $t = null;

        return $t ??= json_decode((string) file_get_contents(resource_path('golive/uat-cases.json')), true) ?: ['cases' => [], 'signoff_roles' => []];
    }

    public function overview(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->state()]);
    }

    public function runSelfTest(Request $request): JsonResponse
    {
        @set_time_limit(300);
        $result = SelfTestService::run();
        $result['ran_by'] = $request->user()?->name;
        AppSetting::put(self::SELFTEST_KEY, $result, $request->user()?->id);
        AuditService::log(event: 'golive_self_test', newValues: $result['summary'], reason: 'Uji kesiapan sistem', userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => $result['ready']
            ? "Uji kesiapan selesai: {$result['summary']['pass']} lulus, {$result['summary']['warn']} perlu perhatian, tidak ada yang gagal."
            : "Uji kesiapan selesai: {$result['summary']['fail']} pemeriksaan GAGAL harus dibenahi.", 'data' => $result]);
    }

    public function recordUat(Request $request, string $caseId): JsonResponse
    {
        if (!collect(self::templates()['cases'])->firstWhere('id', $caseId)) {
            return ApiResponse::error('NOT_FOUND', 'Skenario UAT tidak dikenal.', null, 404);
        }
        $data = $request->validate([
            'status' => 'required|in:PASS,PASS_WITH_NOTE,FAIL,NOT_TESTED',
            'actual_result' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
        ]);
        if ($data['status'] === 'FAIL' && blank($data['actual_result'] ?? null)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Tuliskan hasil yang terjadi bila skenario GAGAL.', ['actual_result' => ['Wajib diisi untuk hasil GAGAL.']], 422);
        }

        $this->mutate(self::UAT_KEY, function (array $all) use ($caseId, $data, $request) {
            if ($data['status'] === 'NOT_TESTED') {
                unset($all[$caseId]);
            } else {
                $all[$caseId] = $data + ['tester_name' => $request->user()?->name, 'tested_at' => now()->toIso8601String()];
            }

            return $all;
        }, $request);
        AuditService::log(event: 'golive_uat_recorded', newValues: ['case' => $caseId, 'status' => $data['status']], reason: 'Hasil UAT', userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => "Hasil {$caseId} tersimpan.", 'data' => $this->state()]);
    }

    public function signOff(Request $request): JsonResponse
    {
        $roles = collect(self::templates()['signoff_roles'])->pluck('role')->all();
        $data = $request->validate([
            'role' => ['required', Rule::in($roles)],
            'status' => 'required|in:ACCEPTED,ACCEPTED_WITH_NOTES,REJECTED,WAITING',
            'representative_name' => 'required_unless:status,WAITING|nullable|string|max:120',
            'representative_title' => 'nullable|string|max:120',
            'notes' => 'required_if:status,ACCEPTED_WITH_NOTES,REJECTED|nullable|string|max:2000',
        ], [
            'representative_name.required_unless' => 'Nama perwakilan yang menyetujui wajib diisi.',
            'notes.required_if' => 'Tuliskan catatan / alasan.',
        ]);

        $this->mutate(self::SIGN_KEY, function (array $all) use ($data, $request) {
            if ($data['status'] === 'WAITING') {
                unset($all[$data['role']]);
            } else {
                $all[$data['role']] = $data + ['recorded_by' => $request->user()?->name, 'signed_at' => now()->toIso8601String()];
            }

            return $all;
        }, $request);
        AuditService::log(event: 'golive_signoff', newValues: ['role' => $data['role'], 'status' => $data['status'], 'name' => $data['representative_name'] ?? null],
            reason: 'Persetujuan go-live', userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => "Persetujuan {$data['role']} tersimpan.", 'data' => $this->state()]);
    }

    public function storeBug(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'module' => 'required|string|max:100',
            'severity' => ['required', Rule::in(self::SEVERITIES)],
            'repro_steps' => 'nullable|string|max:3000',
            'expected' => 'nullable|string|max:1000',
            'actual' => 'nullable|string|max:1000',
            'owner' => 'nullable|string|max:100',
        ], ['title.required' => 'Judul bug wajib diisi.']);

        $id = null;
        $this->mutate(self::BUG_KEY, function (array $all) use ($data, $request, &$id) {
            $next = 1 + collect($all)->map(fn ($b) => (int) substr($b['id'] ?? 'BUG-0', 4))->max();
            $id = 'BUG-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $all[] = $data + ['id' => $id, 'status' => 'OPEN', 'created_by' => $request->user()?->name, 'created_at' => now()->toIso8601String()];

            return $all;
        }, $request);

        return response()->json(['success' => true, 'message' => "Bug {$id} dicatat.", 'data' => $this->state()], 201);
    }

    public function updateBug(Request $request, string $bugId): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(self::BUG_STATUSES)],
            'notes' => 'nullable|string|max:2000',
            'workaround' => 'nullable|string|max:1000',
        ]);
        $found = false;
        $this->mutate(self::BUG_KEY, function (array $all) use ($bugId, $data, $request, &$found) {
            foreach ($all as &$b) {
                if (($b['id'] ?? null) === $bugId) {
                    $found = true;
                    $b = array_merge($b, array_filter($data, fn ($v) => $v !== null), [
                        'updated_by' => $request->user()?->name, 'updated_at' => now()->toIso8601String(),
                        'resolved_at' => in_array($data['status'], ['FIXED', 'CLOSED'], true) ? now()->toIso8601String() : null,
                    ]);
                }
            }

            return $all;
        }, $request);
        if (!$found) {
            return ApiResponse::error('NOT_FOUND', 'Bug tidak ditemukan.', null, 404);
        }

        return response()->json(['success' => true, 'message' => "Status {$bugId} diperbarui.", 'data' => $this->state()]);
    }

    // ------------------------------------------------------------------ helper

    /** Baca–ubah–simpan dengan kunci agar dua petugas yang menyimpan bersamaan tidak saling menimpa. */
    private function mutate(string $key, callable $fn, Request $request): void
    {
        Cache::lock("golive:$key", 10)->block(5, function () use ($key, $fn, $request) {
            Cache::forget("app_setting:$key");
            AppSetting::put($key, $fn((array) (AppSetting::get($key) ?? [])), $request->user()?->id);
        });
    }

    private function state(): array
    {
        $tpl = self::templates();
        $results = (array) (AppSetting::get(self::UAT_KEY) ?? []);
        $signs = (array) (AppSetting::get(self::SIGN_KEY) ?? []);
        $bugs = array_values((array) (AppSetting::get(self::BUG_KEY) ?? []));
        $self = AppSetting::get(self::SELFTEST_KEY);

        $cases = array_map(fn ($c) => $c + ($results[$c['id']] ?? ['status' => 'NOT_TESTED']), $tpl['cases']);
        $signoffs = array_map(fn ($r) => $r + ($signs[$r['role']] ?? ['status' => 'WAITING']), $tpl['signoff_roles']);

        $tested = count(array_filter($cases, fn ($c) => $c['status'] !== 'NOT_TESTED'));
        $failed = count(array_filter($cases, fn ($c) => $c['status'] === 'FAIL'));
        $accepted = count(array_filter($signoffs, fn ($s) => in_array($s['status'], ['ACCEPTED', 'ACCEPTED_WITH_NOTES'], true)));
        $rejected = count(array_filter($signoffs, fn ($s) => $s['status'] === 'REJECTED'));
        $openBlocking = count(array_filter($bugs, fn ($b) => in_array($b['status'] ?? '', self::OPEN_STATUSES, true) && in_array($b['severity'] ?? '', ['BLOCKER', 'CRITICAL'], true)));
        $selfAgeDays = $self ? abs(now()->diffInDays(\Carbon\Carbon::parse($self['ran_at']))) : null;

        $gates = [
            ['id' => 'self_test', 'label' => 'Uji kesiapan sistem tanpa kegagalan (≤ 7 hari terakhir)',
                'passed' => $self && ($self['summary']['fail'] ?? 1) === 0 && $selfAgeDays <= 7,
                'detail' => $self ? 'Terakhir ' . \Carbon\Carbon::parse($self['ran_at'])->format('d/m/Y H:i') . ": {$self['summary']['fail']} gagal, {$self['summary']['warn']} perhatian." : 'Belum pernah dijalankan.'],
            ['id' => 'uat', 'label' => 'Semua skenario UAT diuji tanpa GAGAL',
                'passed' => $tested === count($cases) && $failed === 0 && count($cases) > 0,
                'detail' => "{$tested}/" . count($cases) . " diuji, {$failed} gagal."],
            ['id' => 'bugs', 'label' => 'Tidak ada bug BLOCKER/CRITICAL yang masih terbuka',
                'passed' => $openBlocking === 0, 'detail' => "{$openBlocking} bug blocker/critical terbuka."],
            ['id' => 'signoff', 'label' => 'Persetujuan semua perwakilan',
                'passed' => $accepted === count($signoffs) && count($signoffs) > 0,
                'detail' => "{$accepted}/" . count($signoffs) . ' menyetujui' . ($rejected ? ", {$rejected} menolak" : '') . '.'],
        ];

        return [
            'self_test' => $self,
            'cases' => $cases,
            'signoffs' => $signoffs,
            'bugs' => $bugs,
            'gates' => $gates,
            'ready' => collect($gates)->every(fn ($g) => $g['passed']),
        ];
    }
}
