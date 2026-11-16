<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceResultCode;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Services\Attendance\AttendanceResult;
use App\Services\Attendance\AttendanceService;
use App\Services\Iot\IotDeviceResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class IotDeviceApiController extends Controller
{
    public function __construct(
        protected AttendanceService $attendanceService,
        protected IotDeviceResolver $deviceResolver
    ) {}

    /**
     * Endpoint Tap Kartu RFID dari Hardware ESP32 / Nexabsen V.4.
     * Route: POST /api/tap.php, POST /tap.php, POST /api/v1/iot/rfid-tap
     *
     * Semua aturan absensi (santri aktif, status sesi, batas waktu, metode RFID diizinkan,
     * peserta terdaftar, anti tap-ganda) dijalankan oleh AttendanceService — sama persis
     * dengan absensi QR & manual, sehingga laporan konsisten antar-metode.
     */
    public function handleRfidTap(Request $request): JsonResponse
    {
        // 1. Ekstrak payload (raw JSON, form-data, atau query param)
        $jsonData = json_decode($request->getContent(), true);
        if (!is_array($jsonData)) {
            $jsonData = [];
        }

        $rawUid = $request->input('uid')
            ?? $request->input('rfid_uid')
            ?? $request->input('card_uid')
            ?? ($jsonData['uid'] ?? null)
            ?? ($jsonData['rfid_uid'] ?? null)
            ?? ($jsonData['card_uid'] ?? null);

        $normalizedUid = Student::normalizeRfidUid(is_scalar($rawUid) ? (string) $rawUid : null);
        if (!$normalizedUid) {
            return $this->lcd(false, 'UID_REQUIRED', 'UID Kosong!', 400);
        }

        // 2. API key sudah diverifikasi middleware 'iot.key'. Cek whitelist perangkat.
        $resolved = $this->deviceResolver->resolve($request, $jsonData);
        $device = $resolved['device'];
        if (!$resolved['allowed']) {
            AttendanceDeviceLog::record($device, $device->device_code, 'DEVICE_DISABLED', 'warning',
                'Tap ditolak: perangkat belum diaktifkan admin.', ['uid' => $normalizedUid], $request->ip());
            return $this->lcd(false, $resolved['code'], 'Alat Blm Aktif!', 403, [
                'device' => $device->device_code,
            ]);
        }

        // 2b. Mode alat: perawatan = tolak semua tap; pendaftaran kartu = hanya simpan UID untuk halaman registrasi RFID
        if (($device->mode ?? 'attendance') === 'maintenance') {
            return $this->lcd(false, 'DEVICE_MAINTENANCE', 'Alat Perawatan', 423, ['device' => $device->device_code]);
        }
        if (($device->mode ?? 'attendance') === 'enrollment') {
            Cache::put('last_scanned_rfid', ['uid' => $normalizedUid, 'device' => $device->device_code, 'tapped_at' => now()->format('H:i:s') . ' WIB'], 600);
            AttendanceDeviceLog::record($device, $device->device_code, 'ENROLLMENT_SCAN', 'info', "Kartu {$normalizedUid} dibaca untuk pendaftaran.", ['uid' => $normalizedUid], $request->ip());

            return response()->json(['success' => true, 'code' => 'ENROLLMENT_SCAN', 'message' => 'UID Terbaca', 'rfid_uid' => $normalizedUid, 'device' => $device->device_code], 200);
        }

        // 3. Kartu master teknisi (hanya jika NEXABSEN_MASTER_ADMIN_UID diisi)
        $masterAdminUid = Student::normalizeRfidUid((string) config('services.nexabsen.master_admin_uid', ''));
        if ($masterAdminUid && hash_equals($masterAdminUid, $normalizedUid)) {
            return response()->json([
                'message' => 'Akses Admin',
                'action' => 'RESET_CONFIG',
                'data' => ['name' => 'Admin Teknisi', 'uid' => $normalizedUid],
            ], 200);
        }

        // 4. Identitas santri
        $student = Student::with(['classroom', 'dormitoryRoom'])->where('rfid_uid', $normalizedUid)->first();
        // 4b. Bukan kartu santri? Cek kartu guru/SDM -> presensi harian SDM (masuk/pulang)
        if (!$student) {
            $staff = \App\Models\StaffProfile::where('rfid_uid', $normalizedUid)->first();
            if ($staff) {
                return $this->handleStaffTap($request, $staff, $device, $normalizedUid, $jsonData);
            }
        }

        if (!$student) {
            // Disimpan agar langsung muncul di halaman /registrasi-rfid
            Cache::put('last_scanned_rfid', [
                'uid' => $normalizedUid,
                'device' => $device->device_code,
                'tapped_at' => now()->format('H:i:s') . ' WIB',
            ], 600);
            AttendanceDeviceLog::record($device, $device->device_code, 'RFID_NOT_REGISTERED', 'warning',
                "Kartu {$normalizedUid} belum terdaftar ke santri.", ['uid' => $normalizedUid], $request->ip());

            return $this->lcd(false, 'CARD_NOT_REGISTERED', 'Kartu Ditolak!', 404, [
                'data' => ['name' => 'UID: ' . $normalizedUid, 'uid' => $normalizedUid],
                'rfid_uid' => $normalizedUid,
                'device' => $device->device_code,
                'timestamp' => now()->format('Y-m-d H:i:s'),
            ]);
        }

        // 5. Waktu tap (antrean offline ESP32 diterima dalam batas wajar)
        $checkInTime = $this->resolveCheckInTime($request->input('tapped_at') ?? ($jsonData['tapped_at'] ?? null));

        // 6. Pilih sesi yang tepat untuk santri ini
        $session = $this->resolveSession($request, $student, $checkInTime, $device);
        if (!$session) {
            AttendanceDeviceLog::record($device, $device->device_code, 'NO_ACTIVE_SESSION', 'warning',
                "Tap {$student->name} ditolak: tidak ada sesi terbuka.", ['uid' => $normalizedUid, 'student_id' => $student->id], $request->ip());

            return $this->lcd(false, 'NO_ACTIVE_SESSION', 'Tdk Ada Sesi!', 409, [
                'data' => ['name' => $student->name, 'uid' => $normalizedUid],
                'device' => $device->device_code,
            ]);
        }

        // 7. Catat lewat AttendanceService (validasi lengkap + transaksi + event)
        $result = $this->attendanceService->record(
            session: $session,
            student: $student,
            method: AttendanceMethod::RFID,
            device: $device,
            operator: null,
            checkInTime: $checkInTime,
            notes: 'Tap via Hardware [' . $device->device_code . ']',
            metadata: ['source' => 'iot', 'device_ip' => $request->ip()],
        );

        $ok = in_array($result->code, [AttendanceResultCode::SUCCESS, AttendanceResultCode::ALREADY_RECORDED], true);
        AttendanceDeviceLog::record($device, $device->device_code, 'CARD_SCANNED', $ok ? 'info' : 'warning',
            "{$student->name}: {$result->message}",
            ['uid' => $normalizedUid, 'student_id' => $student->id, 'session_id' => $session->id, 'code' => $result->code->value],
            $request->ip());

        return $this->respondFromResult($result, $student, $session, $device, $normalizedUid);
    }

    /**
     * Tap kartu guru/SDM: check-in pada tap pertama, check-out pada tap berikutnya (jadwal di config/siuba.php).
     */
    private function handleStaffTap(Request $request, \App\Models\StaffProfile $staff, AttendanceDevice $device, string $uid, array $jsonData): JsonResponse
    {
        $at = $this->resolveCheckInTime($request->input('tapped_at') ?? ($jsonData['tapped_at'] ?? null));
        $r = app(\App\Services\Staff\StaffDailyAttendanceService::class)->scan($staff, 'rfid', $at, null, $device);

        [$lcd, $http] = match ($r['code']) {
            'CHECK_IN_SUCCESS' => [($r['record']->status ?? '') === 'late' ? 'Masuk (TELAT)' : 'Masuk Sukses', 200],
            'CHECK_OUT_SUCCESS' => ['Pulang Sukses', 200],
            'ALREADY_CHECKED_OUT', 'TOO_SOON_TO_CHECK_OUT' => ['Sudah Absen', 200],
            'STAFF_INACTIVE' => ['SDM Nonaktif!', 403],
            'ON_APPROVED_ABSENCE' => ['Sedang Izin', 409],
            'NOT_WORKING_DAY' => ['Hari Libur', 409],
            'CHECK_IN_NOT_OPEN' => ['Blm Waktunya', 409],
            'CHECK_IN_CLOSED' => ['Waktu Habis!', 409],
            default => ['Gagal!', 422],
        };

        AttendanceDeviceLog::record($device, $device->device_code, 'CARD_SCANNED', $r['success'] ? 'info' : 'warning',
            "SDM {$staff->name}: {$r['message']}", ['uid' => $uid, 'staff_id' => $staff->id, 'code' => $r['code']], $request->ip());

        $record = $r['record'] ?? null;

        return response()->json([
            'success' => $r['success'] || in_array($r['code'], ['ALREADY_CHECKED_OUT', 'TOO_SOON_TO_CHECK_OUT'], true),
            'code' => $r['code'],
            'message' => $lcd,
            'detail' => $r['message'],
            'data' => ['name' => $staff->name, 'uid' => $uid],
            'person_type' => 'staff',
            'staff' => ['id' => $staff->id, 'name' => $staff->name, 'staff_number' => $staff->staff_number, 'staff_type' => $staff->staff_type],
            'mode' => $r['mode'] ?? null,
            'status' => $record?->status,
            'late_minutes' => (int) ($record?->late_minutes ?? 0),
            'check_in_at' => $record?->check_in_at ? $record->check_in_at->format('H:i:s') . ' WIB' : null,
            'check_out_at' => $record?->check_out_at ? $record->check_out_at->format('H:i:s') . ' WIB' : null,
            'device' => $device->device_code,
        ], $http);
    }

    /**
     * Pilih sesi untuk tap ini:
     *  a. session_id dari perangkat (jika dikirim)
     *  b. sesi OPEN hari ini yang jendela waktunya mencakup jam tap DAN santri adalah pesertanya
     *  c. sesi OPEN hari ini lainnya (agar AttendanceService memberi alasan penolakan yang jelas)
     *  d. jika hari ini belum ada sesi sama sekali -> sesi "Presensi Harian" otomatis (bisa dimatikan)
     */
    private function resolveSession(Request $request, Student $student, Carbon $checkInTime, ?\App\Models\AttendanceDevice $device = null): ?AttendanceSession
    {
        // Alat yang dikunci ke satu sesi (dari halaman Perangkat) memakai sesi itu selama masih terbuka
        if ($device?->current_session_id) {
            $locked = AttendanceSession::with('activity')->whereKey($device->current_session_id)->where('status', SessionStatus::OPEN)->first();
            if ($locked) {
                return $locked;
            }
        }

        if ($request->filled('session_id')) {
            return AttendanceSession::with('activity')
                ->whereKey((int) $request->input('session_id'))
                ->whereDate('session_date', $checkInTime->toDateString())
                ->first();
        }

        $openSessions = AttendanceSession::with('activity')
            ->where('status', SessionStatus::OPEN)
            ->whereDate('session_date', $checkInTime->toDateString())
            ->orderByDesc('start_at')
            ->get();

        if ($openSessions->isNotEmpty()) {
            $sessionIds = $openSessions->pluck('id');
            $sessionsWithParticipants = AttendanceSessionParticipant::whereIn('attendance_session_id', $sessionIds)
                ->distinct()->pluck('attendance_session_id')->flip();
            $studentSessions = AttendanceSessionParticipant::whereIn('attendance_session_id', $sessionIds)
                ->where('student_id', $student->id)
                ->pluck('attendance_session_id')->flip();

            $eligible = $openSessions->filter(function (AttendanceSession $s) use ($checkInTime, $sessionsWithParticipants, $studentSessions) {
                $inWindow = (!$s->start_at || $checkInTime->greaterThanOrEqualTo($s->start_at))
                    && (!$s->end_at || $checkInTime->lessThanOrEqualTo($s->end_at));
                $isParticipant = !$sessionsWithParticipants->has($s->id) || $studentSessions->has($s->id);
                $allowsRfid = !$s->activity || $s->activity->allowsMethod(AttendanceMethod::RFID);

                return $inWindow && $isParticipant && $allowsRfid;
            });

            return $eligible->first() ?? $openSessions->first();
        }

        $hasAnySessionToday = AttendanceSession::whereDate('session_date', $checkInTime->toDateString())->exists();
        if (!$hasAnySessionToday && config('services.nexabsen.auto_daily_session', true)) {
            return $this->createDailySession();
        }

        return null;
    }

    private function createDailySession(): AttendanceSession
    {
        $activity = Activity::where('code', 'HARIAN')->first();
        if (!$activity) {
            $category = ActivityCategory::firstOrCreate(['code' => 'UMUM'], ['name' => 'Kegiatan Umum']);
            $activity = Activity::create([
                'activity_category_id' => $category->id,
                'code' => 'HARIAN',
                'name' => 'Presensi Harian Santri',
                'allow_rfid' => true,
                'allow_qr' => true,
                'allow_manual' => true,
            ]);
        }

        return AttendanceSession::firstOrCreate(
            ['session_code' => 'SESI-' . today()->format('Ymd') . '-HARIAN'],
            [
                'activity_id' => $activity->id,
                'session_date' => today(),
                'start_at' => today()->setTime(6, 0, 0),
                'present_until' => today()->setTime(8, 0, 0),
                'late_until' => today()->setTime(9, 0, 0),
                'end_at' => today()->setTime(22, 0, 0),
                'status' => SessionStatus::OPEN,
                'opened_at' => now(),
            ]
        )->load('activity');
    }

    private function resolveCheckInTime(mixed $tappedAtParam): Carbon
    {
        $now = now();
        if (!$tappedAtParam || !is_scalar($tappedAtParam)) {
            return $now;
        }

        try {
            $candidate = Carbon::parse((string) $tappedAtParam);
            $maxBack = (int) config('services.nexabsen.max_offline_backdate_minutes', 720);
            if ($candidate->between($now->copy()->subMinutes($maxBack), $now->copy()->addMinutes(2))) {
                return $candidate;
            }
        } catch (\Throwable $e) {
            // format waktu tidak valid -> pakai jam server
        }

        return $now;
    }

    /**
     * Ubah hasil AttendanceService menjadi respons singkat untuk layar LCD perangkat.
     */
    private function respondFromResult(
        AttendanceResult $result,
        Student $student,
        AttendanceSession $session,
        AttendanceDevice $device,
        string $uid
    ): JsonResponse {
        [$lcd, $httpStatus] = match ($result->code) {
            AttendanceResultCode::SUCCESS => [
                $result->attendanceRecord?->status === AttendanceStatus::LATE ? 'Absen (TELAT)' : 'Absen Sukses', 200,
            ],
            AttendanceResultCode::ALREADY_RECORDED => ['Sudah Absen', 200],
            AttendanceResultCode::STUDENT_INACTIVE => ['Santri Nonaktif!', 403],
            AttendanceResultCode::STUDENT_NOT_PARTICIPANT => ['Bukan Peserta!', 403],
            AttendanceResultCode::INVALID_METHOD => ['RFID Tdk Diizinkan', 409],
            AttendanceResultCode::SESSION_NOT_OPEN => ['Sesi Blm Dibuka', 409],
            AttendanceResultCode::SESSION_CLOSED => ['Sesi Ditutup', 409],
            AttendanceResultCode::OUTSIDE_ATTENDANCE_TIME => ['Waktu Habis!', 409],
            default => ['Gagal!', 422],
        };

        $record = $result->attendanceRecord;
        $isOk = in_array($result->code, [AttendanceResultCode::SUCCESS, AttendanceResultCode::ALREADY_RECORDED], true);

        return response()->json([
            'success' => $isOk,
            'code' => $result->code->value,
            'message' => $lcd,
            'detail' => $result->message,
            'data' => ['name' => $student->name, 'uid' => $uid],
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'gender' => \App\Http\Transformers\SpaTransformer::val($student->gender),
                'classroom' => $student->classroom?->name ?? 'Semua Santri',
            ],
            'session' => [
                'id' => $session->id,
                'code' => $session->session_code,
                'title' => $session->activity?->name ?? $session->session_code,
            ],
            'status' => $record?->status?->value,
            'late_minutes' => $record?->late_minutes ?? 0,
            'check_in_at' => $record?->check_in_at ? $record->check_in_at->format('H:i:s') . ' WIB' : null,
            'device' => $device->device_code,
        ], $httpStatus);
    }

    private function lcd(bool $success, string $code, string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => $success,
            'code' => $code,
            'message' => $message,
        ], $extra), $status);
    }

    /**
     * Ambil UID Kartu Terakhir yang di-tap pada Hardware (Untuk Pendaftaran Otomatis).
     * Route: GET /api/v1/iot/last-scan
     */
    public function getLastScan(): JsonResponse
    {
        $lastScanned = Cache::get('last_scanned_rfid');
        return response()->json([
            'success' => true,
            'data' => $lastScanned,
        ]);
    }

    /**
     * Ambil Daftar Santri & Status Kepemilikan RFID.
     * Route: GET /api/v1/iot/students
     */
    public function getStudentsWithRfid(Request $request): JsonResponse
    {
        $query = Student::with(['classroom', 'dormitoryRoom'])->orderBy('name', 'asc');

        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('student_number', 'like', "%{$s}%")
                  ->orWhere('rfid_uid', 'like', "%{$s}%");
            });
        }

        if ($request->input('filter') === 'without_rfid') {
            $query->where(function ($q) {
                $q->whereNull('rfid_uid')->orWhere('rfid_uid', '');
            });
        } elseif ($request->input('filter') === 'with_rfid') {
            $query->whereNotNull('rfid_uid')->where('rfid_uid', '!=', '');
        }

        $allStudents = $query->get();
        $totalInDb = Student::count();
        $withRfidCount = Student::whereNotNull('rfid_uid')->where('rfid_uid', '!=', '')->count();

        $students = $allStudents->map(function ($stu) {
            return [
                'id' => $stu->id,
                'name' => $stu->name,
                'student_number' => $stu->student_number,
                'nisn' => $stu->nisn,
                'gender' => \App\Http\Transformers\SpaTransformer::val($stu->gender),
                'classroom' => $stu->classroom?->name ?? 'Belum ada kelas',
                'dormitory' => $stu->dormitoryRoom?->name ?? 'Non-Asrama',
                'rfid_uid' => $stu->rfid_uid,
                'has_rfid' => !empty($stu->rfid_uid),
            ];
        });

        return response()->json([
            'success' => true,
            'total' => $totalInDb,
            'with_rfid' => $withRfidCount,
            'without_rfid' => $totalInDb - $withRfidCount,
            'data' => $students,
        ]);
    }

    /**
     * Tautkan Kartu RFID ke Santri.
     * Route: POST /api/v1/iot/register-rfid
     */
    public function registerRfid(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'rfid_uid' => 'required|string|max:64',
        ]);

        $normalizedUid = Student::normalizeRfidUid((string) $request->input('rfid_uid'));
        if (!$normalizedUid) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor UID RFID tidak boleh kosong atau tidak valid.',
            ], 422);
        }

        // Cek apakah UID sudah digunakan oleh santri lain
        $existing = Student::where('rfid_uid', $normalizedUid)
            ->where('id', '!=', $request->input('student_id'))
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => "Kartu RFID [{$normalizedUid}] sudah terdaftar pada santri: {$existing->name} (NIS: {$existing->student_number}).",
            ], 422);
        }

        $staffOwner = \App\Models\StaffProfile::withTrashed()->where('rfid_uid', $normalizedUid)->first();
        if ($staffOwner) {
            return response()->json([
                'success' => false,
                'message' => "Kartu RFID [{$normalizedUid}] sudah terdaftar pada SDM: {$staffOwner->name}.",
            ], 422);
        }

        $student = Student::findOrFail($request->input('student_id'));
        $student->rfid_uid = $normalizedUid;
        $student->save();

        Cache::forget('last_scanned_rfid');

        return response()->json([
            'success' => true,
            'message' => "Alhamdulillah, kartu RFID [{$normalizedUid}] berhasil didaftarkan untuk santri {$student->name}.",
            'data' => [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'rfid_uid' => $student->rfid_uid,
            ],
        ]);
    }

    /**
     * Lepas / Hapus Tautan Kartu RFID dari Santri.
     * Route: POST /api/v1/iot/unregister-rfid
     */
    public function unregisterRfid(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
        ]);

        $student = Student::findOrFail($request->input('student_id'));
        $oldUid = $student->rfid_uid;
        $student->rfid_uid = null;
        $student->save();

        return response()->json([
            'success' => true,
            'message' => "Kartu RFID [{$oldUid}] berhasil dilepas dari santri {$student->name}.",
        ]);
    }

    /**
     * Heartbeat / Ping dari ESP32 untuk mendeteksi status Online/Offline perangkat di dashboard.
     * Route: GET/POST /api/v1/iot/ping
     */
    public function ping(Request $request): JsonResponse
    {
        $resolved = $this->deviceResolver->resolve($request);
        $device = $resolved['device'];

        if (!$resolved['allowed']) {
            return response()->json([
                'success' => false,
                'code' => $resolved['code'],
                'message' => 'Alat Blm Aktif!',
                'device' => $device->device_code,
                'server_time' => now()->format('Y-m-d H:i:s'),
            ], 403);
        }

        $activeSession = AttendanceSession::where('status', SessionStatus::OPEN)
            ->whereDate('session_date', today())
            ->latest('opened_at')
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'ESP32 Ping OK - Server Online',
            'device' => $device->device_code,
            'server_time' => now()->format('Y-m-d H:i:s'),
            'active_session' => $activeSession ? [
                'id' => $activeSession->id,
                'title' => $activeSession->activity?->name ?? $activeSession->session_code,
                'code' => $activeSession->session_code,
            ] : null,
        ]);
    }

    /**
     * Info Sesi Presensi Aktif untuk ditampilkan di Layar LCD/OLED ESP32.
     * Route: GET /api/v1/iot/active-sessions
     */
    public function getActiveSessions(): JsonResponse
    {
        $sessions = AttendanceSession::with('activity')
            ->whereDate('session_date', today())
            ->where('status', SessionStatus::OPEN)
            ->get();

        return response()->json([
            'success' => true,
            'count' => $sessions->count(),
            'sessions' => $sessions->map(fn($s) => [
                'id' => $s->id,
                'code' => $s->session_code,
                'title' => $s->activity?->name ?? $s->session_code,
                'start_at' => $s->start_at?->format('H:i'),
                'end_at' => $s->end_at?->format('H:i'),
            ]),
        ]);
    }
}
