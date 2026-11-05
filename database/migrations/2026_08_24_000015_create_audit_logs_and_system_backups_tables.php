<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for SIUBA Stage 4: Global Audit Trail & System Backups.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('attendance_device_id')->nullable()->constrained('attendance_devices')->nullOnDelete();
            $table->string('client_installation_id', 128)->nullable()->index();
            $table->string('event', 100)->index();
            $table->string('auditable_type', 150)->nullable()->index();
            $table->unsignedBigInteger('auditable_id')->nullable()->index();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent_summary', 255)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['created_at', 'event']);
        });

        Schema::create('system_backups', function (Blueprint $table) {
            $table->id();
            $table->string('backup_id', 64)->unique();
            $table->string('filename', 255);
            $table->string('path', 500);
            $table->enum('type', ['database', 'files', 'full'])->default('database');
            $table->unsignedBigInteger('size')->default(0);
            $table->string('checksum', 64)->nullable(); // SHA-256
            $table->enum('status', ['pending', 'running', 'completed', 'verified', 'failed'])->default('pending')->index();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_backups');
        Schema::dropIfExists('audit_logs');
    }
};
