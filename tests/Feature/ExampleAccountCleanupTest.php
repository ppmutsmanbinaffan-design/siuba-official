<?php

namespace Tests\Feature;

use App\Models\StaffProfile;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Akun contoh: yang tidak terpakai dihapus, yang pernah dipakai dinonaktifkan, yang sudah diubah pemiliknya dibiarkan. */
class ExampleAccountCleanupTest extends TestCase
{
    use RefreshDatabase;

    private function example(string $username, string $role, array $extra = []): User
    {
        $u = User::create(array_merge(['username' => $username, 'name' => 'Akun Contoh – X', 'password' => 'Rahasia123', 'is_active' => true], $extra));
        $u->assignRole($role);

        return $u;
    }

    public function test_cleanup_deletes_unused_and_deactivates_used(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $unused = $this->example('guru.hasan', 'guru');
        $loggedIn = $this->example('operator.faisal', 'operator', ['last_login_at' => now()->subDay()]);
        $linked = $this->example('musyrif.fauzi', 'musyrif');
        StaffProfile::create(['staff_number' => 'M1', 'name' => 'Musyrif Asli', 'staff_type' => 'musyrif', 'user_id' => $linked->id]);
        $withToken = $this->example('pelatih.bambang', 'pelatih');
        $withToken->createToken('t');
        $renamed = $this->example('admin.pondok', 'admin', ['name' => 'Ust. Admin Sungguhan']);
        $real = User::create(['username' => 'guru.lain', 'name' => 'Akun Contoh – bukan bawaan', 'password' => 'Rahasia123', 'is_active' => true]);

        $this->artisan('siuba:hapus-akun-contoh --dry-run')->assertSuccessful();
        $this->assertNotNull(User::find($unused->id)); // uji coba tidak mengubah apa pun

        $this->artisan('siuba:hapus-akun-contoh')->assertSuccessful();
        $this->assertNull(User::find($unused->id));
        $this->assertDatabaseMissing('model_has_roles', ['model_id' => $unused->id, 'model_type' => User::class]);
        foreach ([$loggedIn, $linked, $withToken] as $u) {
            $this->assertNotNull($u->fresh(), $u->username);
            $this->assertFalse($u->fresh()->is_active, $u->username);
        }
        $this->assertSame(0, $withToken->tokens()->count());
        $this->assertTrue($renamed->fresh()->is_active);
        $this->assertNotNull($real->fresh());
        $this->assertDatabaseHas('audit_logs', ['event' => 'users.example_accounts_cleaned']);

        // aman diulang
        $again = app(\App\Services\System\ExampleAccountCleanup::class)->run();
        $this->assertSame([], $again['deleted'], json_encode($again));
        $this->assertSame([], $again['deactivated'], json_encode($again));
    }
}
