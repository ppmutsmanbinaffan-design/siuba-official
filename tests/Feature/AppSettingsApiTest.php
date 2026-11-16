<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_institution_attendance_cards_and_permissions(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::create(['username' => 'adm10', 'name' => 'Admin', 'email' => 'a10@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');

        // Publik: nilai bawaan
        $this->getJson('/api/v1/cms/institution')->assertOk()->assertJsonPath('data.name', 'Pondok Pesantren Utsman Bin Affan');

        Sanctum::actingAs($admin);
        $this->putJson('/api/v1/settings/institution', ['name' => 'PP Utsman Bin Affan Cisauk', 'address' => 'Jl. Contoh 1', 'phone' => '0812'])->assertOk();
        $this->putJson('/api/v1/settings/institution', ['name' => ''])->assertStatus(422);
        $this->putJson('/api/v1/settings/attendance', ['late_tolerance_minutes' => 7, 'auto_close_session_minutes' => 30, 'rfid_debounce_seconds' => 5])->assertOk();
        $this->putJson('/api/v1/settings/rahasia', ['x' => 1])->assertNotFound();

        $pub = $this->getJson('/api/v1/cms/institution')->json('data');
        $this->assertSame('PP Utsman Bin Affan Cisauk', $pub['name']);
        $this->assertSame('Jl. Contoh 1', $pub['address']);
        $this->assertArrayNotHasKey('active_semester', $pub);

        // Kegiatan baru memakai toleransi bawaan dari pengaturan
        $this->postJson('/api/v1/activities', ['name' => 'Tes Toleransi'])->assertCreated()->assertJsonPath('data.late_tolerance_minutes', 7);

        $this->putJson('/api/v1/settings/card-templates', ['templates' => [['id' => 'tpl-1', 'name' => 'Kartu A']]])->assertOk();
        $this->assertSame('Kartu A', $this->getJson('/api/v1/settings/card-templates')->json('data.0.name'));

        $info = $this->getJson('/api/v1/settings/system-info')->assertOk()->json('data');
        $this->assertSame(PHP_VERSION, $info['php_version']);
        $this->postJson('/api/v1/settings/clear-cache', ['type' => 'data'])->assertOk();

        $guru = User::create(['username' => 'guru10', 'name' => 'G', 'email' => 'g10@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);
        $this->getJson('/api/v1/settings')->assertOk();
        $this->putJson('/api/v1/settings/institution', ['name' => 'X'])->assertForbidden();
        $this->getJson('/api/v1/settings/system-info')->assertForbidden();
        $this->putJson('/api/v1/settings/card-templates', ['templates' => []])->assertForbidden();
    }
}
