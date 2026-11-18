<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap 19: jurnal mengajar guru per jam pelajaran (KBM).
 * Presensi mengajar guru sendiri disimpan di staff_attendance_records (attendance_type = teaching).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academic_session_contexts', function (Blueprint $table) {
            $table->text('journal_notes')->nullable()->after('topic');
            $table->unsignedSmallInteger('student_present_count')->nullable()->after('journal_notes');
            $table->string('realization_status', 20)->default('pending')->after('student_present_count');
            $table->foreignId('journal_submitted_by')->nullable()->after('realization_status')->constrained('users')->nullOnDelete();
            $table->timestamp('journal_submitted_at')->nullable()->after('journal_submitted_by');
        });
    }

    public function down(): void
    {
        Schema::table('academic_session_contexts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('journal_submitted_by');
            $table->dropColumn(['journal_notes', 'student_present_count', 'realization_status', 'journal_submitted_at']);
        });
    }
};
