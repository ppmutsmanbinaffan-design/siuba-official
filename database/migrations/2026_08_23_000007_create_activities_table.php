<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_category_id')->constrained('activity_categories')->cascadeOnDelete();
            $table->string('code', 50)->unique(); // e.g. SHALAT-SUBUH, KBM-PAGI
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('location', 150)->nullable();
            $table->boolean('attendance_enabled')->default(true);
            $table->boolean('allow_manual')->default(true);
            $table->boolean('allow_qr')->default(true);
            $table->boolean('allow_rfid')->default(true);
            $table->unsignedSmallInteger('late_tolerance_minutes')->default(15);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
