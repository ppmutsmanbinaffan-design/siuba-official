<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
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
        $superAdmin = User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Admin SIUBA',
                'email' => 'admin@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $superAdmin->syncRoles(['super-admin']);

        // 2. Musyrif Account
        $musyrif = User::updateOrCreate(
            ['username' => 'musyrif.fauzi'],
            [
                'name' => 'Ustadz Ahmad Fauzi, S.Pd.I',
                'email' => 'fauzi@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $musyrif->syncRoles(['musyrif']);

        // 3. Guru / Pengajar Account
        $guru = User::updateOrCreate(
            ['username' => 'guru.hasan'],
            [
                'name' => 'Ustadz Hasan Basri, M.Pd',
                'email' => 'hasan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $guru->syncRoles(['guru']);

        // 4. Petugas Masjid Account
        $petugasMasjid = User::updateOrCreate(
            ['username' => 'petugas.masjid'],
            [
                'name' => 'Ustadz Ridwan Robbani',
                'email' => 'ridwan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $petugasMasjid->syncRoles(['petugas-masjid']);

        // 5. Pimpinan Pesantren Account
        $pimpinan = User::updateOrCreate(
            ['username' => 'pimpinan.pondok'],
            [
                'name' => 'KH. Abdullah Gymnastiar, Lc.',
                'email' => 'pimpinan@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $pimpinan->syncRoles(['pimpinan']);

        // 6. Kepala Sekolah Account
        $kepsek = User::updateOrCreate(
            ['username' => 'kepala.sekolah'],
            [
                'name' => 'Drs. H. Mulyadi, M.Pd.I',
                'email' => 'kepsek@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $kepsek->syncRoles(['kepala-sekolah']);

        // 7. Kepala Asrama Account
        $kestren = User::updateOrCreate(
            ['username' => 'kepala.asrama'],
            [
                'name' => 'Ustadz Syamsuddin, S.Th.I',
                'email' => 'kestren@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $kestren->syncRoles(['kepala-asrama']);

        // 8. Pelatih Account
        $pelatih = User::updateOrCreate(
            ['username' => 'pelatih.bambang'],
            [
                'name' => 'Coach Bambang Pamungkas',
                'email' => 'pelatih@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $pelatih->syncRoles(['pelatih']);

        // 9. Operator Account
        $operator = User::updateOrCreate(
            ['username' => 'operator.faisal'],
            [
                'name' => 'Faisal Akbar, S.Kom',
                'email' => 'operator@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $operator->syncRoles(['operator']);

        // 10. Admin Pondok Account
        $adminPondok = User::updateOrCreate(
            ['username' => 'admin.pondok'],
            [
                'name' => 'Ustadz Zulkifli, S.Sos',
                'email' => 'adminpondok@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $adminPondok->syncRoles(['admin']);

        // 11. Panitia PSB (Penerimaan Santri Baru) Account
        $panitiaPsb = User::updateOrCreate(
            ['username' => 'panitia.psb'],
            [
                'name' => 'Ustadz Hendra Irawan, S.Pd (Panitia PSB)',
                'email' => 'psb@utsman.sch.id',
                'password' => $defaultPassword,
                'is_active' => true,
            ]
        );
        $panitiaPsb->syncRoles(['panitia-psb']);
    }
}
