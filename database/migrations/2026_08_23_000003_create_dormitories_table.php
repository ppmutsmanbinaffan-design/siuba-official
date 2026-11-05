<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dormitories', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "Asrama Putra Al-Fatih", "Asrama Putri Aisyah"
            $table->enum('gender', ['L', 'P'])->default('L'); // L = Laki-laki / Putra, P = Perempuan / Putri
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dormitories');
    }
};
