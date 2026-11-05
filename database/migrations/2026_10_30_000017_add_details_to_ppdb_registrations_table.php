<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppdb_registrations', function (Blueprint $table) {
            if (!Schema::hasColumn('ppdb_registrations', 'reg_number')) {
                $table->string('reg_number')->nullable()->after('id');
                $table->string('nisn')->nullable()->after('student_name');
                $table->string('gender', 10)->default('Putra')->after('nisn');
                $table->string('birth_info')->nullable()->after('gender');
                $table->string('juz_memorized')->default('0 Juz')->after('track');
                $table->text('address')->nullable()->after('origin_school');
                $table->string('test_score_quran')->nullable()->after('status');
                $table->string('test_score_academic')->nullable()->after('test_score_quran');
                $table->text('notes')->nullable()->after('test_score_academic');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ppdb_registrations', function (Blueprint $table) {
            $table->dropColumn([
                'reg_number', 'nisn', 'gender', 'birth_info', 'juz_memorized',
                'address', 'test_score_quran', 'test_score_academic', 'notes'
            ]);
        });
    }
};
