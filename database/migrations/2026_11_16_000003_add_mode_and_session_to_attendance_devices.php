<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Tahap 8: mode alat (absensi / pendaftaran kartu / perawatan) dan sesi yang dikunci ke alat. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->string('mode', 16)->default('attendance')->after('device_type');
            $table->foreignId('current_session_id')->nullable()->after('mode')->constrained('attendance_sessions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_session_id');
            $table->dropColumn('mode');
        });
    }
};
