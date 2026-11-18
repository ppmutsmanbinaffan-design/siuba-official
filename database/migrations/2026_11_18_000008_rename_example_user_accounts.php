<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Akun contoh bawaan versi lama memakai nama orang (sebagian nama tokoh nyata) dan email berisi nama orang,
 * sehingga tampil seolah pegawai sungguhan di pilihan "Tautkan Akun" formulir SDM.
 * Namanya diganti menjadi nama perannya. Hanya akun yang namanya MASIH sama dengan bawaan yang diubah;
 * username, password, role, dan status aktif tidak disentuh.
 */
return new class extends Migration
{
    private const EXAMPLES = [
        'musyrif.fauzi' => ['Musyrif', ['Ustadz H. Ahmad Fauzi, S.Pd.I', 'Ustadz Ahmad Fauzi, S.Pd.I'], 'fauzi@utsman.sch.id'],
        'guru.hasan' => ['Guru', ['Ustadz Hasan Basri, M.Pd'], 'hasan@utsman.sch.id'],
        'petugas.masjid' => ['Petugas Masjid', ['Ustadz Ridwan Robbani'], 'ridwan@utsman.sch.id'],
        'pimpinan.pondok' => ['Pimpinan', ['KH. Abdullah Gymnastiar, Lc.', 'KH. Abdullah Gymnastiar', 'Pimpinan Pondok (contoh)'], 'pimpinan@utsman.sch.id'],
        'kepala.sekolah' => ['Kepala Sekolah', ['Drs. H. Mulyadi, M.Pd.I'], 'kepsek@utsman.sch.id'],
        'kepala.asrama' => ['Kepala Asrama', ['Ustadz Syamsuddin, S.Th.I'], 'kestren@utsman.sch.id'],
        'pelatih.bambang' => ['Pelatih', ['Coach Bambang Pamungkas'], 'pelatih@utsman.sch.id'],
        'operator.faisal' => ['Operator', ['Faisal Akbar, S.Kom'], 'operator@utsman.sch.id'],
        'admin.pondok' => ['Admin', ['Ustadz Zulkifli, S.Sos'], 'adminpondok@utsman.sch.id'],
        'panitia.psb' => ['Panitia PSB', ['Ustadz Hendra Irawan, S.Pd (Panitia PSB)'], 'psb@utsman.sch.id'],
    ];

    public function up(): void
    {
        foreach (self::EXAMPLES as $username => [$label, $oldNames, $oldEmail]) {
            $user = DB::table('users')->where('username', $username)->first();
            if (!$user || !in_array($user->name, $oldNames, true)) {
                continue; // sudah diubah pemiliknya → biarkan
            }
            $update = ['name' => "Akun Contoh – {$label}", 'updated_at' => now()];
            if ($user->email === $oldEmail) {
                $update['email'] = null;
            }
            DB::table('users')->where('id', $user->id)->update($update);
            // nama di data SDM yang tertaut ke akun contoh ini tidak diubah (itu data pegawai)
        }
    }

    public function down(): void
    {
        // Tidak dikembalikan: nama lama berisi nama orang yang tidak berhubungan dengan pesantren.
    }
};
