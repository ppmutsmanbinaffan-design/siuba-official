<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('status', 20)->default('present')->index(); // present, late, permission, sick, dispensation, absent
            $table->string('method', 20)->default('manual')->index(); // manual, qr, rfid, ...
            $table->dateTime('check_in_at')->nullable()->index();
            $table->unsignedSmallInteger('late_minutes')->default(0);
            $table->foreignId('attendance_device_id')->nullable()->constrained('attendance_devices')->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Unique constraint: one student cannot have two attendance records in the same session
            $table->unique(['attendance_session_id', 'student_id'], 'uq_session_student_attendance');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
