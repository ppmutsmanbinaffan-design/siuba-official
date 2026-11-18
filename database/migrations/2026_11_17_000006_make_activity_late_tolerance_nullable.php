<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Toleransi terlambat per kegiatan kini boleh kosong: kosong = ikut
 * Pengaturan Sistem → Aturan Absensi → Toleransi Terlambat. Nilai yang sudah ada tidak diubah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->unsignedSmallInteger('late_tolerance_minutes')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::table('activities')->whereNull('late_tolerance_minutes')->update(['late_tolerance_minutes' => 15]);
        Schema::table('activities', function (Blueprint $table) {
            $table->unsignedSmallInteger('late_tolerance_minutes')->default(15)->change();
        });
    }
};
