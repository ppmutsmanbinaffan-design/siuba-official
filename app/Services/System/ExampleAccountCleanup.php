<?php

namespace App\Services\System;

use App\Models\User;
use App\Services\Security\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Membersihkan 10 akun contoh bawaan versi lama.
 * - Belum pernah dipakai (tidak pernah login, tanpa token, tidak dirujuk tabel mana pun) → DIHAPUS.
 * - Pernah dipakai → DINONAKTIFKAN saja agar riwayat data tetap utuh.
 * Hanya akun yang namanya masih "Akun Contoh – …" (belum diubah pemiliknya) yang disentuh.
 */
class ExampleAccountCleanup
{
    public const USERNAMES = ['musyrif.fauzi', 'guru.hasan', 'petugas.masjid', 'pimpinan.pondok', 'kepala.sekolah',
        'kepala.asrama', 'pelatih.bambang', 'operator.faisal', 'admin.pondok', 'panitia.psb'];

    /** @return array{deleted: string[], deactivated: array<string, string>, skipped: string[]} */
    public function run(bool $dryRun = false): array
    {
        $out = ['deleted' => [], 'deactivated' => [], 'skipped' => []];
        $refs = $this->userReferenceColumns();

        foreach (User::whereIn('username', self::USERNAMES)->get() as $user) {
            // sudah diubah/diambil alih pemiliknya, atau sudah dinonaktifkan (mungkin oleh pembersihan sebelumnya) → biarkan
            if (!str_starts_with((string) $user->name, 'Akun Contoh') || !$user->is_active) {
                $out['skipped'][] = $user->username;
                continue;
            }
            $usage = $this->usage($user, $refs);
            if ($usage === []) {
                if (!$dryRun) {
                    DB::transaction(function () use ($user) {
                        DB::table('model_has_roles')->where('model_id', $user->id)->where('model_type', User::class)->delete();
                        DB::table('model_has_permissions')->where('model_id', $user->id)->where('model_type', User::class)->delete();
                        $user->delete();
                    });
                }
                $out['deleted'][] = $user->username;
            } else {
                $reason = implode(', ', $usage);
                if (!$dryRun) {
                    $user->forceFill(['is_active' => false])->save();
                    $user->tokens()->delete();
                }
                $out['deactivated'][$user->username] = $reason;
            }
        }

        if (!$dryRun && ($out['deleted'] || $out['deactivated'])) {
            try {
                AuditService::log(event: 'users.example_accounts_cleaned', auditableType: 'User', newValues: $out,
                    reason: 'Akun contoh bawaan dihapus (tidak terpakai) / dinonaktifkan (pernah dipakai)');
            } catch (\Throwable) {
                // audit tidak boleh menggagalkan pembersihan
            }
        }

        return $out;
    }

    /** Semua kolom di database yang memiliki foreign key ke users.id. @return array<int, array{0:string,1:string}> */
    private function userReferenceColumns(): array
    {
        $cols = [];
        $driver = DB::connection()->getDriverName();
        $schema = in_array($driver, ['mysql', 'mariadb'], true) ? DB::connection()->getDatabaseName() : null;
        foreach (Schema::getTableListing($schema, false) as $table) {
            foreach (Schema::getForeignKeys($table) as $fk) {
                $foreign = $fk['foreign_table'] ?? '';
                if ($foreign === 'users' || str_ends_with($foreign, '.users')) {
                    foreach ($fk['columns'] as $col) {
                        $cols[] = [$table, $col];
                    }
                }
            }
        }

        return $cols;
    }

    private function usage(User $user, array $refs): array
    {
        $used = [];
        if ($user->last_login_at) {
            $used[] = 'pernah login ' . $user->last_login_at->format('d/m/Y');
        }
        if (Schema::hasTable('personal_access_tokens')
            && DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->exists()) {
            $used[] = 'punya sesi login';
        }
        foreach ($refs as [$table, $col]) {
            if (DB::table($table)->where($col, $user->id)->exists()) {
                $used[] = "dirujuk {$table}.{$col}";
            }
        }

        return array_values(array_unique($used));
    }
}
