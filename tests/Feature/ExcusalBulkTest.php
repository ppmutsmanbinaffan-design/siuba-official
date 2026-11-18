<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\StudentExcusal;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/** Dispensasi peserta event disimpan massal di server (sebelumnya hanya di layar). */
class ExcusalBulkTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_dispensation_saved_and_deduplicated(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $admin = User::create(['username' => 'adm', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $students = Student::factory()->count(3)->create();

        $payload = [
            'student_ids' => $students->pluck('id')->all(),
            'type' => 'dispensation',
            'start_at' => '2026-12-01T00:00:00',
            'end_at' => '2026-12-02T23:59:59',
            'reason' => 'Dispensasi Peserta Event Resmi: Lomba MTQ',
        ];
        $this->postJson('/api/v1/student-excusals/bulk', $payload)->assertCreated()->assertJsonPath('data.created', 3);
        $this->assertSame(3, StudentExcusal::where('status', 'approved')->where('type', 'dispensation')->count());

        // diulang: tidak membuat ganda
        $this->postJson('/api/v1/student-excusals/bulk', $payload)->assertCreated()->assertJsonPath('data.created', 0)->assertJsonPath('data.skipped', 3);
        $this->assertSame(3, StudentExcusal::count());
    }

    public function test_bulk_requires_excuses_permission(): void
    {
        $this->seed(RolePermissionSeeder::class);
        Permission::findOrCreate('attendance.manual', 'web');
        $u = User::create(['username' => 'g', 'name' => 'Guru', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->givePermissionTo('attendance.manual');
        Sanctum::actingAs($u);
        $s = Student::factory()->create();
        $this->postJson('/api/v1/student-excusals/bulk', [
            'student_ids' => [$s->id], 'type' => 'dispensation', 'start_at' => '2026-12-01', 'end_at' => '2026-12-01', 'reason' => 'x',
        ])->assertForbidden();
    }
}
