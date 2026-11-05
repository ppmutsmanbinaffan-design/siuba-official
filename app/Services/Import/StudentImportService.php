<?php

namespace App\Services\Import;

use App\Models\Classroom;
use App\Models\DormitoryRoom;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentImportService
{
    /**
     * Parse raw CSV content into an array of associative row arrays.
     */
    public function parseCsv(string $csvContent): array
    {
        // Strip UTF-8 BOM if present
        $csvContent = preg_replace('/^\xEF\xBB\xBF/', '', trim($csvContent));
        if (empty($csvContent)) {
            return [];
        }

        $lines = preg_split('/\r\n|\r|\n/', $csvContent);
        if (empty($lines)) {
            return [];
        }

        // Filter out empty lines and comment lines (starting with #)
        $cleanLines = array_values(array_filter($lines, function ($line) {
            $t = trim($line);
            return !empty($t) && !str_starts_with($t, '#');
        }));

        if (count($cleanLines) < 2) {
            return [];
        }

        // Auto-detect delimiter from the header line
        $firstLine = $cleanLines[0];
        $delimiters = [',', ';', "\t", '|'];
        $bestDelimiter = ',';
        $maxCount = 0;
        foreach ($delimiters as $delim) {
            $cnt = substr_count($firstLine, $delim);
            if ($cnt > $maxCount) {
                $maxCount = $cnt;
                $bestDelimiter = $delim;
            }
        }

        // Parse header
        $headerRaw = str_getcsv($cleanLines[0], $bestDelimiter);
        $header = array_map(fn($col) => $this->normalizeColumnName(trim((string) $col)), $headerRaw);

        $rows = [];
        for ($i = 1; $i < count($cleanLines); $i++) {
            $line = $cleanLines[$i];
            if (empty(trim($line))) {
                continue;
            }

            $values = str_getcsv($line, $bestDelimiter);
            $row = [];
            foreach ($header as $idx => $key) {
                if (!empty($key)) {
                    $row[$key] = isset($values[$idx]) ? trim((string) $values[$idx]) : '';
                }
            }

            // Only add if row has at least one non-empty value
            if (!empty(array_filter($row))) {
                $row['_line_number'] = $i + 1;
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * Normalize CSV header column names to standard keys.
     */
    protected function normalizeColumnName(string $col): string
    {
        $c = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', str_replace([' ', '-', '/'], '_', $col)));

        // Check specific keys first
        if (str_contains($c, 'gender') || str_contains($c, 'kelamin') || $c === 'jk' || $c === 'sex') {
            return 'gender';
        }
        if (str_contains($c, 'nisn')) {
            return 'nisn';
        }
        if (
            $c === 'nis' || 
            $c === 'no_induk' || 
            $c === 'nomor_induk' || 
            $c === 'student_number' || 
            str_starts_with($c, 'nis_') || 
            str_ends_with($c, '_nis') ||
            $c === 'nis_lokal' ||
            $c === 'id_santri'
        ) {
            return 'student_number';
        }
        if (str_contains($c, 'panggilan') || str_contains($c, 'nickname')) {
            return 'nickname';
        }
        if (str_contains($c, 'wali') || str_contains($c, 'guardian') || str_contains($c, 'orang_tua')) {
            if (str_contains($c, 'hp') || str_contains($c, 'telp') || str_contains($c, 'phone') || str_contains($c, 'wa')) {
                return 'guardian_phone';
            }
            return 'guardian_name';
        }
        if (str_contains($c, 'nama') || str_contains($c, 'name')) {
            return 'name';
        }
        if (str_contains($c, 'kelas') || str_contains($c, 'classroom') || str_contains($c, 'rombel') || str_contains($c, 'grade')) {
            return 'classroom_name';
        }
        if (str_contains($c, 'kamar') || str_contains($c, 'asrama') || str_contains($c, 'dormitory') || str_contains($c, 'room')) {
            return 'dormitory_room_name';
        }
        if (str_contains($c, 'angkatan') || str_contains($c, 'tahun') || str_contains($c, 'generation')) {
            return 'generation_year';
        }
        if (str_contains($c, 'rfid')) {
            return 'rfid_uid';
        }
        if (str_contains($c, 'hp') || str_contains($c, 'telp') || str_contains($c, 'telepon') || str_contains($c, 'phone') || str_contains($c, 'wa')) {
            return 'guardian_phone';
        }
        if (str_contains($c, 'alamat') || str_contains($c, 'address') || str_contains($c, 'domisili')) {
            return 'address';
        }
        if (str_contains($c, 'status')) {
            return 'status';
        }

        return $c;
    }

    /**
     * Preview and validate rows against database rules without saving.
     */
    public function preview(array $rows, string $mode = 'upsert'): array
    {
        $classrooms = Classroom::all()->keyBy(fn($c) => strtolower(trim($c->name)));
        $dormitoryRooms = DormitoryRoom::all()->keyBy(fn($r) => strtolower(trim($r->name)));

        $existingStudents = Student::withTrashed()->get()->keyBy(fn($s) => trim($s->student_number));
        $existingRfids = Student::whereNotNull('rfid_uid')->pluck('student_number', 'rfid_uid')->toArray();

        $previewRows = [];
        $validCount = 0;
        $warningCount = 0;
        $errorCount = 0;

        $seenNis = [];
        $seenRfid = [];

        foreach ($rows as $index => $row) {
            $studentNumber = trim($row['student_number'] ?? '');
            $name = trim($row['name'] ?? '');
            $rawGender = trim($row['gender'] ?? 'L');
            $classroomName = trim($row['classroom_name'] ?? '');
            $roomName = trim($row['dormitory_room_name'] ?? '');
            $generationYear = (int) ($row['generation_year'] ?? date('Y'));
            if ($generationYear < 2000 || $generationYear > 2100) {
                $generationYear = (int) date('Y');
            }
            $rfidUid = Student::normalizeRfidUid($row['rfid_uid'] ?? null);

            $messages = [];
            $status = 'valid'; // valid, warning, error

            // 1. Mandatory Validation: NIS
            if (empty($studentNumber)) {
                $status = 'error';
                $messages[] = 'NIS wajib diisi.';
            }

            // 2. Mandatory Validation: Name
            if (empty($name)) {
                $status = 'error';
                $messages[] = 'Nama santri wajib diisi.';
            }

            // 3. Batch Duplicate Check in current payload
            if (!empty($studentNumber)) {
                if (isset($seenNis[$studentNumber])) {
                    $status = 'error';
                    $messages[] = "Duplikat NIS dalam file yang sama (baris {$seenNis[$studentNumber]} & baris " . ($index + 1) . ").";
                } else {
                    $seenNis[$studentNumber] = $index + 1;
                }
            }

            // 4. Existing Database Duplicate Check
            $isExisting = isset($existingStudents[$studentNumber]);
            if ($isExisting && $status !== 'error') {
                if ($mode === 'skip') {
                    $status = 'warning';
                    $messages[] = 'NIS sudah terdaftar di database — Akan dilewati (Skip).';
                } else {
                    $status = 'warning';
                    $messages[] = 'NIS sudah terdaftar di database — Data akan diperbarui (Update).';
                }
            }

            // 5. Gender Normalization
            $normalizedGender = in_array(strtoupper($rawGender), ['P', 'FEMALE', 'PEREMPUAN', 'W']) ? 'P' : 'L';

            // 6. Classroom lookup
            $matchedClassroom = null;
            if (!empty($classroomName)) {
                $matchedClassroom = $this->matchClassroom($classroomName, $classrooms);
                if (!$matchedClassroom) {
                    if ($status !== 'error') {
                        $status = 'warning';
                    }
                    $messages[] = "Kelas '{$classroomName}' tidak ditemukan (akan dikosongkan).";
                }
            }

            // 7. Dormitory Room lookup
            $matchedRoom = null;
            if (!empty($roomName)) {
                $matchedRoom = $this->matchDormitoryRoom($roomName, $dormitoryRooms);
                if (!$matchedRoom) {
                    if ($status !== 'error') {
                        $status = 'warning';
                    }
                    $messages[] = "Kamar '{$roomName}' tidak ditemukan (akan dikosongkan).";
                }
            }

            // 8. RFID Duplicate check
            if (!empty($rfidUid)) {
                if (isset($seenRfid[$rfidUid])) {
                    $status = 'error';
                    $messages[] = "Duplikat RFID UID '{$rfidUid}' dalam file yang sama.";
                } else {
                    $seenRfid[$rfidUid] = $index + 1;
                }

                if (isset($existingRfids[$rfidUid]) && $existingRfids[$rfidUid] !== $studentNumber) {
                    if ($status !== 'error') {
                        $status = 'warning';
                    }
                    $messages[] = "RFID '{$rfidUid}' sudah digunakan oleh santri NIS {$existingRfids[$rfidUid]}.";
                }
            }

            if ($status === 'valid') {
                $validCount++;
            } elseif ($status === 'warning') {
                $warningCount++;
            } else {
                $errorCount++;
            }

            $previewRows[] = [
                'index' => $index + 1,
                'status' => $status,
                'messages' => $messages,
                'is_existing' => $isExisting,
                'data' => [
                    'student_number' => $studentNumber,
                    'nisn' => trim($row['nisn'] ?? ''),
                    'name' => $name,
                    'nickname' => trim($row['nickname'] ?? ''),
                    'gender' => $normalizedGender,
                    'gender_label' => $normalizedGender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
                    'classroom_id' => $matchedClassroom?->id,
                    'classroom_name' => $matchedClassroom?->name ?? ($classroomName ?: '-'),
                    'dormitory_room_id' => $matchedRoom?->id,
                    'dormitory_room_name' => $matchedRoom?->name ?? ($roomName ?: '-'),
                    'generation_year' => $generationYear,
                    'rfid_uid' => $rfidUid,
                    'guardian_name' => trim($row['guardian_name'] ?? ''),
                    'guardian_phone' => trim($row['guardian_phone'] ?? ''),
                    'address' => trim($row['address'] ?? ''),
                    'student_status' => trim($row['status'] ?? 'active') ?: 'active',
                ],
            ];
        }

        return [
            'total' => count($rows),
            'valid_count' => $validCount,
            'warning_count' => $warningCount,
            'error_count' => $errorCount,
            'can_import' => ($validCount + $warningCount) > 0,
            'mode' => $mode,
            'rows' => $previewRows,
        ];
    }

    /**
     * Execute the import operation inside a database transaction.
     */
    public function import(array $rows, string $mode = 'upsert'): array
    {
        $preview = $this->preview($rows, $mode);
        $rowsToProcess = $preview['rows'];

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $failed = 0;
        $processedRecords = [];

        DB::transaction(function () use (
            $rowsToProcess,
            $mode,
            &$created,
            &$updated,
            &$skipped,
            &$failed,
            &$processedRecords
        ) {
            foreach ($rowsToProcess as $item) {
                if ($item['status'] === 'error') {
                    $failed++;
                    continue;
                }

                $d = $item['data'];
                $studentNumber = $d['student_number'];

                $existing = Student::withTrashed()->where('student_number', $studentNumber)->first();

                if ($existing) {
                    if ($mode === 'skip') {
                        $skipped++;
                        continue;
                    }

                    // Upsert: update existing
                    if ($existing->trashed()) {
                        $existing->restore();
                    }

                    $existing->update([
                        'nisn' => $d['nisn'] ?: $existing->nisn,
                        'name' => $d['name'],
                        'gender' => $d['gender'],
                        'classroom_id' => $d['classroom_id'] ?: $existing->classroom_id,
                        'dormitory_room_id' => $d['dormitory_room_id'] ?: $existing->dormitory_room_id,
                        'generation_year' => $d['generation_year'] ?: $existing->generation_year,
                        'rfid_uid' => $d['rfid_uid'] ?: $existing->rfid_uid,
                        'is_active' => $d['student_status'] === 'active' || $d['student_status'] === '1' || $d['student_status'] === true,
                    ]);

                    $updated++;
                    $processedRecords[] = $existing->fresh(['classroom', 'dormitoryRoom']);
                } else {
                    // Create new student
                    $newStudent = Student::create([
                        'student_number' => $studentNumber,
                        'nisn' => $d['nisn'] ?: null,
                        'name' => $d['name'],
                        'gender' => $d['gender'],
                        'classroom_id' => $d['classroom_id'],
                        'dormitory_room_id' => $d['dormitory_room_id'],
                        'generation_year' => $d['generation_year'],
                        'rfid_uid' => $d['rfid_uid'],
                        'qr_token' => Student::generateUniqueQrToken(),
                        'is_active' => $d['student_status'] === 'active' || $d['student_status'] === '1' || $d['student_status'] === true,
                    ]);

                    $created++;
                    $processedRecords[] = $newStudent->fresh(['classroom', 'dormitoryRoom']);
                }
            }
        });

        return [
            'success' => true,
            'message' => "Import santri selesai: {$created} baru ditambahkan, {$updated} diperbarui, {$skipped} dilewati, {$failed} gagal.",
            'stats' => [
                'total' => count($rowsToProcess),
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'failed' => $failed,
            ],
            'records' => $processedRecords,
        ];
    }

    /**
     * Fuzzy/Exact classroom matching helper.
     */
    protected function matchClassroom(string $name, $classrooms)
    {
        $clean = strtolower(trim($name));
        if (isset($classrooms[$clean])) {
            return $classrooms[$clean];
        }

        // Try stripping spaces (e.g. "VII A" -> "viia")
        $noSpace = str_replace([' ', '-', '_'], '', $clean);
        foreach ($classrooms as $c) {
            $cNoSpace = strtolower(str_replace([' ', '-', '_'], '', $c->name));
            if ($noSpace === $cNoSpace) {
                return $c;
            }
        }

        return null;
    }

    /**
     * Fuzzy/Exact dormitory room matching helper.
     */
    protected function matchDormitoryRoom(string $name, $rooms)
    {
        $clean = strtolower(trim($name));
        if (isset($rooms[$clean])) {
            return $rooms[$clean];
        }

        $noSpace = str_replace([' ', '-', '_'], '', $clean);
        foreach ($rooms as $r) {
            $rNoSpace = strtolower(str_replace([' ', '-', '_'], '', $r->name));
            if ($noSpace === $rNoSpace) {
                return $r;
            }
        }

        return null;
    }

    /**
     * Generate template CSV with header and example records.
     */
    public function generateTemplateCsv(): string
    {
        $headers = [
            'NIS',
            'NISN',
            'Nama Lengkap',
            'Panggilan',
            'Jenis Kelamin (L/P)',
            'Kelas',
            'Kamar Asrama',
            'Tahun Angkatan',
            'RFID UID',
            'Nama Wali',
            'No HP Wali',
            'Alamat',
            'Status',
        ];

        $sampleRows = [
            [
                '202607001',
                '0089123401',
                'Muhammad Abdullah Fauzan',
                'Fauzan',
                'L',
                'VII A',
                'Al-Farabi 01',
                '2026',
                '04A87F12',
                'H. Rahmat Hidayat',
                '081234567890',
                'Jl. Raya Pesantren No. 12 Surabaya',
                'active',
            ],
            [
                '202607002',
                '0089123402',
                'Aisyah Nur Ramadhani',
                'Aisyah',
                'P',
                'VII B',
                'Khadijah 02',
                '2026',
                '',
                'Ir. Bambang Sutejo',
                '081398765432',
                'Perum Graha Asri Blok C-4 Malang',
                'active',
            ],
            [
                '202607003',
                '0089123403',
                'Zaidan Rayhan Al-Ghifari',
                'Rayhan',
                'L',
                'VIII A',
                'Ibnu Sina 03',
                '2025',
                '04F19E3A',
                'Dr. M. Syaifuddin',
                '085611223344',
                'Jl. Melati No. 8 Sidoarjo',
                'active',
            ],
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);
        foreach ($sampleRows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }
}
