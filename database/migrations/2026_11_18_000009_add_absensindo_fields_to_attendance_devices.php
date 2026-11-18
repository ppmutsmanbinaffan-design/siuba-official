<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mesin RFID Absensindo (ESP32 Wemos D1 R32): aktivasi dengan Serial Number + MAC, lalu token Bearer.
 * protocol: 'nexabsen' (X-GLOBAL-KEY, /api/tap.php) atau 'absensindo' (/api/device/...).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->string('protocol', 20)->default('nexabsen')->after('device_type');
            $table->string('serial_number', 64)->nullable()->unique()->after('protocol');
            $table->string('mac_address', 32)->nullable()->after('serial_number');
            $table->string('firmware_version', 40)->nullable()->after('mac_address');
            $table->timestamp('activated_at')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->dropUnique(['serial_number']);
            $table->dropColumn(['protocol', 'serial_number', 'mac_address', 'firmware_version', 'activated_at']);
        });
    }
};
