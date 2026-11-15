<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Izin / sakit / dispensasi santri
        Schema::create('student_excusals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('type', 20); // permission, sick, dispensation
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('reason', 500);
            $table->string('status', 20)->default('pending')->index(); // pending, approved, rejected, cancelled
            $table->text('notes')->nullable();
            $table->string('attachment_path')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('created_by_name', 150)->nullable();
            $table->timestamps();
            $table->index(['student_id', 'start_at', 'end_at']);
        });

        // Presensi SDM (harian; kolom context_key disiapkan untuk presensi mengajar/melatih per sesi)
        Schema::create('staff_attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->date('attendance_date')->index();
            $table->string('attendance_type', 20)->default('daily'); // daily, teaching, training, meeting, duty, event
            $table->string('context_key', 64)->default('daily');
            $table->string('status', 20); // present, late, permission, sick, leave, official_duty, absent
            $table->dateTime('scheduled_start_at')->nullable();
            $table->dateTime('scheduled_end_at')->nullable();
            $table->dateTime('check_in_at')->nullable();
            $table->dateTime('check_out_at')->nullable();
            $table->string('check_in_method', 20)->nullable();
            $table->string('check_out_method', 20)->nullable();
            $table->unsignedSmallInteger('late_minutes')->default(0);
            $table->unsignedSmallInteger('early_leave_minutes')->default(0);
            $table->foreignId('attendance_device_id')->nullable()->constrained('attendance_devices')->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by_name', 150)->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique(['staff_profile_id', 'attendance_date', 'attendance_type', 'context_key'], 'uq_staff_attendance_context');
        });

        // Pengajuan izin / sakit / cuti / dinas SDM
        Schema::create('staff_absence_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->string('type', 20); // permission, sick, leave, official_duty
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('reason', 500);
            $table->string('attachment')->nullable();
            $table->string('status', 20)->default('pending')->index(); // pending, approved, rejected, cancelled
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('decided_by_name', 150)->nullable();
            $table->dateTime('decided_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_absence_requests');
        Schema::dropIfExists('staff_attendance_records');
        Schema::dropIfExists('student_excusals');
    }
};
