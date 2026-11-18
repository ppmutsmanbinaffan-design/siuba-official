<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap 28: tap kartu/QR SDM yang dicatat saat server tidak terjangkau lalu dikirim belakangan.
 * client_request_id unik → kiriman ulang tidak pernah tercatat dua kali.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_offline_scans', function (Blueprint $table) {
            $table->id();
            $table->string('client_request_id', 64)->unique();
            $table->foreignId('staff_profile_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            $table->foreignId('staff_attendance_record_id')->nullable()->constrained('staff_attendance_records')->nullOnDelete();
            $table->string('identifier', 100);
            $table->string('method', 16);
            $table->timestamp('captured_at')->nullable();      // jam tap (sudah dikoreksi ke jam server)
            $table->timestamp('captured_at_client')->nullable(); // jam perangkat apa adanya
            $table->integer('clock_offset_ms')->nullable();
            $table->boolean('success')->default(false);
            $table->string('result_code', 40);
            $table->string('result_message', 255)->nullable();
            $table->string('installation_id', 64)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['staff_profile_id', 'captured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_offline_scans');
    }
};
