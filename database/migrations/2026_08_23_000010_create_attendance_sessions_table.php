<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->foreignId('activity_schedule_id')->nullable()->constrained('activity_schedules')->nullOnDelete();
            $table->string('session_code', 64)->unique(); // e.g. ATT-20260823-SUBUH-001
            $table->date('session_date')->index();
            $table->dateTime('start_at');
            $table->dateTime('present_until');
            $table->dateTime('late_until');
            $table->dateTime('end_at');
            $table->string('status', 20)->default('draft')->index(); // draft, open, closed, cancelled
            $table->string('location', 100)->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('opened_at')->nullable();
            $table->dateTime('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
