<?php

namespace App\Http\Controllers\Api;

use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class IotDeviceApiController extends Controller
{
    /**
     * Endpoint Sinkronisasi Tap Kartu RFID dari Hardware ESP32 / Nexabsen V.4.
     * Route: POST /api/tap.php, POST /tap.php, POST /api/v1/iot/rfid-tap
     */
    public function handleRfidTap(Request $request): JsonResponse
    {
        // 1. Ekstrak Payload secara Tangguh (Mendukung raw JSON php://input, form-data, query param)
        $rawContent = $request->getContent();
        $jsonData = json_decode($rawContent, true);
        if (!is_array($jsonData)) {
            $jsonData = [];
        }

        $rawUid = $request->input('uid') 
            ?? $request->input('rfid_uid') 
            ?? $request->input('card_uid')
            ?? ($jsonData['uid'] ?? null)
            ?? ($jsonData['rfid_uid'] ?? null)
            ?? ($jsonData['card_uid'] ?? null);

        if (!$rawUid || trim((string) $rawUid) === '') {
            return response()->json([
                'success' => false,
                'code' => 'UID_REQUIRED',
                'message' => 'UID Kosong!',
            ], 400);
        }

        // 2. Validasi Keamanan Global API Key (Opsional / Fleksibel)
        $apiKey = $request->header('X-GLOBAL-KEY') ?? $request->header('x-global-key');
        $configuredKey = env('NEXABSEN_GLOBAL_KEY');
        if (!empty($configuredKey) && $apiKey !== $configuredKey) {
            return response()->json([
                'success' => false,
                'message' => 'API Key Salah!',
            ], 401);
        }

        $normalizedUid = Student::normalizeRfidUid((string) $rawUid);

        // 3. Dukungan Reset Konfigurasi via Kartu Master Admin (Nexabsen V4.1)
        $masterAdminUid = strtoupper((string) env('NEXABSEN_MASTER_ADMIN_UID', '99887766'));
        if ($normalizedUid === '99887766' || $normalizedUid === $masterAdminUid) {
            return response()->json([
                'message' => 'Akses Admin',
                'action' => 'RESET_CONFIG',
                'data' => [
                    'name' => 'Admin Teknisi',
                    'uid' => $normalizedUid,
                ],
            ], 200);
        }

        // 4. Catat / Perbarui Status Terminal Hardware ESP32
        $deviceCode = (string) (
            $request->input('device_id') 
            ?? $request->input('device_code') 
            ?? ($jsonData['device_id'] ?? null)
            ?? ($jsonData['device_code'] ?? null) 
            ?? 'NEXABSEN-01'
        );
        $deviceName = (string) ($request->input('device_name') ?? ($jsonData['device_name'] ?? 'Nexabsen RFID Terminal'));
        $deviceLocation = (string) ($request->input('location') ?? ($jsonData['location'] ?? 'Gerbang / Pintu Masuk'));

        $device = AttendanceDevice::firstOrCreate(
            ['device_code' => $deviceCode],
            [
                'device_name' => $deviceName,
                'device_type' => 'rfid_reader',
                'location' => $deviceLocation,
                'is_active' => true,
            ]
        );

        $device->update([
            'last_seen_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        // 5. Cari Identitas Santri Berdasarkan UID Kartu
        $student = Student::with(['classroom', 'dormitoryRoom'])->where('rfid_uid', $normalizedUid)->first();

        if (!$student) {
            // Simpan ke cache agar langsung terdeteksi di portal pendaftaran kartu /registrasi-rfid
            Cache::put('last_scanned_rfid', [
                'uid' => $normalizedUid,
                'device' => $deviceCode,
                'tapped_at' => now()->format('H:i:s') . ' WIB',
            ], 600);

            return response()->json([
                'success' => false,
                'code' => 'CARD_NOT_REGISTERED',
                'message' => 'Kartu Ditolak!',
                'data' => [
                    'name' => 'UID: ' . $normalizedUid,
                    'uid' => $normalizedUid,
                ],
                'rfid_uid' => $normalizedUid,
                'device' => $deviceCode,
                'timestamp' => now()->format('Y-m-d H:i:s'),
            ], 404);
        }

        // 6. Tentukan Jam Tap Nyata (Mendukung Timestamp Recovery antrean offline ESP32)
        $tappedAtParam = $request->input('tapped_at') ?? ($jsonData['tapped_at'] ?? null);
        $checkInTime = $tappedAtParam ? Carbon::parse($tappedAtParam) : now();

        // 7. Resolusi Sesi Presensi Aktif (Smart Resolution)
        $session = null;
        if ($request->filled('session_id')) {
            $session = AttendanceSession::find($request->input('session_id'));
        }

        // Cari sesi yang statusnya OPEN hari ini
        if (!$session) {
            $session = AttendanceSession::where('status', SessionStatus::OPEN)
                ->whereDate('session_date', today())
                ->latest('opened_at')
                ->first();
        }

        // Jika tidak ada yang OPEN eksplisit, cari jadwal kegiatan yang berjalan pada jam ini
        if (!$session) {
            $session = AttendanceSession::whereDate('session_date', today())
                ->where('start_at', '<=', now())
                ->where('end_at', '>=', now())
                ->first();
        }

        // Fallback: Cari sesi terbaru hari ini
        if (!$session) {
            $session = AttendanceSession::whereDate('session_date', today())
                ->latest('id')
                ->first();
        }

        // Fallback Cerdas: Jika sama sekali belum ada sesi hari ini, buat sesi dinamis harian
        if (!$session) {
            $defaultActivity = Activity::first();
            if (!$defaultActivity) {
                $category = ActivityCategory::firstOrCreate(
                    ['code' => 'UMUM'],
                    ['name' => 'Kegiatan Umum']
                );
                $defaultActivity = Activity::create([
                    'activity_category_id' => $category->id,
                    'code' => 'HARIAN',
                    'name' => 'Presensi Harian Santri',
                    'allow_rfid' => true,
                    'allow_qr' => true,
                    'allow_manual' => true,
                ]);
            }

            $session = AttendanceSession::create([
                'session_code' => 'SESI-' . date('Ymd') . '-HARIAN',
                'activity_id' => $defaultActivity->id,
                'session_date' => today(),
                'start_at' => today()->setTime(6, 0, 0),
                'present_until' => today()->setTime(8, 0, 0),
                'late_until' => today()->setTime(9, 0, 0),
                'end_at' => today()->setTime(22, 0, 0),
                'status' => SessionStatus::OPEN,
                'opened_at' => now(),
            ]);
        }

        // 8. Cek Pencegahan Tap Ganda (Double Tap Protection)
        $existingRecord = AttendanceRecord::where('attendance_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existingRecord) {
            return response()->json([
                'success' => true,
                'code' => 'ALREADY_RECORDED',
                'message' => 'Sudah Absen',
                'data' => [
                    'name' => $student->name,
                    'uid' => $normalizedUid,
                ],
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'student_number' => $student->student_number,
                    'gender' => $student->gender?->value ?? $student->gender,
                    'classroom' => $student->classroom?->name ?? 'Semua Santri',
                ],
                'session' => [
                    'id' => $session->id,
                    'code' => $session->session_code,
                    'title' => $session->activity?->name ?? $session->session_code,
                ],
                'check_in_at' => $existingRecord->check_in_at?->format('H:i:s') . ' WIB',
            ], 200);
        }

        // 9. Hitung Status Hadir / Terlambat
        $status = 'present';
        $lateMinutes = 0;

        if ($session->present_until && $checkInTime->gt($session->present_until)) {
            $status = 'late';
            $lateMinutes = max(0, abs((int) $session->present_until->diffInMinutes($checkInTime)));
        }

        // 10. Rekam Data Presensi ke Database
        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => $status,
            'method' => 'rfid',
            'check_in_at' => $checkInTime,
            'late_minutes' => $lateMinutes,
            'attendance_device_id' => $device->id,
            'notes' => 'Tap via Hardware [' . $deviceCode . ']',
        ]);

        $pesanLcd = ($status === 'late') ? 'Absen (TELAT)' : 'Absen Sukses';

        return response()->json([
            'success' => true,
            'code' => 'SUCCESS',
            'message' => $pesanLcd,
            'data' => [
                'name' => $student->name,
                'uid' => $normalizedUid,
            ],
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'student_number' => $student->student_number,
                'gender' => $student->gender?->value ?? $student->gender,
                'classroom' => $student->classroom?->name ?? 'Semua Santri',
            ],
            'session' => [
                'id' => $session->id,
                'code' => $session->session_code,
                'title' => $session->activity?->name ?? $session->session_code,
            ],
            'status' => $status,
            'late_minutes' => $lateMinutes,
            'check_in_at' => $checkInTime->format('H:i:s') . ' WIB',
            'device' => $deviceCode,
        ], 200);
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
                'gender' => $stu->gender?->value ?? $stu->gender,
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
            'rfid_uid' => 'required|string',
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
        $deviceCode = (string) ($request->input('device_code') ?? 'ESP32-DEVICE-01');
        $deviceName = (string) ($request->input('device_name') ?? 'ESP32 RFID Terminal');

        $device = AttendanceDevice::firstOrCreate(
            ['device_code' => $deviceCode],
            [
                'device_name' => $deviceName,
                'device_type' => 'rfid_reader',
                'location' => 'Pintu Masuk',
                'is_active' => true,
            ]
        );

        $device->update([
            'last_seen_at' => now(),
            'ip_address' => $request->ip(),
        ]);

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
