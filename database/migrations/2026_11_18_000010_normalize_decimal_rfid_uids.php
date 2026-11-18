<?php

use App\Models\Student;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * UID kartu yang terlanjur tersimpan dalam bentuk desimal (dari mesin Absensindo) diubah ke bentuk baku
 * heksadesimal yang sama dengan mesin Nexabsen, agar satu kartu dikenali kedua mesin.
 * Contoh: 2225223850 → AA38A284. Bila bentuk baku sudah dipakai kartu lain, baris itu dilewati (dicatat di log).
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['students', 'staff_profiles'] as $table) {
            DB::table($table)->whereNotNull('rfid_uid')->orderBy('id')->select(['id', 'rfid_uid'])
                ->get()->each(function ($row) use ($table) {
                    $new = Student::normalizeRfidUid($row->rfid_uid);
                    if (!$new || $new === $row->rfid_uid) {
                        return;
                    }
                    $taken = DB::table('students')->where('rfid_uid', $new)->exists()
                        || DB::table('staff_profiles')->where('rfid_uid', $new)->exists();
                    if ($taken) {
                        Log::warning("UID {$row->rfid_uid} ({$table}#{$row->id}) tidak diubah: {$new} sudah dipakai kartu lain.");

                        return;
                    }
                    DB::table($table)->where('id', $row->id)->update(['rfid_uid' => $new]);
                });
        }
    }

    public function down(): void
    {
        // tidak dikembalikan: bentuk baku tetap dikenali dari kedua mesin
    }
};
