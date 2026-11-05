<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_number', 30)->unique(); // NIS e.g. 202607001
            $table->string('nisn', 20)->nullable()->index();
            $table->string('name');
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->foreignId('classroom_id')->nullable()->constrained('classrooms')->nullOnDelete();
            $table->foreignId('dormitory_room_id')->nullable()->constrained('dormitory_rooms')->nullOnDelete();
            $table->unsignedSmallInteger('generation_year')->default(2026);
            $table->string('photo')->nullable();
            $table->string('qr_token', 64)->unique(); // Random e.g. STU-X7AK29PQ
            $table->string('rfid_uid', 64)->nullable()->unique(); // e.g. 04A87F12
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
