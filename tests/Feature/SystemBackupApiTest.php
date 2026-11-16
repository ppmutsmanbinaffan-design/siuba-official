<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Classroom;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\SystemBackup;
use App\Models\User;
use App\Services\System\BackupService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemBackupApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        SystemBackup::all()->each(fn ($b) => File::delete(BackupService::pathFor($b)));
        parent::tearDown();
    }

    public function test_backup_covers_all_tables_and_restore_round_trip(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $super = User::create(['username' => 'sa', 'name' => 'Super', 'email' => 's@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $super->assignRole('super-admin');
        $admin = User::create(['username' => 'adm11', 'name' => 'Admin', 'email' => 'a11@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');

        $class = Classroom::factory()->create(['name' => 'VII A']);
        Student::factory()->count(3)->create(['classroom_id' => $class->id]);
        StaffProfile::create(['staff_number' => 'S-1', 'name' => 'Ustadz Asli', 'staff_type' => 'teacher', 'is_active' => true]);
        AppSetting::put('institution', ['name' => 'Pesantren Sebelum']);

        // Admin boleh membuat backup, tapi tidak boleh memulihkan
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/v1/maintenance/backups', ['notes' => 'Uji'])->assertCreated()->json('data.backup_id');
        $list = $this->getJson('/api/v1/maintenance/backups')->assertOk()->json('data');
        $this->assertTrue($list[0]['file_exists']);
        $this->assertTrue($list[0]['restorable']);
        $this->assertStringContainsString('tabel', $list[0]['notes']);
        $this->postJson("/api/v1/maintenance/backups/{$id}/restore", ['confirmation' => "PULIHKAN {$id}"])->assertForbidden();

        // Backup mencakup tabel yang dulu terlewat (SDM, hak akses, pengaturan)
        $b = SystemBackup::firstWhere('backup_id', $id);
        $lines = gzfile(BackupService::pathFor($b));
        $tables = json_decode($lines[0], true)['manifest']['tables'];
        foreach (['staff_profiles', 'roles', 'model_has_roles', 'app_settings', 'students'] as $t) {
            $this->assertContains($t, $tables);
        }
        $this->assertNotContains('personal_access_tokens', $tables);

        $this->get("/api/v1/maintenance/backups/{$id}/download")->assertOk()->assertHeader('content-type', 'application/gzip');

        // Ubah data setelah backup
        Student::query()->delete();
        StaffProfile::query()->update(['name' => 'Diubah']);
        AppSetting::put('institution', ['name' => 'Pesantren Sesudah']);
        Student::factory()->create(['classroom_id' => $class->id, 'name' => 'Santri Baru']);

        Sanctum::actingAs($super);
        $this->postJson("/api/v1/maintenance/backups/{$id}/restore", ['confirmation' => 'pulihkan'])->assertStatus(422);
        $r = $this->postJson("/api/v1/maintenance/backups/{$id}/restore", ["confirmation" => "PULIHKAN {$id}"])->assertOk()->json("data");
        $this->assertNotEmpty($r['safety_backup_id']);

        $this->assertSame(3, Student::count());
        $this->assertSame(0, Student::where('name', 'Santri Baru')->count());
        $this->assertSame('Ustadz Asli', StaffProfile::first()->name);
        \Illuminate\Support\Facades\Cache::flush();
        $this->assertSame('Pesantren Sebelum', AppSetting::get('institution')['name']);
        $this->assertTrue($admin->fresh()->hasRole('admin')); // hak akses ikut pulih
        $this->assertSame(2, SystemBackup::where('status', 'verified')->count()); // backup asli + pengaman

        // Hapus backup
        $this->deleteJson("/api/v1/maintenance/backups/{$r['safety_backup_id']}")->assertOk();
        $this->assertSame(1, SystemBackup::count());
    }

    public function test_cli_skips_when_recent_backup_exists(): void
    {
        $this->artisan('system:backup', ['--notes' => 'pertama'])->assertExitCode(0);
        $this->artisan('system:backup', ['--if-older-than' => 20])->expectsOutputToContain('tidak perlu backup baru')->assertExitCode(0);
        $this->assertSame(1, SystemBackup::count());
    }
}
