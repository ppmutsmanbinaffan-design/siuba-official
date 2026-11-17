<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 20: Kebijakan Keamanan disimpan di server dan benar-benar ditegakkan.
 */
class SecurityPolicyApiTest extends TestCase
{
    use RefreshDatabase;

    private User $super;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        RateLimiter::clear('login-account:' . sha1('target20'));
        $this->super = User::create(['username' => 'sa20', 'name' => 'Super 20', 'email' => 'sa20@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->super->assignRole('super-admin');
        User::create(['username' => 'target20', 'name' => 'Target', 'email' => 't20@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
    }

    private function policy(array $override): void
    {
        Sanctum::actingAs($this->super);
        $current = $this->getJson('/api/v1/settings')->assertOk()->json('data.security');
        $this->putJson('/api/v1/settings/security', array_merge($current, $override))->assertOk();
        $this->app['auth']->forgetGuards();
    }

    private function login(string $username, string $password)
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/auth/login', ['username' => $username, 'password' => $password]);
    }

    private function me(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/v1/auth/me');
    }

    public function test_defaults_keep_previous_behaviour_and_admin_cannot_change(): void
    {
        Sanctum::actingAs($this->super);
        $sec = $this->getJson('/api/v1/settings')->json('data.security');
        $this->assertSame(0, $sec['session_timeout_minutes']);
        $this->assertSame(8, $sec['min_password_length']);
        $this->assertFalse($sec['allow_concurrent_sessions']);

        $admin = User::create(['username' => 'adm20b', 'name' => 'Admin', 'email' => 'adm20b@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->putJson('/api/v1/settings/security', $sec)->assertForbidden();
        // Pengaturan lembaga tetap bisa disimpan lewat rute {key}
        $this->putJson('/api/v1/settings/institution', ['name' => 'Pondok Uji'])->assertOk();
    }

    public function test_account_lockout_after_failed_attempts(): void
    {
        $this->policy(['max_login_attempts_before_lockout' => 3, 'lockout_duration_minutes' => 10]);
        foreach (range(1, 3) as $_) {
            $this->login('target20', 'salah-sandi')->assertStatus(401);
        }
        $r = $this->login('target20', 'Rahasia123')->assertStatus(429);
        $this->assertStringContainsString('dikunci', $r->json('message'));

        $this->travel(11)->minutes();
        $this->login('target20', 'Rahasia123')->assertOk();
        $this->assertDatabaseHas('audit_logs', ['event' => 'security_policy_updated']);
    }

    public function test_concurrent_sessions_policy(): void
    {
        $a = $this->login('target20', 'Rahasia123')->json('token');
        $b = $this->login('target20', 'Rahasia123')->json('token');
        $this->me($a)->assertUnauthorized();   // bawaan: login baru mengakhiri sesi lama
        $this->me($b)->assertOk();

        $this->policy(['allow_concurrent_sessions' => true]);
        $c = $this->login('target20', 'Rahasia123')->json('token');
        $d = $this->login('target20', 'Rahasia123')->json('token');
        $this->me($c)->assertOk();
        $this->me($d)->assertOk();
    }

    public function test_idle_session_timeout(): void
    {
        $this->policy(['session_timeout_minutes' => 30]);
        $token = $this->login('target20', 'Rahasia123')->json('token');
        $this->me($token)->assertOk();
        $this->travel(20)->minutes();
        $this->me($token)->assertOk();          // dipakai → masa aktif diperpanjang
        $this->travel(31)->minutes();
        $this->me($token)->assertUnauthorized(); // tidak dipakai > 30 menit
    }

    public function test_password_policy_applies_to_new_users(): void
    {
        $this->policy(['min_password_length' => 10, 'require_numbers' => true, 'require_special_char' => true]);
        Sanctum::actingAs($this->super);
        $r = $this->postJson('/api/v1/users', ['name' => 'Baru', 'username' => 'baru20', 'password' => 'Rahasia123'])->assertStatus(422);
        $this->assertStringContainsString('simbol', json_encode($r->json()));
        $this->postJson('/api/v1/users', ['name' => 'Baru', 'username' => 'baru20', 'password' => 'Rahasia123!'])->assertSuccessful();
    }

    public function test_audit_retention_prunes_old_logs(): void
    {
        $this->policy(['audit_retention_days' => 30]);
        AuditLog::create(['event' => 'lama', 'auditable_type' => 'X', 'auditable_id' => 1, 'created_at' => now()->subDays(40)]);
        AuditLog::create(['event' => 'baru', 'auditable_type' => 'X', 'auditable_id' => 2, 'created_at' => now()->subDays(5)]);
        $this->artisan('model:prune', ['--model' => [AuditLog::class]])->assertSuccessful();
        $this->assertDatabaseMissing('audit_logs', ['event' => 'lama']);
        $this->assertDatabaseHas('audit_logs', ['event' => 'baru']);
    }
}
