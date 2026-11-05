<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week')->default(1); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
            $table->time('start_time'); // e.g. 04:15:00
            $table->time('present_until'); // e.g. 04:30:00
            $table->time('late_until'); // e.g. 04:45:00
            $table->time('end_time'); // e.g. 05:00:00
            $table->boolean('auto_generate_session')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_schedules');
    }
};
