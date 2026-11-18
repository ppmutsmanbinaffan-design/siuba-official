<?php

namespace App\Support;

/** Nama peran (role Spatie) dalam bahasa Indonesia, dan peran yang boleh dipilih saat membuat akun untuk SDM. */
class RoleLabels
{
    public const LABELS = [
        'super-admin' => 'Super Admin',
        'admin' => 'Admin',
        'pimpinan' => 'Pimpinan',
        'kepala-sekolah' => 'Kepala Sekolah',
        'kepala-asrama' => 'Kepala Asrama',
        'guru' => 'Guru',
        'teacher' => 'Guru',
        'wali-kelas' => 'Wali Kelas',
        'musyrif' => 'Musyrif',
        'pelatih' => 'Pelatih',
        'petugas-masjid' => 'Petugas Masjid',
        'petugas-absensi' => 'Petugas Absensi',
        'operator' => 'Operator',
        'kesantrian' => 'Kesantrian',
        'academic' => 'Kurikulum',
        'panitia-psb' => 'Panitia PSB',
        'panitia-ppdb' => 'Panitia PPDB',
    ];

    /** Peran operasional yang boleh diberikan oleh admin SDM. */
    public const STAFF_ROLES = ['guru', 'wali-kelas', 'musyrif', 'pelatih', 'petugas-masjid', 'petugas-absensi',
        'operator', 'kesantrian', 'academic', 'kepala-asrama', 'panitia-psb'];

    /** Peran berhak luas — hanya Super Admin yang boleh memberikan. */
    public const PRIVILEGED_ROLES = ['admin', 'pimpinan', 'kepala-sekolah'];

    public static function label(?string $role): string
    {
        return self::LABELS[$role] ?? ucfirst((string) $role);
    }

    /** Peran default untuk tipe SDM. */
    public static function defaultForStaffType(?string $type): string
    {
        return match ($type) {
            'trainer' => 'pelatih',
            'musyrif' => 'musyrif',
            'administration', 'general_staff' => 'operator',
            'management' => 'kepala-sekolah',
            'employee', 'security', 'cleaning' => 'petugas-absensi',
            default => 'guru',
        };
    }
}
