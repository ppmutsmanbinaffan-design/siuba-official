<?php

namespace App\Services\Migration;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\User;
use App\Models\StaffProfile;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffAbsenceRequest;
use App\Models\StudentExcusal;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Memindahkan data yang selama ini hanya tersimpan di localStorage browser (aplikasi React lama)
 * ke database MySQL.
 *
 * Prinsip:
 * - Aman diulang (idempotent): santri dicocokkan lewat NIS, sesi lewat kode sesi,
 *   absensi lewat pasangan (sesi, santri). Data yang sudah ada di server tidak diduplikasi.
 * - Data contoh/demo bawaan aplikasi dilewati (kecuali include_demo = true).
 * - Data master (kelas, asrama, kamar, kegiatan) hanya dibuat bila dipakai oleh data yang diimpor.
 * - Mode simulasi (dry run) menjalankan semuanya lalu membatalkan transaksi.
 */
class LocalDataMigrationService
{
    private array $report = [];
    private array $warnings = [];
    private array $demo = [];
    private bool $includeDemo = false;
    private string $mode = 'skip';

    /** @var array<string,array<int|string,int>> peta id lokal -> id server */
    private array $map = ['classrooms' => [], 'rooms' => [], 'activities' => [], 'students' => [], 'sessions' => [], 'staff' => []];

    private array $local = [];

    /** Catatan buatan pengguna di browser memakai id Date.now(); data contoh ber-id kecil. */
    private function isUserCreated(array $row): bool
    {
        return isset($row['id']) && is_numeric($row['id']) && (float) $row['id'] > 1e11;
    }

    public function run(array $payload, ?User $operator, bool $dryRun = true): array
    {
        $this->reset();
        $this->mode = ($payload['mode'] ?? 'skip') === 'update' ? 'update' : 'skip';
        $this->includeDemo = (bool) ($payload['include_demo'] ?? false);
        $this->demo = $this->loadDemoIdentifiers();

        foreach (['classrooms', 'dormitories', 'dormitory_rooms', 'activities', 'students', 'sessions', 'participants', 'records',
            'excusals', 'staff', 'staff_records', 'staff_absences'] as $k) {
            $this->local[$k] = collect(is_array($payload[$k] ?? null) ? $payload[$k] : [])
                ->filter(fn ($row) => is_array($row))->values();
        }

        DB::beginTransaction();
        try {
            $this->importStudents();
            $this->importSessions();
            $this->importParticipants();
            $this->importRecords();
            $this->importExcusals();
            $this->importStaff();
            $this->importStaffRecords();
            $this->importStaffAbsences();

            if ($dryRun) {
                DB::rollBack();
            } else {
                DB::commit();
            }
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'dry_run' => $dryRun,
            'mode' => $this->mode,
            'include_demo' => $this->includeDemo,
            'summary' => $this->report,
            'warnings' => array_slice($this->warnings, 0, 300),
            'warning_count' => count($this->warnings),
            'operator' => $operator?->name,
        ];
    }

    // ------------------------------------------------------------------ Santri (+ kelas/kamar)

    private function importStudents(): void
    {
        foreach ($this->local['students'] as $row) {
            $nis = trim((string) ($row['student_number'] ?? ''));
            $name = trim((string) ($row['name'] ?? ''));
            $localId = $row['id'] ?? null;

            if ($nis === '' || $name === '') {
                $this->count('students', 'failed');
                $this->warn('Santri tanpa NIS/nama dilewati' . ($name ? ": {$name}" : '') . '.');
                continue;
            }
            if (!$this->includeDemo && in_array($nis, $this->demo['student_numbers'] ?? [], true)) {
                $this->count('students', 'demo_skipped');
                continue;
            }

            $existing = Student::withTrashed()->whereRaw('LOWER(student_number) = ?', [mb_strtolower($nis)])->first();

            if ($existing) {
                if ($localId !== null) $this->map['students'][$localId] = $existing->id;
                if ($this->mode === 'update') {
                    $existing->fill($this->studentAttributes($row, $existing))->save();
                    $this->count('students', 'updated');
                } else {
                    $this->count('students', 'existing');
                }
                continue;
            }

            $attrs = $this->studentAttributes($row, null);
            $attrs['student_number'] = $nis;

            $qr = trim((string) ($row['qr_token'] ?? ''));
            $attrs['qr_token'] = ($qr !== '' && strlen($qr) <= 64 && !Student::withTrashed()->where('qr_token', $qr)->exists())
                ? $qr : Student::generateUniqueQrToken();
            if ($qr !== '' && $attrs['qr_token'] !== $qr) {
                $this->warn("QR santri {$name} ({$nis}) sudah dipakai santri lain; dibuatkan QR baru — kartu perlu dicetak ulang.");
            }

            $student = Student::create($attrs);
            if ($localId !== null) $this->map['students'][$localId] = $student->id;
            $this->count('students', 'created');
        }
    }

    private function studentAttributes(array $row, ?Student $existing): array
    {
        $status = in_array($row['status'] ?? null, ['active', 'inactive', 'graduated', 'transferred', 'resigned'], true)
            ? $row['status'] : (($row['is_active'] ?? true) ? 'active' : 'inactive');

        $attrs = [
            'name' => mb_substr(trim((string) $row['name']), 0, 150),
            'nisn' => $this->str($row['nisn'] ?? null, 20),
            'nickname' => $this->str($row['nickname'] ?? null, 100),
            'gender' => in_array($row['gender'] ?? 'L', ['female', 'P'], true) ? 'P' : 'L',
            'birth_place' => $this->str($row['birth_place'] ?? null, 100),
            'birth_date' => $this->date($row['birth_date'] ?? null),
            'generation_year' => (int) ($row['generation_year'] ?? $row['entry_year'] ?? now()->year),
            'entry_year' => isset($row['entry_year']) ? (int) $row['entry_year'] : null,
            'guardian_name' => $this->str($row['guardian_name'] ?? null, 150),
            'guardian_phone' => $this->str($row['guardian_phone'] ?? null, 30),
            'address' => $this->str($row['address'] ?? null, 1000),
            'status' => $status,
            'is_active' => $status === 'active',
            'classroom_id' => $this->resolveClassroom($row),
            'dormitory_room_id' => $this->resolveRoom($row),
        ];

        $rfid = Student::normalizeRfidUid($this->str($row['rfid_uid'] ?? null, 64));
        if ($rfid) {
            $owner = Student::withTrashed()->where('rfid_uid', $rfid)->first();
            if (!$owner || ($existing && $owner->id === $existing->id)) {
                $attrs['rfid_uid'] = $rfid;
            } else {
                $this->warn("Kartu RFID {$rfid} milik {$attrs['name']} sudah terdaftar pada {$owner->name}; RFID tidak diimpor.");
            }
        }

        // Mode update: jangan timpa nilai server dengan nilai kosong dari browser
        if ($existing) {
            $attrs = array_filter($attrs, fn ($v) => $v !== null && $v !== '');
        }

        return $attrs;
    }

    private function resolveClassroom(array $studentRow): ?int
    {
        $localId = $studentRow['classroom_id'] ?? null;
        if ($localId !== null && isset($this->map['classrooms'][$localId])) {
            return $this->map['classrooms'][$localId];
        }

        $local = $localId !== null ? $this->local['classrooms']->firstWhere('id', $localId) : null;
        $name = trim((string) ($local['name'] ?? $studentRow['classroom_name'] ?? ''));
        if ($name === '') {
            return null;
        }

        $year = (string) ($local['academic_year'] ?? '');
        $classroom = Classroom::where('name', $name)->when($year !== '', fn ($q) => $q->where('academic_year', $year))->first()
            ?? Classroom::where('name', $name)->first();

        if (!$classroom) {
            $classroom = Classroom::create([
                'name' => mb_substr($name, 0, 191),
                'grade_level' => (int) ($local['grade_level'] ?? $this->guessGrade($name)),
                'academic_year' => $year !== '' ? $year : '2026/2027',
                'code' => $this->str($local['code'] ?? null, 30),
                'capacity' => isset($local['capacity']) ? (int) $local['capacity'] : null,
                'is_active' => (bool) ($local['is_active'] ?? true),
            ]);
            $this->count('classrooms', 'created');
        } else {
            $this->count('classrooms', 'matched');
        }

        if ($localId !== null) $this->map['classrooms'][$localId] = $classroom->id;

        return $classroom->id;
    }

    private function resolveRoom(array $studentRow): ?int
    {
        $localId = $studentRow['dormitory_room_id'] ?? null;
        if ($localId !== null && isset($this->map['rooms'][$localId])) {
            return $this->map['rooms'][$localId];
        }

        $local = $localId !== null ? $this->local['dormitory_rooms']->firstWhere('id', $localId) : null;
        $name = trim((string) ($local['name'] ?? $studentRow['dormitory_room_name'] ?? ''));
        if ($name === '') {
            return null;
        }

        $room = DormitoryRoom::where('name', $name)->first();
        if (!$room) {
            $localDorm = $local ? $this->local['dormitories']->firstWhere('id', $local['dormitory_id'] ?? null) : null;
            $dormName = trim((string) ($localDorm['name'] ?? $local['dormitory_name'] ?? 'Asrama (Impor)'));
            $gender = in_array($localDorm['gender'] ?? ($studentRow['gender'] ?? 'L'), ['female', 'P'], true) ? 'P' : 'L';

            $dorm = Dormitory::firstOrCreate(['name' => mb_substr($dormName, 0, 191)], ['gender' => $gender, 'is_active' => true]);
            if ($dorm->wasRecentlyCreated) $this->count('dormitories', 'created');

            $room = DormitoryRoom::create([
                'dormitory_id' => $dorm->id,
                'name' => mb_substr($name, 0, 191),
                'code' => $this->str($local['code'] ?? null, 30),
                'capacity' => (int) ($local['capacity'] ?? 20),
                'is_active' => (bool) ($local['is_active'] ?? true),
            ]);
            $this->count('dormitory_rooms', 'created');
        } else {
            $this->count('dormitory_rooms', 'matched');
        }

        if ($localId !== null) $this->map['rooms'][$localId] = $room->id;

        return $room->id;
    }

    // ------------------------------------------------------------------ Sesi (+ kegiatan)

    private function importSessions(): void
    {
        foreach ($this->local['sessions'] as $row) {
            $code = trim((string) ($row['session_code'] ?? ''));
            $localId = $row['id'] ?? null;

            if ($code === '') {
                $this->count('sessions', 'failed');
                $this->warn('Sesi tanpa kode sesi dilewati.');
                continue;
            }
            if (!$this->includeDemo && in_array($code, $this->demo['session_codes'] ?? [], true)) {
                $this->count('sessions', 'demo_skipped');
                continue;
            }

            $existing = AttendanceSession::where('session_code', $code)->first();
            if ($existing) {
                if ($localId !== null) $this->map['sessions'][$localId] = $existing->id;
                $this->count('sessions', 'existing');
                continue;
            }

            $date = $this->date($row['session_date'] ?? null);
            $start = $this->dateTime($row['start_at'] ?? null);
            $end = $this->dateTime($row['end_at'] ?? null);
            if (!$date || !$start || !$end) {
                $this->count('sessions', 'failed');
                $this->warn("Sesi {$code}: tanggal/jam tidak valid, dilewati.");
                continue;
            }

            $status = SessionStatus::tryFrom((string) ($row['status'] ?? '')) ?? SessionStatus::CLOSED;
            // Sesi lama yang masih "open" di browser ditutup saat impor
            if ($status === SessionStatus::OPEN && Carbon::parse($date)->lt(today())) {
                $status = SessionStatus::CLOSED;
            }

            $session = AttendanceSession::create([
                'session_code' => mb_substr($code, 0, 64),
                'activity_id' => $this->resolveActivity($row),
                'session_date' => $date,
                'start_at' => $start,
                'present_until' => $this->dateTime($row['present_until'] ?? null) ?? $start,
                'late_until' => $this->dateTime($row['late_until'] ?? null) ?? $end,
                'end_at' => $end,
                'status' => $status,
                'location' => $this->str($row['location'] ?? null, 100),
                'opened_at' => $this->dateTime($row['opened_at'] ?? null),
                'closed_at' => $this->dateTime($row['closed_at'] ?? null) ?? ($status === SessionStatus::CLOSED ? $end : null),
                'notes' => trim(($row['notes'] ?? '') . ' [Impor dari browser]'),
            ]);

            if ($localId !== null) $this->map['sessions'][$localId] = $session->id;
            $this->count('sessions', 'created');
        }
    }

    private function resolveActivity(array $sessionRow): int
    {
        $localId = $sessionRow['activity_id'] ?? null;
        if ($localId !== null && isset($this->map['activities'][$localId])) {
            return $this->map['activities'][$localId];
        }

        $local = $localId !== null ? $this->local['activities']->firstWhere('id', $localId) : null;
        $code = trim((string) ($local['code'] ?? $sessionRow['activity_code'] ?? ''));
        $name = trim((string) ($local['name'] ?? $sessionRow['activity_name'] ?? ''));

        $activity = ($code !== '' ? Activity::where('code', $code)->first() : null)
            ?? ($name !== '' ? Activity::where('name', $name)->first() : null);

        if (!$activity) {
            $categoryName = trim((string) ($local['category_name'] ?? $sessionRow['category_name'] ?? 'Impor dari Browser'));
            $category = ActivityCategory::where('name', $categoryName)->first()
                ?? ActivityCategory::create(['code' => $this->uniqueCode(ActivityCategory::class, $categoryName, 30), 'name' => mb_substr($categoryName, 0, 100)]);

            $activity = Activity::create([
                'activity_category_id' => $category->id,
                'code' => $code !== '' ? mb_substr($code, 0, 50) : $this->uniqueCode(Activity::class, $name ?: 'KEGIATAN', 50),
                'name' => $name !== '' ? mb_substr($name, 0, 150) : 'Kegiatan Impor',
                'location' => $this->str($local['location'] ?? $sessionRow['location'] ?? null, 100),
                'allow_manual' => (bool) ($local['allow_manual'] ?? true),
                'allow_qr' => (bool) ($local['allow_qr'] ?? true),
                'allow_rfid' => (bool) ($local['allow_rfid'] ?? true),
            ]);
            $this->count('activities', 'created');
        } else {
            $this->count('activities', 'matched');
        }

        if ($localId !== null) $this->map['activities'][$localId] = $activity->id;

        return $activity->id;
    }

    // ------------------------------------------------------------------ Peserta & absensi

    private function importParticipants(): void
    {
        foreach ($this->local['participants'] as $row) {
            $sessionId = $this->map['sessions'][$row['attendance_session_id'] ?? ''] ?? null;
            $studentId = $this->mapStudent($row);
            if (!$sessionId || !$studentId) {
                $this->count('participants', 'unmatched');
                continue;
            }

            $p = AttendanceSessionParticipant::firstOrCreate(
                ['attendance_session_id' => $sessionId, 'student_id' => $studentId],
                ['participant_source' => $this->str($row['participant_source'] ?? 'manual', 64), 'eligibility_status' => strtoupper((string) ($row['eligibility_status'] ?? 'ELIGIBLE'))]
            );
            $this->count('participants', $p->wasRecentlyCreated ? 'created' : 'existing');
        }
    }

    private function importRecords(): void
    {
        foreach ($this->local['records'] as $row) {
            $sessionId = $this->map['sessions'][$row['attendance_session_id'] ?? ''] ?? null;
            $studentId = $this->mapStudent($row);
            if (!$sessionId || !$studentId) {
                $this->count('records', 'unmatched');
                continue;
            }

            $status = AttendanceStatus::tryFrom((string) ($row['status'] ?? ''));
            if (!$status) {
                $this->count('records', 'failed');
                $this->warn("Absensi {$row['student_name']} status '{$row['status']}' tidak dikenal, dilewati.");
                continue;
            }

            $existing = AttendanceRecord::where('attendance_session_id', $sessionId)->where('student_id', $studentId)->first();
            if ($existing) {
                if ($existing->status !== $status) {
                    $this->warn("Absensi {$row['student_name']} sesi #{$sessionId}: server '{$existing->status->value}', browser '{$status->value}'. Data server dipertahankan.");
                }
                $this->count('records', 'existing');
                continue;
            }

            AttendanceRecord::create([
                'attendance_session_id' => $sessionId,
                'student_id' => $studentId,
                'status' => $status,
                'method' => AttendanceMethod::tryFrom((string) ($row['method'] ?? '')) ?? AttendanceMethod::MANUAL,
                'check_in_at' => $this->dateTime($row['check_in_at'] ?? null),
                'late_minutes' => max(0, min(65535, (int) ($row['late_minutes'] ?? 0))),
                'notes' => trim(($row['notes'] ?? '') . ' [Impor dari browser]'),
                'metadata' => [
                    'imported_from' => 'localStorage',
                    'local_id' => $row['id'] ?? null,
                    'recorded_by_name' => $row['recorded_by'] ?? null,
                ],
            ]);
            $this->count('records', 'created');
        }
    }

    private function mapStudent(array $row): ?int
    {
        $localId = $row['student_id'] ?? null;
        if ($localId !== null && isset($this->map['students'][$localId])) {
            return $this->map['students'][$localId];
        }
        $nis = trim((string) ($row['student_number'] ?? ''));
        if ($nis === '') {
            return null;
        }
        if (!$this->includeDemo && in_array($nis, $this->demo['student_numbers'] ?? [], true)) {
            return null;
        }

        return Student::whereRaw('LOWER(student_number) = ?', [mb_strtolower($nis)])->value('id');
    }

    // ------------------------------------------------------------------ Izin santri

    private function importExcusals(): void
    {
        foreach ($this->local['excusals'] as $row) {
            if (!$this->includeDemo && !$this->isUserCreated($row)) {
                $this->count('excusals', 'demo_skipped');
                continue;
            }
            $studentId = $this->mapStudent($row);
            $start = $this->dateTime($row['start_at'] ?? null);
            $end = $this->dateTime($row['end_at'] ?? null);
            $type = in_array($row['type'] ?? '', StudentExcusal::TYPES, true) ? $row['type'] : null;
            if (!$studentId) {
                $this->count('excusals', 'unmatched');
                continue;
            }
            if (!$start || !$end || !$type) {
                $this->count('excusals', 'failed');
                $this->warn('Izin ' . ($row['student_name'] ?? '') . ': jenis/tanggal tidak valid, dilewati.');
                continue;
            }

            $dup = StudentExcusal::where('student_id', $studentId)->where('type', $type)
                ->where('start_at', $start)->where('end_at', $end)->exists();
            if ($dup) {
                $this->count('excusals', 'existing');
                continue;
            }

            $status = in_array($row['status'] ?? '', StudentExcusal::STATUSES, true) ? $row['status'] : 'approved';
            StudentExcusal::create([
                'student_id' => $studentId,
                'type' => $type,
                'start_at' => $start,
                'end_at' => $end,
                'reason' => mb_substr((string) ($row['reason'] ?? '-'), 0, 500),
                'status' => $status,
                'notes' => trim(($row['notes'] ?? '') . ' [Impor dari browser' . (!empty($row['approved_by']) ? ', disetujui ' . $row['approved_by'] : '') . ']'),
                'approved_at' => $status === 'approved' ? ($this->dateTime($row['approved_at'] ?? null) ?? $start) : null,
                'created_by_name' => $this->str($row['created_by'] ?? null, 150),
            ]);
            $this->count('excusals', 'created');
        }
    }

    // ------------------------------------------------------------------ SDM

    private function importStaff(): void
    {
        foreach ($this->local['staff'] as $row) {
            $number = trim((string) ($row['staff_number'] ?? ''));
            $name = trim((string) ($row['name'] ?? ''));
            if ($number === '' || $name === '') {
                $this->count('staff', 'failed');
                continue;
            }
            if (!$this->includeDemo && in_array($number, $this->demo['staff_numbers'] ?? [], true)) {
                $this->count('staff', 'demo_skipped');
                continue;
            }

            $existing = StaffProfile::withTrashed()->where('staff_number', $number)->first();
            if ($existing) {
                if (isset($row['id'])) $this->map['staff'][$row['id']] = $existing->id;
                $this->count('staff', 'existing');
                continue;
            }

            $attrs = [
                'staff_number' => mb_substr($number, 0, 40),
                'name' => mb_substr($name, 0, 150),
                'gender' => in_array($row['gender'] ?? 'male', ['female', 'P'], true) ? 'P' : 'L',
                'staff_type' => in_array($row['staff_type'] ?? '', StaffProfile::TYPES, true) ? $row['staff_type'] : 'other',
                'employment_status' => in_array($row['employment_status'] ?? '', StaffProfile::EMPLOYMENT, true) ? $row['employment_status'] : 'permanent',
                'phone' => $this->str($row['phone'] ?? null, 30),
                'email' => $this->str($row['email'] ?? null, 191),
                'department' => $this->str($row['department'] ?? null, 100),
                'position' => $this->str($row['position'] ?? null, 100),
                'join_date' => $this->date($row['join_date'] ?? null),
                'requires_daily_attendance' => (bool) ($row['requires_daily_attendance'] ?? true),
                'is_active' => (bool) ($row['is_active'] ?? true),
            ];
            $qr = trim((string) ($row['qr_token'] ?? ''));
            if ($qr !== '' && strlen($qr) <= 64 && !StaffProfile::withTrashed()->where('qr_token', $qr)->exists()) {
                $attrs['qr_token'] = $qr;
            }
            $rfid = Student::normalizeRfidUid($this->str($row['rfid_uid'] ?? null, 64));
            if ($rfid) {
                if (StaffProfile::withTrashed()->where('rfid_uid', $rfid)->exists() || Student::withTrashed()->where('rfid_uid', $rfid)->exists()) {
                    $this->warn("Kartu RFID {$rfid} milik SDM {$name} sudah dipakai orang lain; RFID tidak diimpor.");
                } else {
                    $attrs['rfid_uid'] = $rfid;
                }
            }

            $staff = StaffProfile::create($attrs);
            if (isset($row['id'])) $this->map['staff'][$row['id']] = $staff->id;
            $this->count('staff', 'created');
        }
    }

    private function mapStaff(array $row): ?int
    {
        $localId = $row['staff_id'] ?? null;
        if ($localId !== null && isset($this->map['staff'][$localId])) {
            return $this->map['staff'][$localId];
        }
        $number = trim((string) ($row['staff_number'] ?? ''));

        return $number !== '' ? StaffProfile::where('staff_number', $number)->value('id') : null;
    }

    private function importStaffRecords(): void
    {
        foreach ($this->local['staff_records'] as $row) {
            if (($row['attendance_type'] ?? 'daily') !== 'daily') {
                continue; // presensi mengajar/melatih belum dipindahkan ke server
            }
            if (!$this->includeDemo && !$this->isUserCreated($row)) {
                $this->count('staff_records', 'demo_skipped');
                continue;
            }
            $staffId = $this->mapStaff($row);
            $date = $this->date($row['attendance_date'] ?? null);
            $status = in_array($row['status'] ?? '', StaffAttendanceRecord::STATUSES, true) ? $row['status'] : null;
            if (!$staffId) {
                $this->count('staff_records', 'unmatched');
                continue;
            }
            if (!$date || !$status) {
                $this->count('staff_records', 'failed');
                continue;
            }
            $exists = StaffAttendanceRecord::where('staff_profile_id', $staffId)->whereDate('attendance_date', $date)
                ->where('attendance_type', 'daily')->where('context_key', 'daily')->exists();
            if ($exists) {
                $this->count('staff_records', 'existing');
                continue;
            }

            StaffAttendanceRecord::create([
                'staff_profile_id' => $staffId,
                'attendance_date' => $date,
                'attendance_type' => 'daily',
                'context_key' => 'daily',
                'status' => $status,
                'check_in_at' => $this->dateTime($row['check_in_at'] ?? null),
                'check_out_at' => $this->dateTime($row['check_out_at'] ?? null),
                'check_in_method' => $this->str($row['check_in_method'] ?? null, 20),
                'check_out_method' => $this->str($row['check_out_method'] ?? null, 20),
                'late_minutes' => max(0, min(65535, (int) ($row['late_minutes'] ?? 0))),
                'early_leave_minutes' => max(0, min(65535, (int) ($row['early_leave_minutes'] ?? 0))),
                'recorded_by_name' => $this->str($row['recorded_by'] ?? null, 150),
                'notes' => trim(($row['notes'] ?? '') . ' [Impor dari browser]'),
                'metadata' => ['imported_from' => 'localStorage', 'local_id' => $row['id'] ?? null],
            ]);
            $this->count('staff_records', 'created');
        }
    }

    private function importStaffAbsences(): void
    {
        foreach ($this->local['staff_absences'] as $row) {
            if (!$this->includeDemo && !$this->isUserCreated($row)) {
                $this->count('staff_absences', 'demo_skipped');
                continue;
            }
            $staffId = $this->mapStaff($row);
            $start = $this->dateTime($row['start_at'] ?? null);
            $end = $this->dateTime($row['end_at'] ?? null);
            $type = in_array($row['type'] ?? '', StaffAbsenceRequest::TYPES, true) ? $row['type'] : null;
            if (!$staffId) {
                $this->count('staff_absences', 'unmatched');
                continue;
            }
            if (!$start || !$end || !$type) {
                $this->count('staff_absences', 'failed');
                continue;
            }
            if (StaffAbsenceRequest::where('staff_profile_id', $staffId)->where('type', $type)->where('start_at', $start)->where('end_at', $end)->exists()) {
                $this->count('staff_absences', 'existing');
                continue;
            }

            $status = in_array($row['status'] ?? '', ['pending', 'approved', 'rejected', 'cancelled'], true) ? $row['status'] : 'pending';
            StaffAbsenceRequest::create([
                'staff_profile_id' => $staffId,
                'type' => $type,
                'start_at' => $start,
                'end_at' => $end,
                'reason' => mb_substr((string) ($row['reason'] ?? '-'), 0, 500),
                'status' => $status,
                'decided_by_name' => $this->str($row['approved_by'] ?? $row['rejected_by'] ?? null, 150),
                'decided_at' => $this->dateTime($row['approved_at'] ?? $row['rejected_at'] ?? null),
                'decision_notes' => trim(($row['decision_notes'] ?? '') . ' [Impor dari browser]'),
            ]);
            $this->count('staff_absences', 'created');
        }
    }

    // ------------------------------------------------------------------ Helper

    private function reset(): void
    {
        $this->warnings = [];
        $this->local = [];
        $this->map = ['classrooms' => [], 'rooms' => [], 'activities' => [], 'students' => [], 'sessions' => [], 'staff' => []];
        $blank = fn (array $keys) => array_fill_keys($keys, 0);
        $this->report = [
            'students' => $blank(['created', 'updated', 'existing', 'demo_skipped', 'failed']),
            'classrooms' => $blank(['created', 'matched']),
            'dormitories' => $blank(['created']),
            'dormitory_rooms' => $blank(['created', 'matched']),
            'activities' => $blank(['created', 'matched']),
            'sessions' => $blank(['created', 'existing', 'demo_skipped', 'failed']),
            'participants' => $blank(['created', 'existing', 'unmatched']),
            'records' => $blank(['created', 'existing', 'unmatched', 'failed']),
            'excusals' => $blank(['created', 'existing', 'demo_skipped', 'unmatched', 'failed']),
            'staff' => $blank(['created', 'updated', 'existing', 'demo_skipped', 'failed']),
            'staff_records' => $blank(['created', 'existing', 'demo_skipped', 'unmatched', 'failed']),
            'staff_absences' => $blank(['created', 'existing', 'demo_skipped', 'unmatched', 'failed']),
        ];
    }

    private function loadDemoIdentifiers(): array
    {
        $path = database_path('data/demo-identifiers.json');

        return is_file($path) ? (json_decode((string) file_get_contents($path), true) ?: []) : [];
    }

    private function count(string $entity, string $key): void
    {
        $this->report[$entity][$key] = ($this->report[$entity][$key] ?? 0) + 1;
    }

    private function warn(string $message): void
    {
        $this->warnings[] = $message;
    }

    private function str(mixed $v, int $max): ?string
    {
        if ($v === null || is_array($v)) return null;
        $s = trim((string) $v);

        return $s === '' ? null : mb_substr($s, 0, $max);
    }

    private function date(mixed $v): ?string
    {
        try {
            return $v ? Carbon::parse((string) $v)->toDateString() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function dateTime(mixed $v): ?Carbon
    {
        try {
            return $v ? Carbon::parse((string) $v) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function guessGrade(string $name): int
    {
        $map = ['XII' => 12, 'XI' => 11, 'IX' => 9, 'X' => 10, 'VIII' => 8, 'VII' => 7];
        foreach ($map as $roman => $grade) {
            if (preg_match('/\b' . $roman . '\b/i', $name)) return $grade;
        }
        if (preg_match('/\b(7|8|9|10|11|12)\b/', $name, $m)) return (int) $m[1];

        return 7;
    }

    private function uniqueCode(string $model, string $base, int $max): string
    {
        $slug = strtoupper(Str::slug($base, '-')) ?: 'IMPOR';
        $code = mb_substr($slug, 0, $max - 4);
        $candidate = $code;
        $i = 1;
        while ($model::where('code', $candidate)->exists()) {
            $candidate = $code . '-' . $i++;
        }

        return $candidate;
    }
}
