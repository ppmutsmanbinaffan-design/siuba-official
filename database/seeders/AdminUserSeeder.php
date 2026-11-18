<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Akun bawaan: hanya Super Admin.
 *
 * Dulu seeder ini juga membuat 10 akun contoh berisi nama orang (Ustadz Ahmad Fauzi, Coach Bambang, dll.)
 * dengan password yang sama. Akun untuk guru/pegawai sekarang dibuat dari formulir SDM atau impor SDM,
 * sehingga setiap akun milik orangnya sendiri. Akun contoh lama di database diganti namanya menjadi nama
 * peran oleh migrasi 2026_11_18_000008.
 *
 * Akun yang sudah ada TIDAK diubah (password, nama, dan role tetap) — seeder aman dijalankan ulang.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $existing = User::where('username', 'superadmin')->first();
        if ($existing) {
            $existing->assignRole('super-admin');
            $this->command?->info('Akun Super Admin sudah ada; password tidak diubah.');

            return;
        }

        // Password awal TIDAK pernah 'password'.
        // Isi ADMIN_DEFAULT_PASSWORD di .env, atau biarkan kosong agar dibuat acak
        // dan disimpan di storage/app/initial-admin-password.txt (hapus file itu setelah dibaca!).
        $plainPassword = (string) env('ADMIN_DEFAULT_PASSWORD', '');
        if (strlen($plainPassword) < 8) {
            $plainPassword = \Illuminate\Support\Str::password(14, symbols: false);
            @file_put_contents(
                storage_path('app/initial-admin-password.txt'),
                "Password awal akun superadmin SIUBA (dibuat " . now()->toDateTimeString() . "):\n{$plainPassword}\n\nSegera login, ganti password, lalu HAPUS file ini.\n"
            );
            $this->command?->warn('Password awal superadmin: ' . $plainPassword . ' (juga disimpan di storage/app/initial-admin-password.txt)');
        }

        $superAdmin = User::create([
            'username' => 'superadmin',
            'name' => 'Super Admin SIUBA',
            'email' => null,
            'password' => Hash::make($plainPassword),
            'is_active' => true,
        ]);
        $superAdmin->syncRoles(['super-admin']);
    }
}
