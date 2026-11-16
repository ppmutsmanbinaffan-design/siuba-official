<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\User;
use App\Support\Spreadsheet\SimpleXlsx;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DataImportXlsxTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::create([
            'username' => 'admin.xlsx',
            'name' => 'Admin Xlsx',
            'email' => 'admin.xlsx@example.test',
            'password' => 'password',
            'is_active' => true,
        ]);
        $this->admin->syncRoles(['super-admin']);

        Classroom::create(['name' => 'VII A', 'grade_level' => 7, 'academic_year' => '2026/2027']);
        $dorm = Dormitory::create(['name' => 'Asrama Al-Farabi', 'gender' => 'L']);
        DormitoryRoom::create(['dormitory_id' => $dorm->id, 'name' => 'Al-Farabi 01', 'capacity' => 10]);
    }

    private function upload(string $fixture, string $name): UploadedFile
    {
        return new UploadedFile(base_path('tests/Fixtures/' . $fixture), $name, null, null, true);
    }

    public function test_reader_handles_inline_and_shared_strings_dates_and_big_numbers(): void
    {
        foreach (['import-santri.xlsx', 'import-santri-sharedstrings.xlsx'] as $fx) {
            $rows = SimpleXlsx::read(base_path('tests/Fixtures/' . $fx));
            $this->assertSame('NIS', $rows[0][0], $fx);
            $this->assertSame('0089123401', $rows[1][1], $fx);          // teks dengan 0 di depan tetap utuh
            $this->assertSame('6281234567890', $rows[1][10], $fx);      // angka besar tidak jadi 6.28E+12
            $this->assertSame('2026-07-15', $rows[1][13], $fx);         // serial tanggal Excel -> Y-m-d
            $this->assertSame('', $rows[2][8], $fx);                    // sel kosong di tengah tidak menggeser kolom
            $this->assertSame('active', $rows[2][12], $fx);
            $this->assertCount(3, $rows, $fx);                          // hanya sheet pertama, baris kosong dilewati
        }
    }

    public function test_preview_and_import_students_from_xlsx(): void
    {
        Sanctum::actingAs($this->admin);

        $preview = $this->post('/api/v1/import/students/preview', [
            'mode' => 'upsert',
            'file' => $this->upload('import-santri-sharedstrings.xlsx', 'data-santri.xlsx'),
        ], ['Accept' => 'application/json']);
        $preview->assertOk()->assertJsonPath('success', true);

        $import = $this->post('/api/v1/import/students', [
            'mode' => 'upsert',
            'file' => $this->upload('import-santri.xlsx', 'data-santri.xlsx'),
        ], ['Accept' => 'application/json']);
        $import->assertOk();

        $this->assertSame(2, Student::count());
        $fauzan = Student::where('student_number', '202607001')->first();
        $this->assertNotNull($fauzan);
        $this->assertSame('Muhammad Abdullah Fauzan', $fauzan->name);
        $this->assertSame('0089123401', (string) $fauzan->nisn);
        $this->assertSame('04A87F12', $fauzan->rfid_uid);
    }

    public function test_xlsx_template_round_trips_through_import(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->get('/api/v1/import/students/template?format=xlsx');
        $res->assertOk();
        $this->assertStringContainsString('spreadsheetml', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('.xlsx', $res->headers->get('Content-Disposition'));

        $tmp = tempnam(sys_get_temp_dir(), 'tpl') . '.xlsx';
        file_put_contents($tmp, $res->getContent());
        $rows = SimpleXlsx::read($tmp);
        $this->assertSame('NIS', $rows[0][0]);
        $this->assertSame('0089123401', $rows[1][1]);

        $preview = $this->post('/api/v1/import/students/preview', [
            'file' => new UploadedFile($tmp, 'Template_Import_Santri_SIUBA.xlsx', null, null, true),
        ], ['Accept' => 'application/json']);
        $preview->assertOk()->assertJsonPath('success', true);
        @unlink($tmp);

        $this->get('/api/v1/import/staff/template?format=xlsx')->assertOk();
        $csv = $this->get('/api/v1/import/staff/template');
        $this->assertStringContainsString('text/csv', $csv->headers->get('Content-Type'));
    }

    public function test_legacy_xls_and_broken_files_get_clear_messages(): void
    {
        Sanctum::actingAs($this->admin);

        $xls = UploadedFile::fake()->createWithContent('lama.xls', "\xD0\xCF\x11\xE0 binary");
        $this->post('/api/v1/import/students/preview', ['file' => $xls], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonFragment(['message' => 'Format .xls (Excel 97-2003) belum didukung. Di Excel pilih File → Save As → "Excel Workbook (.xlsx)" atau "CSV UTF-8".']);

        $broken = UploadedFile::fake()->createWithContent('rusak.xlsx', 'bukan zip');
        $res = $this->post('/api/v1/import/students/preview', ['file' => $broken], ['Accept' => 'application/json']);
        $res->assertStatus(422)->assertJsonPath('success', false);
        $this->assertStringContainsString('.xlsx', $res->json('message'));
    }

    public function test_windows_1252_csv_is_converted(): void
    {
        Sanctum::actingAs($this->admin);

        $csv = "NIS,Nama Lengkap,Jenis Kelamin,Kelas\n202607009," . mb_convert_encoding('Zulfikar Café', 'Windows-1252', 'UTF-8') . ",L,VII A\n";
        $file = UploadedFile::fake()->createWithContent('lama.csv', $csv);
        $this->post('/api/v1/import/students', ['file' => $file], ['Accept' => 'application/json'])->assertOk();
        $this->assertSame('Zulfikar Café', Student::where('student_number', '202607009')->value('name'));
    }
}
