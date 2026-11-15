<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Data SDM / guru / pelatih / musyrif (boleh punya akun login atau tidak)
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->string('staff_number', 40)->unique(); // NIP / kode SDM
            $table->string('name');
            $table->enum('gender', ['L', 'P'])->default('L');
            // teacher, trainer, musyrif, administration, employee, management, other
            $table->string('staff_type', 30)->default('teacher')->index();
            // permanent, contract, honorary, part_time, volunteer, inactive
            $table->string('employment_status', 30)->default('permanent');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('department', 100)->nullable();
            $table->string('position', 100)->nullable();
            $table->date('join_date')->nullable();
            $table->date('leave_date')->nullable();
            $table->boolean('requires_daily_attendance')->default(true);
            $table->string('qr_token', 64)->unique();
            $table->string('rfid_uid', 64)->nullable()->unique();
            $table->string('photo')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // Riwayat kejadian perangkat RFID (tap, ditolak, kartu belum terdaftar, dll.)
        Schema::create('attendance_device_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_device_id')->nullable()->constrained('attendance_devices')->cascadeOnDelete();
            $table->string('device_code', 50)->index();
            $table->string('event_type', 40)->index();
            $table->string('level', 10)->default('info');
            $table->string('message', 255);
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_device_logs');
        Schema::dropIfExists('staff_profiles');
    }
};
