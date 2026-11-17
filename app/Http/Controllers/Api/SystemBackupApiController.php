<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\SystemBackup;
use App\Services\System\BackupService;
use App\Services\System\RestoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Pusat Backup di halaman Pemeliharaan (sebelumnya "backup" hanya disimpan di browser, bukan database). */
class SystemBackupApiController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = SystemBackup::with('creator')->orderByDesc('created_at')->orderByDesc('id')->limit(100)->get()->map(fn (SystemBackup $b) => [
            'id' => $b->id, 'backup_id' => $b->backup_id, 'filename' => $b->filename, 'size' => (int) $b->size,
            'status' => $b->status, 'notes' => $b->notes, 'created_at' => $b->created_at?->toIso8601String(),
            'created_by' => $b->creator?->name ?? 'Sistem (otomatis)',
            'file_exists' => File::exists(BackupService::pathFor($b)),
            'restorable' => str_ends_with($b->filename, '.ndjson.gz'),
            'checksum' => $b->checksum ? substr($b->checksum, 0, 12) : null,
        ]);
        $latest = SystemBackup::where('status', 'verified')->latest('created_at')->first();

        return response()->json(['success' => true, 'data' => $rows, 'meta' => [
            'last_backup_at' => $latest?->created_at?->toIso8601String(),
            'directory' => 'storage/app/backups',
            'retention' => 14,
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:255']);
        @set_time_limit(600);
        try {
            $b = BackupService::createBackup('database', $data['notes'] ?? 'Backup manual dari aplikasi', $request->user()?->id);
        } catch (\Throwable $e) {
            return ApiResponse::error('BACKUP_FAILED', 'Backup gagal: ' . $e->getMessage(), null, 500);
        }

        return response()->json(['success' => true, 'message' => "Backup {$b->backup_id} berhasil dibuat ({$b->notes}).", 'data' => ['backup_id' => $b->backup_id]], 201);
    }

    public function download(string $backupId): BinaryFileResponse|JsonResponse
    {
        $b = SystemBackup::where('backup_id', $backupId)->first();
        if (!$b || !File::exists(BackupService::pathFor($b))) {
            return ApiResponse::error('NOT_FOUND', 'Berkas backup tidak ditemukan.', null, 404);
        }

        return response()->download(BackupService::pathFor($b), $b->filename, ['Content-Type' => 'application/gzip']);
    }

    /** Uji kelayakan pulih (tanpa mengubah database). */
    public function verify(Request $request, string $backupId): JsonResponse
    {
        $b = SystemBackup::where('backup_id', $backupId)->first();
        if (!$b) {
            return ApiResponse::error('NOT_FOUND', 'Backup tidak ditemukan.', null, 404);
        }
        @set_time_limit(600);
        $r = BackupService::inspectBackup($b);
        if (!$r['ok'] && $b->status === 'verified') {
            // Tidak layak pulih → tidak lagi ditawarkan untuk pemulihan
            $b->update(['status' => 'failed', 'notes' => trim(($b->notes ? $b->notes . ' | ' : '') . 'Uji pulih gagal: ' . implode(' ', $r['problems']))]);
        }
        \App\Services\Security\AuditService::log(event: 'backup_verified', auditableType: SystemBackup::class, auditableId: $b->id,
            newValues: ['backup_id' => $backupId, 'ok' => $r['ok'], 'rows' => $r['rows']], reason: $r['ok'] ? 'Uji pulih berhasil' : implode(' ', $r['problems']),
            userId: $request->user()?->id);

        return response()->json(['success' => true, 'message' => $r['ok']
            ? "Backup {$backupId} layak dipulihkan: {$r['rows']} baris dari {$r['tables']} tabel terbaca utuh."
            : "Backup {$backupId} TIDAK layak dipulihkan: " . implode(' ', $r['problems']), 'data' => $r]);
    }

    public function destroy(string $backupId): JsonResponse
    {
        $b = SystemBackup::where('backup_id', $backupId)->first();
        if (!$b) {
            return ApiResponse::error('NOT_FOUND', 'Backup tidak ditemukan.', null, 404);
        }
        File::delete(BackupService::pathFor($b));
        $b->delete();

        return response()->json(['success' => true, 'message' => "Backup {$backupId} dihapus."]);
    }

    /** Hanya super-admin, wajib mengetik "PULIHKAN <ID BACKUP>". */
    public function restore(Request $request, string $backupId): JsonResponse
    {
        $data = $request->validate(['confirmation' => 'required|string', 'reason' => 'nullable|string|max:255']);
        $b = SystemBackup::where('backup_id', $backupId)->where('status', 'verified')->first();
        if (!$b) {
            return ApiResponse::error('NOT_FOUND', 'Backup terverifikasi tidak ditemukan.', null, 404);
        }
        if (trim($data['confirmation']) !== "PULIHKAN {$backupId}") {
            return ApiResponse::error('CONFIRMATION_MISMATCH', "Ketik persis: PULIHKAN {$backupId}", null, 422);
        }
        @set_time_limit(1800);
        try {
            $r = RestoreService::restoreFromBackup($b, $data['reason'] ?? null, $request->user()?->id);
        } catch (\Throwable $e) {
            return ApiResponse::error('RESTORE_FAILED', 'Pemulihan gagal dan dibatalkan (data tidak berubah): ' . $e->getMessage(), null, 500);
        }

        return response()->json(['success' => true, 'message' => "Database dipulihkan dari {$backupId}: {$r['rows']} baris di {$r['tables']} tabel. Backup pengaman: {$r['safety_backup_id']}.", 'data' => $r]);
    }
}
