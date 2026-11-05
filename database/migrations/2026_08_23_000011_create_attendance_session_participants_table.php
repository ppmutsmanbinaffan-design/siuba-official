<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_session_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('participant_source', 64)->nullable(); // classroom, dormitory_room, halaqah, extracurricular, event, manual
            $table->unsignedBigInteger('participant_source_id')->nullable();
            $table->string('eligibility_status', 32)->nullable()->default('ELIGIBLE'); // ELIGIBLE, EXCUSED, SICK, DISPENSATION
            $table->timestamps();

            // Unique constraint: each student is snapshotted once per session
            $table->unique(['attendance_session_id', 'student_id'], 'uq_session_student_participant');
            $table->index(['attendance_session_id', 'eligibility_status'], 'idx_asp_session_eligibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_session_participants');
    }
};
