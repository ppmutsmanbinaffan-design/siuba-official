<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan kolom yang dipakai aplikasi React (sebelumnya hanya tersimpan di localStorage browser).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'nickname')) $table->string('nickname', 100)->nullable()->after('name');
            if (!Schema::hasColumn('students', 'birth_place')) $table->string('birth_place', 100)->nullable();
            if (!Schema::hasColumn('students', 'birth_date')) $table->date('birth_date')->nullable();
            if (!Schema::hasColumn('students', 'entry_year')) $table->unsignedSmallInteger('entry_year')->nullable();
            if (!Schema::hasColumn('students', 'guardian_name')) $table->string('guardian_name', 150)->nullable();
            if (!Schema::hasColumn('students', 'guardian_phone')) $table->string('guardian_phone', 30)->nullable();
            if (!Schema::hasColumn('students', 'address')) $table->text('address')->nullable();
            // active, inactive, graduated, transferred, resigned
            if (!Schema::hasColumn('students', 'status')) $table->string('status', 20)->default('active')->index();
        });

        // Santri yang sebelumnya nonaktif -> status 'inactive'
        \Illuminate\Support\Facades\DB::table('students')->where('is_active', false)->update(['status' => 'inactive']);

        Schema::table('classrooms', function (Blueprint $table) {
            if (!Schema::hasColumn('classrooms', 'code')) $table->string('code', 30)->nullable();
            if (!Schema::hasColumn('classrooms', 'capacity')) $table->unsignedSmallInteger('capacity')->nullable();
        });

        Schema::table('dormitory_rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('dormitory_rooms', 'code')) $table->string('code', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['nickname', 'birth_place', 'birth_date', 'entry_year', 'guardian_name', 'guardian_phone', 'address', 'status']);
        });
        Schema::table('classrooms', function (Blueprint $table) {
            $table->dropColumn(['code', 'capacity']);
        });
        Schema::table('dormitory_rooms', function (Blueprint $table) {
            $table->dropColumn(['code']);
        });
    }
};
