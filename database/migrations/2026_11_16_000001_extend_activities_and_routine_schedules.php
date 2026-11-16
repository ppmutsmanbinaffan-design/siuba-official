<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap 6: master kegiatan & jadwal rutin dari aplikasi disimpan di server.
 * Hanya MENAMBAH kolom/tabel; data lama tidak diubah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('participant_type', 32)->default('all_students')->after('location');
            $table->unsignedBigInteger('participant_target_id')->nullable()->after('participant_type');
            $table->string('participant_gender', 8)->nullable()->after('participant_target_id'); // male, female
            $table->time('default_start_time')->nullable();
            $table->time('default_present_until')->nullable();
            $table->time('default_late_until')->nullable();
            $table->time('default_end_time')->nullable();
        });

        Schema::table('activity_schedules', function (Blueprint $table) {
            $table->unsignedTinyInteger('day_of_week')->nullable()->default(null)->change(); // null = setiap hari
            $table->string('frequency', 16)->default('weekly')->after('day_of_week'); // daily, weekly, selected_days
            $table->json('days_of_week')->nullable()->after('frequency');               // [0..6] untuk selected_days
            $table->date('effective_start_date')->nullable();
            $table->date('effective_end_date')->nullable();
            $table->string('location', 150)->nullable();
            $table->string('participant_type', 32)->nullable();
            $table->unsignedBigInteger('participant_target_id')->nullable();
            $table->string('participant_gender', 8)->nullable();
            $table->boolean('auto_open')->default(false);
            $table->boolean('auto_close')->default(false);
            $table->string('schedule_set_code', 16)->default('NORMAL');
        });

        Schema::create('prayer_time_calendars', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->time('subuh');
            $table->time('dzuhur');
            $table->time('ashar');
            $table->time('maghrib');
            $table->time('isya');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prayer_time_calendars');
        Schema::table('activity_schedules', function (Blueprint $table) {
            $table->dropColumn(['frequency', 'days_of_week', 'effective_start_date', 'effective_end_date', 'location',
                'participant_type', 'participant_target_id', 'participant_gender', 'auto_open', 'auto_close', 'schedule_set_code']);
        });
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['participant_type', 'participant_target_id', 'participant_gender',
                'default_start_time', 'default_present_until', 'default_late_until', 'default_end_time']);
        });
    }
};
