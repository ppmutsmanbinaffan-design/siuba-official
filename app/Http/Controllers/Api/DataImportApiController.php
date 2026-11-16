<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Import\StaffImportService;
use App\Services\Import\StudentImportService;
use App\Support\Spreadsheet\SimpleXlsx;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Import massal santri & SDM dari file CSV/TXT atau Excel (.xlsx).
 */
class DataImportApiController extends Controller
{
    /** Batas ukuran file unggahan (KB). */
    private const MAX_UPLOAD_KB = 10240;

    public function __construct(
        protected StudentImportService $studentImportService,
        protected StaffImportService $staffImportService
    ) {}

    // =========================================================================
    // STUDENT IMPORT ENDPOINTS
    // =========================================================================

    /** Template import santri. `?format=xlsx` untuk Excel, bawaan CSV. */
    public function downloadStudentTemplate(Request $request): Response
    {
        return $this->templateResponse($request, $this->studentImportService, 'Template_Import_Santri_SIUBA');
    }

    public function previewStudents(Request $request): JsonResponse
    {
        return $this->runPreview($request, $this->studentImportService);
    }

    public function importStudents(Request $request): JsonResponse
    {
        return $this->runImport($request, $this->studentImportService);
    }

    // =========================================================================
    // STAFF / TEACHER / COACH IMPORT ENDPOINTS
    // =========================================================================

    public function downloadStaffTemplate(Request $request): Response
    {
        return $this->templateResponse($request, $this->staffImportService, 'Template_Import_Guru_SDM_SIUBA');
    }

    public function previewStaff(Request $request): JsonResponse
    {
        return $this->runPreview($request, $this->staffImportService);
    }

    public function importStaff(Request $request): JsonResponse
    {
        return $this->runImport($request, $this->staffImportService);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    protected function runPreview(Request $request, object $service): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $service);
        if ($rows instanceof JsonResponse) {
            return $rows;
        }
        if (empty($rows)) {
            return $this->fail('Tidak ada data valid yang ditemukan pada file. Pastikan baris pertama berisi judul kolom sesuai template dan ada minimal satu baris data.');
        }

        return response()->json([
            'success' => true,
            'data' => $service->preview($rows, $request->input('mode', 'upsert')),
        ]);
    }

    protected function runImport(Request $request, object $service): JsonResponse
    {
        $rows = $this->extractRowsFromRequest($request, $service);
        if ($rows instanceof JsonResponse) {
            return $rows;
        }
        if (empty($rows)) {
            return $this->fail('Tidak ada data valid yang ditemukan untuk diimpor.');
        }

        $result = $service->import($rows, $request->input('mode', 'upsert'));

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * Ambil baris dari file unggahan (CSV/TXT/XLSX), teks CSV mentah, atau array JSON.
     *
     * @return array<int, array<string, mixed>>|JsonResponse
     */
    protected function extractRowsFromRequest(Request $request, object $service): array|JsonResponse
    {
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            if (!$file->isValid()) {
                return $this->fail('File gagal diunggah. Coba ulangi atau periksa batas upload_max_filesize di php.ini.');
            }
            if ($file->getSize() > self::MAX_UPLOAD_KB * 1024) {
                return $this->fail('Ukuran file melebihi ' . (self::MAX_UPLOAD_KB / 1024) . ' MB. Pecah data menjadi beberapa file.');
            }

            $name = (string) $file->getClientOriginalName();
            $path = $file->getRealPath();

            if (preg_match('/\.xls$/i', $name)) {
                return $this->fail('Format .xls (Excel 97-2003) belum didukung. Di Excel pilih File → Save As → "Excel Workbook (.xlsx)" atau "CSV UTF-8".');
            }
            if (preg_match('/\.(ods|numbers)$/i', $name)) {
                return $this->fail('Format file ini belum didukung. Simpan ulang sebagai .xlsx atau .csv.');
            }

            if (SimpleXlsx::isXlsxFile($path, $name)) {
                try {
                    $sheetRows = SimpleXlsx::read($path);
                } catch (RuntimeException $e) {
                    return $this->fail($e->getMessage());
                }

                return $service->parseCsv(SimpleXlsx::rowsToCsv($sheetRows));
            }

            $content = (string) file_get_contents($path);
            if (!mb_check_encoding($content, 'UTF-8')) {
                // CSV dari Excel lama sering ber-encoding Windows-1252
                $content = mb_convert_encoding($content, 'UTF-8', 'Windows-1252');
            }

            return $service->parseCsv($content);
        }

        if ($request->filled('csv_content')) {
            return $service->parseCsv((string) $request->input('csv_content'));
        }

        if ($request->has('rows') && is_array($request->input('rows'))) {
            return $request->input('rows');
        }

        return [];
    }

    protected function templateResponse(Request $request, object $service, string $basename): Response
    {
        if (strtolower((string) $request->query('format')) === 'xlsx' && SimpleXlsx::isAvailable()) {
            $binary = $service->generateTemplateXlsx();

            return response($binary, 200, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$basename}.xlsx\"",
                'Content-Length' => (string) strlen($binary),
            ]);
        }

        $csv = $service->generateTemplateCsv();

        return response()->streamDownload(function () use ($csv) {
            echo "\xEF\xBB\xBF"; // BOM agar Excel membaca UTF-8
            echo $csv;
        }, "{$basename}.csv", [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    protected function fail(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 422);
    }
}
