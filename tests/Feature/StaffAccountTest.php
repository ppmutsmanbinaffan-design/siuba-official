<?php

namespace Tests\Feature;

use App\Models\StaffProfile;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Akun login milik SDM sendiri dari formulir SDM; pilihan tautan hanya akun yang belum dipakai. */
class StaffAccountTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->super = User::create(['username' => 'superadmin', 'name' => 'Super Admin', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->super->assignRole('super-admin');
        Sanctum::actingAs($this->super);
    }

    private function staffPayload(array $extra = []): array
    {
        return array_merge(['staff_number' => 'GR-001', 'name' => 'Ust. Ali Imran', 'gender' => 'L', 'staff_type' => 'teacher',
            'employment_status' => 'permanent', 'phone' => '0812', 'email' => 'ali@pesantren.test'], $extra);
    }

    public function test_create_staff_with_own_account(): void
    {
        $res = $this->postJson('/api/v1/staff', $this->staffPayload(['create_account' => true, 'account_role' => 'guru']))->assertCreated();
        $acc = $res->json('data.new_account');
        $this->assertSame('gr-001', $acc['username']); // default dari NIP
        $this->assertSame('Guru', $acc['role_label']);
        $user = User::firstWhere('username', 'gr-001');
        $this->assertSame('Ust. Ali Imran', $user->name);      // nama orangnya sendiri
        $this->assertSame('ali@pesantren.test', $user->email);
        $this->assertTrue($user->hasRole('guru'));
        $this->assertTrue(Hash::check($acc['initial_password'], $user->password));
        $this->assertSame($user->id, StaffProfile::firstOrFail()->user_id);
        $this->assertSame('gr-001', $res->json('data.username'));
    }

    public function test_linkable_accounts_exclude_taken_and_super_admin(): void
    {
        $free = User::create(['username' => 'musyrif.a', 'name' => 'Akun Contoh – Musyrif', 'password' => 'Rahasia123', 'is_active' => true]);
        $free->assignRole('musyrif');
        $taken = User::create(['username' => 'guru.b', 'name' => 'Guru B', 'password' => 'Rahasia123', 'is_active' => true]);
        $taken->assignRole('guru');
        $owner = StaffProfile::create(['staff_number' => 'X1', 'name' => 'Guru B', 'staff_type' => 'teacher', 'user_id' => $taken->id]);

        $list = collect($this->getJson('/api/v1/staff/linkable-accounts')->assertOk()->json('data.accounts'));
        $this->assertSame(['musyrif.a'], $list->pluck('username')->all());
        $this->assertSame('Musyrif', $list[0]['role_label']);
        $this->assertTrue($list[0]['is_example']);

        // saat mengubah SDM pemilik akun, akunnya sendiri tetap muncul
        $own = collect($this->getJson("/api/v1/staff/linkable-accounts?staff_id={$owner->id}")->json('data.accounts'))->pluck('username');
        $this->assertContains('guru.b', $own->all());

        $this->postJson('/api/v1/staff', $this->staffPayload(['user_id' => $this->super->id]))->assertStatus(422);
    }

    public function test_privileged_role_and_permission_rules(): void
    {
        $admin = User::create(['username' => 'adm', 'name' => 'Admin', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        // tanpa izin users.create: tidak bisa membuat akun dari formulir SDM
        $this->assertFalse($this->getJson('/api/v1/staff/linkable-accounts')->json('data.can_create_account'));
        $this->postJson('/api/v1/staff', $this->staffPayload(['create_account' => true, 'account_role' => 'guru']))->assertForbidden();

        // dengan izin users.create (bukan Super Admin): peran berhak luas tidak tersedia
        $admin->givePermissionTo('users.create');
        $roles = collect($this->getJson('/api/v1/staff/linkable-accounts')->json('data.roles'))->pluck('value');
        $this->assertContains('guru', $roles->all());
        $this->assertNotContains('admin', $roles->all());
        $this->postJson('/api/v1/staff', $this->staffPayload(['create_account' => true, 'account_role' => 'admin']))->assertStatus(422);
        $this->postJson('/api/v1/staff', $this->staffPayload(['create_account' => true, 'account_role' => 'guru', 'account_username' => 'Ada Spasi']))->assertStatus(422);
        $this->assertSame(0, StaffProfile::count());
    }

    public function test_example_accounts_renamed_by_migration(): void
    {
        $u = User::create(['username' => 'pimpinan.pondok', 'name' => 'KH. Abdullah Gymnastiar, Lc.', 'email' => 'pimpinan@utsman.sch.id', 'password' => 'x12345678', 'is_active' => true]);
        $kept = User::create(['username' => 'guru.hasan', 'name' => 'Ust. Hasan Asli', 'password' => 'x12345678', 'is_active' => true]);
        (require database_path('migrations/2026_11_18_000008_rename_example_user_accounts.php'))->up();
        $this->assertSame('Akun Contoh – Pimpinan', $u->fresh()->name);
        $this->assertNull($u->fresh()->email);
        $this->assertSame('Ust. Hasan Asli', $kept->fresh()->name); // sudah diubah pemiliknya → dibiarkan
    }
}
