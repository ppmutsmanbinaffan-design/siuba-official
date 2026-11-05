<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add offline tracking columns to attendance_records if not exist
        Schema::table('attendance_records', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_records', 'client_request_id')) {
                $table->string('client_request_id', 64)->nullable()->index()->after('metadata');
            }
            if (!Schema::hasColumn('attendance_records', 'client_installation_id')) {
                $table->string('client_installation_id', 64)->nullable()->index()->after('client_request_id');
            }
            if (!Schema::hasColumn('attendance_records', 'was_offline')) {
                $table->boolean('was_offline')->default(false)->after('client_installation_id');
            }
            if (!Schema::hasColumn('attendance_records', 'sync_delay_seconds')) {
                $table->unsignedInteger('sync_delay_seconds')->nullable()->after('was_offline');
            }
            if (!Schema::hasColumn('attendance_records', 'record_source')) {
                $table->string('record_source', 20)->default('operator')->after('sync_delay_seconds'); // operator, system, device, offline_sync
            }
        });

        // 2. Create attendance_record_histories for audit trails & conflict resolution
        Schema::create('attendance_record_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_record_id')->constrained('attendance_records')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('old_status', 20);
            $table->string('new_status', 20);
            $table->string('old_method', 20)->nullable();
            $table->string('new_method', 20)->nullable();
            $table->text('reason')->nullable();
            $table->string('changed_by')->nullable();
            $table->dateTime('changed_at')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 3. Create client_installations table for PWA client tracking
        Schema::create('client_installations', function (Blueprint $table) {
            $table->id();
            $table->string('installation_uuid', 64)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('device_name')->nullable();
            $table->string('app_version', 30)->default('v1.10.0-pwa');
            $table->string('platform', 50)->default('PWA');
            $table->dateTime('last_seen_at')->nullable()->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_installations');
        Schema::dropIfExists('attendance_record_histories');
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn([
                'client_request_id',
                'client_installation_id',
                'was_offline',
                'sync_delay_seconds',
                'record_source',
            ]);
        });
    }
};
