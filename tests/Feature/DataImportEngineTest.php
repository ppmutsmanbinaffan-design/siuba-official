<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DataImportEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->adminUser = User::create([
            'username' => 'admin.test',
            'name' => 'Admin Testing',
            'email' => 'admin.test@utsman.sch.id',
            'password' => 'password',
            'is_active' => true,
        ]);

        $this->adminUser->syncRoles(['super-admin']);
    }

    public function test_student_template_download(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->get('/api/v1/import/students/template');
        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Type'), 'text/csv'));
    }

    public function test_student_import_preview(): void
    {
        Sanctum::actingAs($this->adminUser);

        $class7A = Classroom::create(['name' => 'VII A', 'grade_level' => 7, 'academic_year' => '2026/2027']);
        $dorm = Dormitory::create(['name' => 'Asrama Al-Farabi', 'gender' => 'L']);
        $room = DormitoryRoom::create(['dormitory_id' => $dorm->id, 'name' => 'Al-Farabi 01', 'capacity' => 10]);

        $csv = "NIS,NISN,Nama Lengkap,Panggilan,Jenis Kelamin,Kelas,Kamar Asrama,RFID UID\n" .
               "202607001,0089123401,Muhammad Abdullah Fauzan,Fauzan,L,VII A,Al-Farabi 01,04:A8:7F:12\n" .
               "202607002,0089123402,Aisyah Nur Ramadhani,Aisyah,P,VII A,Al-Farabi 01,\n";

        $response = $this->postJson('/api/v1/import/students/preview', [
            'csv_content' => $csv,
            'mode' => 'upsert',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'total' => 2,
                'valid_count' => 2,
                'warning_count' => 0,
                'error_count' => 0,
                'can_import' => true,
            ],
        ]);
    }

    public function test_student_import_execution_upsert_and_skip(): void
    {
        Sanctum::actingAs($this->adminUser);

        $class7A = Classroom::create(['name' => 'VII A', 'grade_level' => 7, 'academic_year' => '2026/2027']);

        $csv = "NIS,NISN,Nama Lengkap,Panggilan,Jenis Kelamin,Kelas,RFID UID\n" .
               "202607001,0089123401,Muhammad Abdullah Fauzan,Fauzan,L,VII A,04A87F12\n" .
               "202607002,0089123402,Zaidan Rayhan Al-Ghifari,Rayhan,L,VII A,\n";

        // 1. Initial Import
        $response = $this->postJson('/api/v1/import/students', [
            'csv_content' => $csv,
            'mode' => 'upsert',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(2, Student::count());

        $fauzan = Student::where('student_number', '202607001')->first();
        $this->assertNotNull($fauzan);
        $this->assertEquals('Muhammad Abdullah Fauzan', $fauzan->name);
        $this->assertEquals('04A87F12', $fauzan->rfid_uid);
        $this->assertNotNull($fauzan->qr_token);
        $this->assertTrue(str_starts_with($fauzan->qr_token, 'STU-'));

        // 2. Re-import with changed name in upsert mode
        $csvUpdated = "NIS,NISN,Nama Lengkap,Panggilan,Jenis Kelamin,Kelas,RFID UID\n" .
                      "202607001,0089123401,Muhammad Abdullah Fauzan S.T.,Fauzan,L,VII A,04A87F12\n";

        $response2 = $this->postJson('/api/v1/import/students', [
            'csv_content' => $csvUpdated,
            'mode' => 'upsert',
        ]);

        $response2->assertStatus(200);
        $fauzan->refresh();
        $this->assertEquals('Muhammad Abdullah Fauzan S.T.', $fauzan->name);
        $this->assertEquals(2, Student::count());

        // 3. Re-import in skip mode
        $csvSkip = "NIS,NISN,Nama Lengkap,Panggilan,Jenis Kelamin,Kelas,RFID UID\n" .
                   "202607001,0089123401,Nama Tidak Berubah,Fauzan,L,VII A,04A87F12\n" .
                   "202607003,0089123403,Santri Baru Ketiga,Santri,L,VII A,\n";

        $response3 = $this->postJson('/api/v1/import/students', [
            'csv_content' => $csvSkip,
            'mode' => 'skip',
        ]);

        $response3->assertStatus(200);
        $this->assertEquals(3, Student::count());
        $fauzan->refresh();
        $this->assertEquals('Muhammad Abdullah Fauzan S.T.', $fauzan->name); // unchanged because of skip
    }

    public function test_staff_template_download(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->get('/api/v1/import/staff/template');
        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Type'), 'text/csv'));
    }

    public function test_staff_import_and_role_assignment(): void
    {
        Sanctum::actingAs($this->adminUser);

        $csv = "NIP/Username,Nama Lengkap,Role,Email,No HP,Gender,Jabatan,Departemen\n" .
               "guru.ahmad,Ustadz Ahmad Fauzi M.Pd,guru,ahmad@utsman.sch.id,08123456789,L,Guru Fiqih,Kurikulum\n" .
               "pelatih.bambang,Coach Bambang Pamungkas,pelatih,pelatih@utsman.sch.id,08129876543,L,Pelatih Sepakbola,Ekskul\n" .
               "musyrif.hasan,Ustadz Hasan Basri,musyrif,hasan@utsman.sch.id,08131122334,L,Musyrif Asrama,Kesantrian\n";

        $response = $this->postJson('/api/v1/import/staff', [
            'csv_content' => $csv,
            'mode' => 'upsert',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'stats' => [
                'created' => 3,
                'updated' => 0,
                'failed' => 0,
            ],
        ]);

        // Verify users created
        $guru = User::where('username', 'guru.ahmad')->first();
        $this->assertNotNull($guru);
        $this->assertTrue($guru->hasRole('guru'));

        $pelatih = User::where('username', 'pelatih.bambang')->first();
        $this->assertNotNull($pelatih);
        $this->assertTrue($pelatih->hasRole('pelatih'));

        $musyrif = User::where('username', 'musyrif.hasan')->first();
        $this->assertNotNull($musyrif);
        $this->assertTrue($musyrif->hasRole('musyrif'));

        // Test login with newly imported staff account
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'guru.ahmad',
            'password' => 'password',
        ]);

        $loginRes->assertStatus(200);
        $loginRes->assertJson([
            'success' => true,
        ]);
        $this->assertNotEmpty($loginRes->json('token'));
    }

    public function test_import_unauthorized_without_sanctum(): void
    {
        $response = $this->postJson('/api/v1/import/students/preview', [
            'csv_content' => "NIS,Nama\n123,Test",
        ]);

        $response->assertStatus(401);
    }
}
