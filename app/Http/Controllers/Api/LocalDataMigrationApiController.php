<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Migration\LocalDataMigrationService;
use App\Services\Security\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Impor data lama dari localStorage browser ke MySQL (halaman /migrasi-data).
 */
class LocalDataMigrationApiController extends Controller
{
    public function __invoke(Request $request, LocalDataMigrationService $service): JsonResponse
    {
        $request->validate([
            'dry_run' => 'required|boolean',
            'mode' => 'nullable|in:skip,update',
            'include_demo' => 'nullable|boolean',
            'source_label' => 'nullable|string|max:150',
            'students' => 'nullable|array|max:20000',
            'classrooms' => 'nullable|array|max:2000',
            'dormitories' => 'nullable|array|max:500',
            'dormitory_rooms' => 'nullable|array|max:5000',
            'activities' => 'nullable|array|max:5000',
            'sessions' => 'nullable|array|max:50000',
            'participants' => 'nullable|array|max:500000',
            'records' => 'nullable|array|max:500000',
            'excusals' => 'nullable|array|max:100000',
            'staff' => 'nullable|array|max:5000',
            'staff_records' => 'nullable|array|max:200000',
            'staff_absences' => 'nullable|array|max:50000',
        ]);

        $dryRun = $request->boolean('dry_run');
        @set_time_limit(300);

        try {
            $result = $service->run($request->all(), $request->user(), $dryRun);
        } catch (\Throwable $e) {
            Log::error('Impor data lokal gagal', ['error' => $e->getMessage(), 'user_id' => $request->user()?->id]);

            return response()->json([
                'success' => false,
                'error' => ['code' => 'IMPORT_FAILED', 'message' => 'Impor dibatalkan karena kesalahan: ' . $e->getMessage() . '. Tidak ada data yang disimpan.'],
            ], 422);
        }

        if (!$dryRun) {
            try {
                AuditService::log(
                    event: 'local_data.imported',
                    newValues: ['summary' => $result['summary'], 'source' => $request->input('source_label'), 'mode' => $result['mode']],
                    reason: 'Migrasi data localStorage browser ke server',
                    userId: $request->user()?->id,
                );
            } catch (\Throwable $e) {
                Log::warning('Audit impor data lokal gagal dicatat', ['error' => $e->getMessage()]);
            }
        }

        return response()->json(['success' => true, 'data' => $result]);
    }
}
