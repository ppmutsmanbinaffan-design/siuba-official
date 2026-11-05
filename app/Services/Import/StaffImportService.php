<?php

namespace App\Services\Import;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class StaffImportService
{
    /**
     * Parse raw CSV content into array of rows.
     */
    public function parseCsv(string $csvContent): array
    {
        $csvContent = preg_replace('/^\xEF\xBB\xBF/', '', trim($csvContent));
        if (empty($csvContent)) {
            return [];
        }

        $lines = preg_split('/\r\n|\r|\n/', $csvContent);
        if (empty($lines)) {
            return [];
        }

        $cleanLines = array_values(array_filter($lines, function ($line) {
            $t = trim($line);
            return !empty($t) && !str_starts_with($t, '#');
        }));

        if (count($cleanLines) < 2) {
            return [];
        }

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

            if (!empty(array_filter($row))) {
                $row['_line_number'] = $i + 1;
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * Normalize column names to standard keys.
     */
    protected function normalizeColumnName(string $col): string
    {
        $c = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', str_replace([' ', '-', '/'], '_', $col)));

        // Check if string contains key terms
        if (str_contains($c, 'nip') || str_contains($c, 'username') || str_contains($c, 'user_name') || str_contains($c, 'staff_number')) {
            return 'username';
        }
        if (str_contains($c, 'nama') || str_contains($c, 'name')) {
            return 'name';
        }
        if (str_contains($c, 'email') || str_contains($c, 'surel')) {
            return 'email';
        }
        if (str_contains($c, 'role') || str_contains($c, 'peran') || str_contains($c, 'staff_type') || str_contains($c, 'tipe_staf')) {
            return 'role';
        }
        if (str_contains($c, 'hp') || str_contains($c, 'telp') || str_contains($c, 'phone') || str_contains($c, 'wa')) {
            return 'phone';
        }
        if (str_contains($c, 'gender') || str_contains($c, 'kelamin') || $c === 'jk' || $c === 'sex') {
            return 'gender';
        }
        if (str_contains($c, 'jabatan') || str_contains($c, 'position') || str_contains($c, 'posisi')) {
            return 'position';
        }
        if (str_contains($c, 'divisi') || str_contains($c, 'departemen') || str_contains($c, 'department') || str_contains($c, 'unit')) {
            return 'department';
        }
        if (str_contains($c, 'kepegawaian') || str_contains($c, 'employment')) {
            return 'employment_status';
        }
        if (str_contains($c, 'rfid')) {
            return 'rfid_uid';
        }
        if (str_contains($c, 'pass')) {
            return 'password';
        }
        if (str_contains($c, 'aktif') || str_contains($c, 'status')) {
            return 'is_active';
        }

        return $c;
    }

    /**
     * Preview and validate rows without committing to DB.
     */
    public function preview(array $rows, string $mode = 'upsert'): array
    {
        $existingUsers = User::all()->keyBy(fn($u) => strtolower(trim($u->username)));
        $existingEmails = User::whereNotNull('email')->pluck('username', 'email')->toArray();

        $validRoles = [
            'guru',
            'pelatih',
            'musyrif',
            'petugas-masjid',
            'operator',
            'admin',
            'kepala-sekolah',
            'kepala-asrama',
            'kesantrian',
            'academic',
            'super-admin',
            'viewer',
        ];

        $previewRows = [];
        $validCount = 0;
        $warningCount = 0;
        $errorCount = 0;

        $seenUsernames = [];

        foreach ($rows as $index => $row) {
            $rawUsername = trim($row['username'] ?? '');
            $name = trim($row['name'] ?? '');
            $rawRole = strtolower(trim($row['role'] ?? 'guru'));
            $rawEmail = strtolower(trim($row['email'] ?? ''));
            $phone = trim($row['phone'] ?? '');
            $rawGender = trim($row['gender'] ?? 'L');

            $messages = [];
            $status = 'valid';

            // 1. Mandatory Name
            if (empty($name)) {
                $status = 'error';
                $messages[] = 'Nama lengkap wajib diisi.';
            }

            // 2. Generate or sanitize Username
            $username = $rawUsername ? Str::slug($rawUsername, '.') : Str::slug($name, '.');
            if (empty($username)) {
                $status = 'error';
                $messages[] = 'Username tidak valid.';
            }

            // 3. Batch Duplicate Check in same file
            if (!empty($username)) {
                if (isset($seenUsernames[$username])) {
                    $status = 'error';
                    $messages[] = "Duplikat username '{$username}' dalam file yang sama.";
                } else {
                    $seenUsernames[$username] = $index + 1;
                }
            }

            // 4. Role normalization & validation
            $normalizedRole = $this->normalizeRole($rawRole);
            if (!in_array($normalizedRole, $validRoles)) {
                $normalizedRole = 'guru';
                if ($status !== 'error') {
                    $status = 'warning';
                }
                $messages[] = "Peran '{$rawRole}' tidak dikenali — Menggunakan default 'guru'.";
            }

            // 5. Email fallback
            $email = $rawEmail ?: "{$username}@utsman.sch.id";

            // 6. Existing User Check in DB
            $isExisting = isset($existingUsers[$username]);
            if ($isExisting && $status !== 'error') {
                if ($mode === 'skip') {
                    $status = 'warning';
                    $messages[] = "Username @{$username} sudah terdaftar di database — Akan dilewati (Skip).";
                } else {
                    $status = 'warning';
                    $messages[] = "Username @{$username} sudah terdaftar — Data dan role akan diperbarui (Update).";
                }
            }

            // 7. Email conflict with different username
            if (isset($existingEmails[$email]) && strtolower($existingEmails[$email]) !== $username) {
                if ($status !== 'error') {
                    $status = 'warning';
                }
                $messages[] = "Email '{$email}' sudah dipakai oleh user @{$existingEmails[$email]}.";
            }

            $normalizedGender = in_array(strtoupper($rawGender), ['P', 'FEMALE', 'PEREMPUAN', 'W']) ? 'P' : 'L';

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
                    'username' => $username,
                    'name' => $name,
                    'email' => $email,
                    'role' => $normalizedRole,
                    'role_label' => $this->getRoleLabel($normalizedRole),
                    'phone' => $phone,
                    'gender' => $normalizedGender,
                    'gender_label' => $normalizedGender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
                    'department' => trim($row['department'] ?? 'Akademik & Pengajaran'),
                    'position' => trim($row['position'] ?? 'Staf Pendidik'),
                    'employment_status' => trim($row['employment_status'] ?? 'tetap') ?: 'tetap',
                    'rfid_uid' => trim($row['rfid_uid'] ?? '') ?: null,
                    'is_active' => !in_array(strtolower(trim($row['is_active'] ?? '1')), ['0', 'false', 'nonaktif', 'tidak']),
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
     * Execute the staff import operation inside DB transaction.
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
                $username = $d['username'];

                $existing = User::where('username', $username)->first();

                if ($existing) {
                    if ($mode === 'skip') {
                        $skipped++;
                        continue;
                    }

                    $existing->update([
                        'name' => $d['name'],
                        'email' => $d['email'] ?: $existing->email,
                        'is_active' => $d['is_active'],
                    ]);

                    // Sync role safely across guards
                    $targetRole = Role::where('name', $d['role'])->where('guard_name', 'web')->first()
                        ?? Role::where('name', $d['role'])->first();
                    if ($targetRole) {
                        $existing->syncRoles([$targetRole]);
                    }

                    $updated++;
                    $processedRecords[] = [
                        'id' => $existing->id,
                        'username' => $existing->username,
                        'name' => $existing->name,
                        'email' => $existing->email,
                        'role' => $d['role'],
                        'roles' => $existing->getRoleNames(),
                        'is_active' => (bool) $existing->is_active,
                        'department' => $d['department'],
                        'position' => $d['position'],
                        'phone' => $d['phone'],
                    ];
                } else {
                    // Create new user with default password
                    $newUser = User::create([
                        'username' => $username,
                        'name' => $d['name'],
                        'email' => $d['email'],
                        'password' => 'password', // 'hashed' cast auto-hashes
                        'is_active' => $d['is_active'],
                    ]);

                    $targetRole = Role::where('name', $d['role'])->where('guard_name', 'web')->first()
                        ?? Role::where('name', $d['role'])->first();
                    if ($targetRole) {
                        $newUser->syncRoles([$targetRole]);
                    }

                    $created++;
                    $processedRecords[] = [
                        'id' => $newUser->id,
                        'username' => $newUser->username,
                        'name' => $newUser->name,
                        'email' => $newUser->email,
                        'role' => $d['role'],
                        'roles' => $newUser->getRoleNames(),
                        'is_active' => (bool) $newUser->is_active,
                        'department' => $d['department'],
                        'position' => $d['position'],
                        'phone' => $d['phone'],
                    ];
                }
            }
        });

        return [
            'success' => true,
            'message' => "Import data Guru & SDM selesai: {$created} baru ditambahkan, {$updated} diperbarui, {$skipped} dilewati, {$failed} gagal.",
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
     * Normalize role aliases to exact Spatie role names.
     */
    protected function normalizeRole(string $raw): string
    {
        $clean = strtolower(trim(str_replace([' ', '_'], '-', $raw)));

        return match ($clean) {
            'guru', 'pengajar', 'ustadz', 'ustadzah', 'teacher', 'educator' => 'guru',
            'pelatih', 'coach', 'trainer', 'instruktur', 'ekskul' => 'pelatih',
            'musyrif', 'musyrifah', 'pembina_asrama', 'pembina-asrama', 'warden' => 'musyrif',
            'petugas-masjid', 'masjid', 'marbot', 'takmir' => 'petugas-masjid',
            'operator', 'admin-absensi', 'petugas-absensi' => 'operator',
            'admin', 'administrator', 'tata-usaha', 'tu' => 'admin',
            'kepala-sekolah', 'kepsek', 'mudir-tarbiyah', 'principal' => 'kepala-sekolah',
            'kepala-asrama', 'kestren', 'mudir-asrama', 'head-boarding' => 'kepala-asrama',
            'kesantrian', 'staf-kesantrian' => 'kesantrian',
            'academic', 'kurikulum', 'staf-kurikulum' => 'academic',
            'pimpinan', 'pimpinan-pondok', 'kyai', 'mudir' => 'pimpinan',
            'super-admin', 'superadmin', 'super_admin' => 'super-admin',
            default => $clean,
        };
    }

    protected function getRoleLabel(string $role): string
    {
        return match ($role) {
            'guru' => 'Guru / Ustadz',
            'pelatih' => 'Pelatih / Coach',
            'musyrif' => 'Musyrif Asrama',
            'petugas-masjid' => 'Petugas Masjid',
            'operator' => 'Operator Presensi',
            'admin' => 'Administrator Pondok',
            'kepala-sekolah' => 'Kepala Sekolah',
            'kepala-asrama' => 'Kepala Asrama',
            'kesantrian' => 'Staf Kesantrian',
            'academic' => 'Staf Kurikulum',
            'pimpinan' => 'Pimpinan Pesantren',
            'super-admin' => 'Super Administrator',
            default => ucfirst($role),
        };
    }

    /**
     * Generate template CSV for staff, teachers, and coaches.
     */
    public function generateTemplateCsv(): string
    {
        $headers = [
            'NIP/Username',
            'Nama Lengkap',
            'Peran/Role (guru/pelatih/musyrif/operator/admin)',
            'Email',
            'No WhatsApp/HP',
            'Jenis Kelamin (L/P)',
            'Jabatan',
            'Departemen/Divisi',
            'Status Kepegawaian',
            'RFID UID',
        ];

        $sampleRows = [
            [
                'guru.hasan',
                'Ustadz Hasan Basri, M.Pd',
                'guru',
                'hasan@utsman.sch.id',
                '081234567801',
                'L',
                'Guru Pengampu Bahasa Arab',
                'Kurikulum & Bahasa',
                'tetap',
                '04B912AF',
            ],
            [
                'pelatih.bambang',
                'Coach Bambang Pamungkas',
                'pelatih',
                'pelatih@utsman.sch.id',
                '081234567802',
                'L',
                'Pelatih Ekstrakurikuler Sepak Bola & Futsal',
                'Bakat & Minat',
                'kontrak',
                '04C88211',
            ],
            [
                'musyrif.fauzi',
                'Ustadz Ahmad Fauzi, S.Pd.I',
                'musyrif',
                'fauzi@utsman.sch.id',
                '081234567803',
                'L',
                'Pembina Asrama Al-Farabi',
                'Kesantrian & Asrama',
                'tetap',
                '04D33190',
            ],
            [
                'ustadzah.maryam',
                'Ustadzah Maryam Salsabila, S.Hum',
                'guru',
                'maryam@utsman.sch.id',
                '081399887766',
                'P',
                'Guru Pengampu Tahsin & Tajwid',
                'Tahfidz & Qurani',
                'tetap',
                '',
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
