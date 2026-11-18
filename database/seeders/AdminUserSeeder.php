<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Akun yang sudah ada TIDAK diubah (password, nama, dan role tetap) — seeder aman dijalankan ulang.
        $usernames = ['superadmin', 'musyrif.fauzi', 'guru.hasan', 'petugas.masjid', 'pimpinan.pondok', 'kepala.sekolah', 'kepala.asrama', 'pelatih.bambang', 'operator.faisal', 'admin.pondok', 'panitia.psb'];
        $existing = User::whereIn('username', $usernames)->pluck('username')->all();
        if (count($existing) === count($usernames)) {
            User::where('username', 'superadmin')->first()?->assignRole('super-admin');
            $this->command?->info('Akun bawaan sudah ada; password tidak diubah.');

            return;
        }

        // Password awal TIDAK lagi 'password'.
        // Isi ADMIN_DEFAULT_PASSWORD di .env, atau biarkan kosong agar dibuat acak
        // dan disimpan di storage/app/initial-admin-password.txt (hapus file itu setelah dibaca!).
        $plainPassword = (string) env('ADMIN_DEFAULT_PASSWORD', '');
        if (strlen($plainPassword) < 8) {
            $plainPassword = \Illuminate\Support\Str::password(14, symbols: false);
            @file_put_contents(
                storage_path('app/initial-admin-password.txt'),
                "Password awal semua akun bawaan SIUBA (dibuat " . now()->toDateTimeString() . "):\n{$plainPassword}\n\nSegera login, ganti password, lalu HAPUS file ini.\n"
            );
            $this->command?->warn('Password awal akun bawaan: ' . $plainPassword . ' (juga disimpan di storage/app/initial-admin-password.txt)');
        }
        $defaultPassword = Hash::make($plainPassword);

        // 1. Super Admin Account
        $superAdmin = User::firstOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Admin SIUBA',
                'email' => 'admin@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($superAdmin->wasRecentlyCreated) {
            $superAdmin->syncRoles(['super-admin']);
        }

        // 2. Musyrif Account
        $musyrif = User::firstOrCreate(
            ['username' => 'musyrif.fauzi'],
            [
                'name' => 'Ustadz Ahmad Fauzi, S.Pd.I',
                'email' => 'fauzi@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($musyrif->wasRecentlyCreated) {
            $musyrif->syncRoles(['musyrif']);
        }

        // 3. Guru / Pengajar Account
        $guru = User::firstOrCreate(
            ['username' => 'guru.hasan'],
            [
                'name' => 'Ustadz Hasan Basri, M.Pd',
                'email' => 'hasan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($guru->wasRecentlyCreated) {
            $guru->syncRoles(['guru']);
        }

        // 4. Petugas Masjid Account
        $petugasMasjid = User::firstOrCreate(
            ['username' => 'petugas.masjid'],
            [
                'name' => 'Ustadz Ridwan Robbani',
                'email' => 'ridwan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($petugasMasjid->wasRecentlyCreated) {
            $petugasMasjid->syncRoles(['petugas-masjid']);
        }

        // 5. Pimpinan Pesantren Account
        $pimpinan = User::firstOrCreate(
            ['username' => 'pimpinan.pondok'],
            [
                'name' => 'Pimpinan Pondok (contoh)',
                'email' => 'pimpinan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($pimpinan->wasRecentlyCreated) {
            $pimpinan->syncRoles(['pimpinan']);
        }

        // 6. Kepala Sekolah Account
        $kepsek = User::firstOrCreate(
            ['username' => 'kepala.sekolah'],
            [
                'name' => 'Drs. H. Mulyadi, M.Pd.I',
                'email' => 'kepsek@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($kepsek->wasRecentlyCreated) {
            $kepsek->syncRoles(['kepala-sekolah']);
        }

        // 7. Kepala Asrama Account
        $kestren = User::firstOrCreate(
            ['username' => 'kepala.asrama'],
            [
                'name' => 'Ustadz Syamsuddin, S.Th.I',
                'email' => 'kestren@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($kestren->wasRecentlyCreated) {
            $kestren->syncRoles(['kepala-asrama']);
        }

        // 8. Pelatih Account
        $pelatih = User::firstOrCreate(
            ['username' => 'pelatih.bambang'],
            [
                'name' => 'Coach Bambang Pamungkas',
                'email' => 'pelatih@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($pelatih->wasRecentlyCreated) {
            $pelatih->syncRoles(['pelatih']);
        }

        // 9. Operator Account
        $operator = User::firstOrCreate(
            ['username' => 'operator.faisal'],
            [
                'name' => 'Faisal Akbar, S.Kom',
                'email' => 'operator@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($operator->wasRecentlyCreated) {
            $operator->syncRoles(['operator']);
        }

        // 10. Admin Pondok Account
        $adminPondok = User::firstOrCreate(
            ['username' => 'admin.pondok'],
            [
                'name' => 'Ustadz Zulkifli, S.Sos',
                'email' => 'adminpondok@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($adminPondok->wasRecentlyCreated) {
            $adminPondok->syncRoles(['admin']);
        }

        // 11. Panitia PSB (Penerimaan Santri Baru) Account
        $panitiaPsb = User::firstOrCreate(
            ['username' => 'panitia.psb'],
            [
                'name' => 'Ustadz Hendra Irawan, S.Pd (Panitia PSB)',
                'email' => 'psb@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        if ($panitiaPsb->wasRecentlyCreated) {
            $panitiaPsb->syncRoles(['panitia-psb']);
        }
    }
}
