<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Models\AttendanceDeviceLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Adaptor mesin RFID Absensindo (ESP32 Wemos D1 R32 + RC522).
 *
 * Protokol mesin (dari dokumentasi & bagian aplikasi Absensindo yang tidak diacak):
 * - Semua permintaan ke {Server URL}/api/device/... ; balasan {success, code, message, data:{reason,...}}.
 * - Aktivasi: {serial_number, mac_address, firmware_version?} tanpa token → data.token (Bearer).
 * - Lainnya memakai "Authorization: Bearer <token>":
 *     cek       {serial_number, mac_address, firmware_version}
 *     tap       {uid, scanned_at}
 *     heartbeat {uptime}
 * Nama jalur tiap fungsi tidak terlihat (daftar rute pabrik diacak), jadi fungsi dikenali dari isi permintaan;
 * jalur yang dipakai mesin dicatat di log perangkat.
 *
 * Di SIUBA: mesin = baris attendance_devices dengan device_code atau serial_number = Serial Number mesin.
 * Daftarkan lewat Device Management (Kode Perangkat = Serial Number). Bila belum terdaftar, mesin dicatat
 * sebagai NONAKTIF agar admin cukup mengaktifkannya. Token disimpan sebagai hash; MAC dikunci saat aktivasi pertama.
 */
class AbsensindoDeviceApiController extends Controller
{
    public function handle(Request $request, ?string $action = null): JsonResponse
    {
        $action = strtolower((string) $action);
        $body = $request->json()->all() ?: $request->all();
        $bearer = trim((string) $request->bearerToken());

        $kind = match (true) {
            $bearer === '' && isset($body['serial_number']) => 'activate',
            str_contains($action, 'activ') || str_contains($action, 'aktiv') => 'activate',
            isset($body['uid']) || str_contains($action, 'attend') || str_contains($action, 'scan') || str_contains($action, 'absen') => 'attendance',
            isset($body['serial_number']) || str_contains($action, 'cek') || str_contains($action, 'check') => 'cek',
            isset($body['uptime']) || str_contains($action, 'heart') || str_contains($action, 'ping') => 'heartbeat',
            default => 'unknown',
        };

        if ($kind === 'activate') {
            return $this->activate($request, $body, $action);
        }
        if ($kind === 'unknown') {
            AttendanceDeviceLog::record(null, 'ABSENSINDO', 'UNKNOWN_DEVICE_CALL', 'warning',
                "Permintaan mesin Absensindo tidak dikenal: /api/device/{$action}", ['keys' => array_keys($body)], $request->ip());

            return $this->error('Endpoint tidak dikenal.', 404, ['reason' => 'not_found']);
        }

        [$device, $fail] = $this->authenticate($bearer);
        if ($fail) {
            return $fail;
        }
        $this->remember($device, $request, $action);

        return match ($kind) {
            'cek' => $this->cek($device, $body),
            'attendance' => $this->attendance($device, $body, $request),
            default => $this->heartbeat($device),
        };
    }

    // ------------------------------------------------------------------ aktivasi

    private function activate(Request $request, array $body, string $action): JsonResponse
    {
        $v = Validator::make($body, [
            'serial_number' => 'required|string|max:64',
            'mac_address' => 'required|string|max:32',
            'firmware_version' => 'nullable|string|max:40',
        ]);
        if ($v->fails()) {
            return $this->error('Data aktivasi tidak lengkap.', 422, ['reason' => 'validation_error', 'errors' => $v->errors()]);
        }
        $serial = trim($body['serial_number']);
        $mac = strtolower(trim($body['mac_address']));

        $device = AttendanceDevice::where('serial_number', $serial)->first()
            ?? AttendanceDevice::where('device_code', $serial)->first();

        if (!$device) {
            // Belum didaftarkan admin: catat sebagai nonaktif agar langsung muncul di Device Management
            $device = AttendanceDevice::create([
                'device_code' => mb_substr($serial, 0, 50),
                'device_name' => 'Mesin Absensindo ' . mb_substr($serial, -4),
                'device_type' => 'rfid_reader',
                'protocol' => 'absensindo',
                'serial_number' => $serial,
                'is_active' => false,
                'ip_address' => $request->ip(),
                'last_seen_at' => now(),
            ]);
            AttendanceDeviceLog::record($device, $device->device_code, 'DEVICE_PENDING', 'warning',
                "Mesin Absensindo {$serial} meminta aktivasi; aktifkan di Device Management lalu restart mesin.", ['mac' => $mac], $request->ip());

            return $this->error('Device sedang nonaktif.', 403, ['reason' => 'device_inactive', 'require_activation' => false]);
        }

        $device->forceFill(['protocol' => 'absensindo', 'serial_number' => $serial, 'ip_address' => $request->ip(), 'last_seen_at' => now()]);

        if (!$device->is_active) {
            $device->save();

            return $this->error('Device sedang nonaktif.', 403, ['reason' => 'device_inactive', 'require_activation' => false]);
        }

        if ($device->mac_address && strtolower($device->mac_address) !== $mac) {
            $device->save();
            AttendanceDeviceLog::record($device, $device->device_code, 'MAC_MISMATCH', 'warning',
                "MAC {$mac} tidak cocok dengan mesin terdaftar ({$device->mac_address}). Reset pasangan mesin bila memang ganti unit.", [], $request->ip());

            return $this->error('MAC address tidak cocok dengan device ini.', 401, ['reason' => 'mac_address_mismatch']);
        }
        if (AttendanceDevice::where('mac_address', $mac)->where('id', '!=', $device->id)->exists()) {
            $device->save();

            return $this->error('MAC address sudah digunakan device lain.', 409, ['reason' => 'mac_address_taken']);
        }

        // Token baru tiap aktivasi (SIUBA hanya menyimpan hash-nya, jadi token lama tak bisa dikirim ulang)
        $token = Str::random(80);
        $device->forceFill([
            'mac_address' => $mac,
            'firmware_version' => isset($body['firmware_version']) ? mb_substr((string) $body['firmware_version'], 0, 40) : $device->firmware_version,
            'api_token_hash' => hash('sha256', $token),
            'activated_at' => $device->activated_at ?? now(),
        ])->save();
        AttendanceDeviceLog::record($device, $device->device_code, 'DEVICE_ACTIVATED', 'info',
            "Mesin Absensindo {$serial} aktif (MAC {$mac}, firmware " . ($device->firmware_version ?? '-') . ", jalur /api/device/{$action}).", [], $request->ip());

        return $this->success('Aktivasi berhasil', [
            'reason' => 'device_activated',
            'serial_number' => $serial,
            'device_name' => $device->device_name,
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => 31536000,
        ]);
    }

    // ------------------------------------------------------------------ setelah aktivasi

    /** @return array{0: ?AttendanceDevice, 1: ?JsonResponse} */
    private function authenticate(string $bearer): array
    {
        if ($bearer === '') {
            return [null, $this->error('Unauthorized', 401, ['reason' => 'missing_token'])];
        }
        $device = AttendanceDevice::where('protocol', 'absensindo')->where('api_token_hash', hash('sha256', $bearer))->first();
        if (!$device) {
            return [null, $this->error('Unauthorized', 401, ['reason' => 'invalid_token'])];
        }
        if (!$device->is_active) {
            return [null, $this->error('Unauthorized', 401, ['reason' => 'device_inactive'])];
        }

        return [$device, null];
    }

    private function remember(AttendanceDevice $device, Request $request, string $action): void
    {
        $device->forceFill(['last_seen_at' => now(), 'ip_address' => $request->ip()])->save();
    }

    private function cek(AttendanceDevice $device, array $body): JsonResponse
    {
        $serial = trim((string) ($body['serial_number'] ?? ''));
        if ($serial !== '' && $serial !== (string) $device->serial_number) {
            return $this->error('Serial number tidak cocok dengan device ini.', 401, ['reason' => 'serial_number_mismatch']);
        }
        $mac = strtolower(trim((string) ($body['mac_address'] ?? '')));
        if ($mac !== '' && $device->mac_address && strtolower($device->mac_address) !== $mac) {
            return $this->error('MAC address tidak cocok dengan device ini.', 401, ['reason' => 'mac_address_mismatch']);
        }
        if (!empty($body['firmware_version'])) {
            $device->forceFill(['firmware_version' => mb_substr((string) $body['firmware_version'], 0, 40)])->save();
        }

        return $this->success('Device terdaftar', [
            'reason' => 'device_verified',
            'registered' => true,
            'serial_number' => (string) $device->serial_number,
            'device_name' => $device->device_name,
            'status' => 'active',
            'require_activation' => false,
        ]);
    }

    private function heartbeat(AttendanceDevice $device): JsonResponse
    {
        return $this->success('Device online', [
            'reason' => 'heartbeat_received',
            'server_time' => now()->format('Y-m-d H:i:s'),
            'sync_interval' => 60,
        ]);
    }

    private function attendance(AttendanceDevice $device, array $body, Request $request): JsonResponse
    {
        $v = Validator::make($body, ['uid' => 'required|string|max:64', 'scanned_at' => 'required|date']);
        if ($v->fails()) {
            return $this->error('UID tidak valid.', 422, ['reason' => 'invalid_card_code', 'errors' => $v->errors()]);
        }
        $uid = trim($body['uid']);
        // scanned_at dari mesin = jam lokal (zona waktu dipilih di setup mesin; pesantren memakai WIB)
        try {
            $scanned = Carbon::parse($body['scanned_at'], config('app.timezone'));
        } catch (\Throwable) {
            $scanned = now();
        }

        $res = app(IotDeviceApiController::class)->processTapFor($device, $uid, $scanned->format('Y-m-d H:i:s'), $request->ip());
        $r = $res->getData(true);
        $status = $res->getStatusCode();
        $code = (string) ($r['code'] ?? '');
        $name = $r['data']['name'] ?? null;
        $time = $scanned->format('Y-m-d H:i:s');

        $base = [
            'uid' => $r['data']['uid'] ?? $uid,
            'student_nisn' => $r['student']['student_number'] ?? $r['staff']['staff_number'] ?? null,
            'student_name' => $name,
            'student_class' => $r['student']['classroom'] ?? (isset($r['staff']) ? 'SDM' : null),
            'server_time' => now()->format('Y-m-d H:i:s'),
            'time' => $time,
        ];
        $detail = (string) ($r['detail'] ?? $r['message'] ?? '');

        // Kartu belum terdaftar / mode pendaftaran kartu → "KARTU BARU TERDETEKSI" (UID tampil di Registrasi Kartu RFID)
        if (in_array($code, ['CARD_NOT_REGISTERED', 'ENROLLMENT_SCAN'], true)) {
            return $this->error('Kartu baru terdeteksi. Tautkan kartu ke santri/SDM terlebih dahulu.', 409, [
                'reason' => 'new_card_detected', 'card_registered' => true, 'card_code' => $base['uid'], 'card_type' => 'rfid',
            ]);
        }
        if ($code === 'UID_REQUIRED') {
            return $this->error('UID tidak valid.', 422, ['reason' => 'invalid_card_code']);
        }
        if (in_array($code, ['DEVICE_NOT_ACTIVE', 'DEVICE_DISABLED'], true)) {
            return $this->error('Unauthorized', 401, ['reason' => 'device_inactive']);
        }

        $late = ($r['status'] ?? null) === 'late' || str_contains((string) ($r['message'] ?? ''), 'TELAT');
        $isOut = ($r['mode'] ?? null) === 'CHECK_OUT' || $code === 'CHECK_OUT_SUCCESS';

        $map = match ($code) {
            'SUCCESS', 'CHECK_IN_SUCCESS', 'CHECK_IN_CORRECTED' => [true, $late ? 'checkin_late' : 'checkin_on_time',
                $late ? 'Absen masuk berhasil. Status: terlambat.' : 'Absen masuk berhasil. Status: tepat waktu.', 'datang', $late ? 'Terlambat' : 'Tepat Waktu'],
            'CHECK_OUT_SUCCESS' => [true, ($r['early_leave_minutes'] ?? 0) > 0 ? 'checkout_early' : 'checkout_on_time', 'Absen pulang berhasil.', 'pulang', 'Pulang'],
            'ALREADY_RECORDED', 'DUPLICATE_TAP', 'TOO_SOON_TO_CHECK_OUT' => [false, 'already_checked_in', 'Anda sudah absen masuk hari ini', 'datang', null],
            'ALREADY_CHECKED_OUT' => [false, 'already_checked_out', 'Anda sudah absen pulang hari ini', 'pulang', null],
            'NOT_WORKING_DAY' => [false, 'holiday', 'Hari ini libur.', null, null],
            'NO_ACTIVE_SESSION', 'SESSION_NOT_OPEN', 'SESSION_CLOSED', 'OUTSIDE_ATTENDANCE_TIME', 'CHECK_IN_NOT_OPEN', 'CHECK_IN_CLOSED'
                => [false, 'outside_checkin_window', $detail ?: 'Di luar jam absensi.', null, null],
            default => [false, 'attendance_rejected', $detail ?: 'Absensi ditolak.', null, null],
        };
        [$ok, $reason, $message, $type, $label] = $map;
        if ($isOut && $type === 'datang' && $ok) {
            $type = 'pulang';
        }

        $data = $base + ['reason' => $reason];
        if ($type) {
            $data['type'] = $type;
        }
        if ($label) {
            $data['status_label'] = $label;
        }

        return $ok ? $this->success($message, $data) : $this->error($message, 422, $data);
    }

    // ------------------------------------------------------------------ format balasan Absensindo

    private function success(string $message, array $data): JsonResponse
    {
        return response()->json(['success' => true, 'code' => 200, 'message' => $message, 'data' => $data ?: new \stdClass()], 200);
    }

    private function error(string $message, int $status, array $data): JsonResponse
    {
        return response()->json(['success' => false, 'code' => $status, 'message' => $message, 'data' => $data ?: new \stdClass()], $status);
    }
}
