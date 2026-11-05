<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_code', 50)->unique(); // e.g. MSJ-RFID-01
            $table->string('device_name', 100);
            $table->string('device_type', 30)->default('rfid_reader'); // manual, qr_scanner, rfid_reader, kiosk
            $table->string('location', 100)->nullable();
            $table->string('api_token_hash', 64)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_devices');
    }
};
