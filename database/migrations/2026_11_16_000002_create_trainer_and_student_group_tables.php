<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap 7: presensi pembina/pelatih ekskul dan kelompok santri khusus di server.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extracurricular_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extracurricular_id')->constrained('extracurriculars')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0 = Minggu ... 6 = Sabtu
            $table->time('start_time');
            $table->time('end_time');
            $table->string('location', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('extracurricular_staff_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extracurricular_id')->constrained('extracurriculars')->cascadeOnDelete();
            $table->foreignId('staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->string('role', 32)->default('coach'); // coach, assistant_coach, supervisor
            $table->boolean('is_primary')->default(false);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['extracurricular_id', 'is_active'], 'idx_eks_staff_assign_active');
        });

        Schema::create('trainer_substitutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extracurricular_id')->constrained('extracurriculars')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('original_staff_profile_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            $table->foreignId('substitute_staff_profile_id')->constrained('staff_profiles')->cascadeOnDelete();
            $table->string('reason', 255)->nullable();
            $table->string('status', 16)->default('active'); // active, cancelled
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['extracurricular_id', 'date'], 'idx_trainer_sub_eks_date');
        });

        Schema::create('training_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('extracurricular_id')->constrained('extracurriculars')->cascadeOnDelete();
            $table->foreignId('extracurricular_schedule_id')->nullable()->constrained('extracurricular_schedules')->nullOnDelete();
            $table->date('session_date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->string('location', 100)->nullable();
            $table->foreignId('primary_staff_profile_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            $table->foreignId('actual_staff_profile_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            $table->foreignId('trainer_substitution_id')->nullable()->constrained('trainer_substitutions')->nullOnDelete();
            $table->string('status', 16)->default('scheduled'); // scheduled, ongoing, completed, cancelled
            $table->string('realization_status', 16)->default('pending'); // pending, submitted
            $table->string('topic', 255)->nullable();
            $table->unsignedSmallInteger('student_present_count')->nullable();
            $table->text('activity_notes')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['extracurricular_id', 'session_date', 'start_time'], 'uq_training_session');
        });

        Schema::create('student_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('student_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_group_id')->constrained('student_groups')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->date('joined_at')->nullable();
            $table->timestamps();
            $table->unique(['student_group_id', 'student_id'], 'uq_student_group_member');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_group_members');
        Schema::dropIfExists('student_groups');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('trainer_substitutions');
        Schema::dropIfExists('extracurricular_staff_assignments');
        Schema::dropIfExists('extracurricular_schedules');
    }
};
