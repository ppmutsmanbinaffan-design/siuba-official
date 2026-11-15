<?php

namespace App\Services\Iot;

use App\Models\AttendanceDevice;
use Illuminate\Http\Request;

/**
 * Whitelist perangkat RFID/ESP32.
 *
 * - Perangkat yang sudah terdaftar & aktif  -> boleh mengirim tap.
 * - Perangkat terdaftar tapi nonaktif       -> ditolak (DEVICE_INACTIVE).
 * - Perangkat baru (device_code belum ada)  ->
 *     NEXABSEN_AUTO_REGISTER_DEVICE=true  : langsung didaftarkan & aktif (perilaku lama)
 *     NEXABSEN_AUTO_REGISTER_DEVICE=false : dicatat sebagai "menunggu aktivasi" (is_active=false),
 *                                            admin mengaktifkan lewat API / `php artisan siuba:device-activate`.
 */
class IotDeviceResolver
{
    public const MAX_CODE_LENGTH = 50;

    /**
     * @return array{device: AttendanceDevice, allowed: bool, code: string, created: bool}
     */
    public function resolve(Request $request, array $jsonData = []): array
    {
        $deviceCode = (string) (
            $request->input('device_id')
            ?? $request->input('device_code')
            ?? ($jsonData['device_id'] ?? null)
            ?? ($jsonData['device_code'] ?? null)
            ?? 'NEXABSEN-01'
        );
        $deviceCode = mb_substr(trim($deviceCode), 0, self::MAX_CODE_LENGTH);

        $deviceName = mb_substr((string) (
            $request->input('device_name')
            ?? ($jsonData['device_name'] ?? config('services.nexabsen.default_device_name'))
        ), 0, 100);
        $deviceLocation = mb_substr((string) (
            $request->input('location')
            ?? ($jsonData['location'] ?? config('services.nexabsen.default_device_location'))
        ), 0, 100);

        $autoRegister = (bool) config('services.nexabsen.auto_register_device', false);

        $device = AttendanceDevice::firstOrCreate(
            ['device_code' => $deviceCode],
            [
                'device_name' => $deviceName ?: 'Nexabsen RFID Terminal',
                'device_type' => 'rfid_reader',
                'location' => $deviceLocation ?: null,
                'is_active' => $autoRegister,
            ]
        );

        // Catat heartbeat (juga untuk perangkat yang menunggu aktivasi, agar terlihat oleh admin)
        $device->forceFill([
            'last_seen_at' => now(),
            'ip_address' => $request->ip(),
        ])->save();

        if (!$device->is_active) {
            return [
                'device' => $device,
                'allowed' => false,
                'code' => 'DEVICE_NOT_ACTIVE',
                'created' => $device->wasRecentlyCreated,
            ];
        }

        return ['device' => $device, 'allowed' => true, 'code' => 'OK', 'created' => $device->wasRecentlyCreated];
    }
}
