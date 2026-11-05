<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Import\StaffImportService;
use App\Services\Import\StudentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataImportApiController extends Controller
{
    public function __construct(
        protected StudentImportService $studentImportService,
        protected StaffImportService $staffImportService
    ) {}

    // =========================================================================
    // STUDENT IMPORT ENDPOINTS
    // =========================================================================

    /**
     * Download sample CSV template for Student import.
     */
    public function downloadStudentTemplate(): StreamedResponse
    {
        $csv = $this->studentImportService->generateTemplateCsv();
        $filename = 'Template_Import_Santri_SIUBA.csv';

        return response()->streamDownload(function () use ($csv) {
            echo "\xEF\xBB\xBF"; // UTF-8 BOM for Excel compatibility
            echo $csv;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Preview & Validate Student import data before committing.
     */
    public function previewStudents(Request $request): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $this->studentImportService);
        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data valid yang ditemukan pada file / input CSV.',
            ], 422);
        }

        $mode = $request->input('mode', 'upsert');
        $preview = $this->studentImportService->preview($rows, $mode);

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    /**
     * Execute Student bulk import.
     */
    public function importStudents(Request $request): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $this->studentImportService);
        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data valid yang ditemukan untuk diimpor.',
            ], 422);
        }

        $mode = $request->input('mode', 'upsert');
        $result = $this->studentImportService->import($rows, $mode);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    // =========================================================================
    // STAFF / TEACHER / COACH IMPORT ENDPOINTS
    // =========================================================================

    /**
     * Download sample CSV template for Staff / Teacher / Coach import.
     */
    public function downloadStaffTemplate(): StreamedResponse
    {
        $csv = $this->staffImportService->generateTemplateCsv();
        $filename = 'Template_Import_Guru_SDM_SIUBA.csv';

        return response()->streamDownload(function () use ($csv) {
            echo "\xEF\xBB\xBF";
            echo $csv;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Preview & Validate Staff / Teacher / Coach import data.
     */
    public function previewStaff(Request $request): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $this->staffImportService);
        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data valid yang ditemukan pada file / input CSV.',
            ], 422);
        }

        $mode = $request->input('mode', 'upsert');
        $preview = $this->staffImportService->preview($rows, $mode);

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    /**
     * Execute Staff / Teacher / Coach bulk import.
     */
    public function importStaff(Request $request): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $this->staffImportService);
        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data valid yang ditemukan untuk diimpor.',
            ], 422);
        }

        $mode = $request->input('mode', 'upsert');
        $result = $this->staffImportService->import($rows, $mode);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Extract structured rows from either uploaded file, raw CSV string, or JSON array.
     */
    protected function extractRowsFromRequest(Request $request, object $service): array
    {
        // 1. File Upload (multipart/form-data)
        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $content = file_get_contents($request->file('file')->getRealPath());
            return $service->parseCsv($content);
        }

        // 2. Raw CSV content in JSON body
        if ($request->filled('csv_content')) {
            return $service->parseCsv((string) $request->input('csv_content'));
        }

        // 3. Pre-parsed JSON rows array
        if ($request->has('rows') && is_array($request->input('rows'))) {
            return $request->input('rows');
        }

        return [];
    }
}
