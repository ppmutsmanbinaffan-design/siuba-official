<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocalDataMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $u = User::create(['username' => 'root', 'name' => 'Root', 'email' => 'r@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $u->assignRole('super-admin');
        Sanctum::actingAs($u);
    }

    /** Bentuk data persis seperti yang disimpan aplikasi React di localStorage. */
    private function browserPayload(): array
    {
        return [
            'classrooms' => [
                ['id' => 1, 'name' => 'VII A', 'grade_level' => 7, 'academic_year' => '2026/2027', 'is_active' => true],
                ['id' => 2, 'name' => 'Kelas Tidak Dipakai', 'grade_level' => 9, 'academic_year' => '2026/2027', 'is_active' => true],
            ],
            'dormitories' => [['id' => 1, 'name' => 'Asrama Al-Fatih', 'gender' => 'male', 'is_active' => true]],
            'dormitory_rooms' => [['id' => 5, 'dormitory_id' => 1, 'dormitory_name' => 'Asrama Al-Fatih', 'name' => 'Kamar Umar 03', 'capacity' => 12, 'is_active' => true]],
            'activities' => [['id' => 3, 'code' => 'HALAQAH-SORE', 'name' => 'Halaqah Sore', 'category_name' => 'Tahfidz', 'allow_manual' => true, 'allow_qr' => true, 'allow_rfid' => true]],
            'students' => [
                ['id' => 101, 'student_number' => 'NIS-ASLI-01', 'nisn' => '0011', 'name' => 'Hasan Basri', 'gender' => 'male', 'classroom_id' => 1, 'dormitory_room_id' => 5,
                    'qr_token' => 'STU-ASLI0001', 'rfid_uid' => 'aa:bb:cc:01', 'guardian_name' => 'Pak Basri', 'status' => 'active', 'is_active' => true, 'generation_year' => 2026],
                ['id' => 102, 'student_number' => 'NIS-ASLI-02', 'name' => 'Husain', 'gender' => 'L', 'classroom_name' => 'VII A', 'status' => 'graduated', 'is_active' => false],
                // data contoh bawaan aplikasi -> harus dilewati
                ['id' => 1, 'student_number' => 'UBA260001', 'name' => 'Ahmad Fauzan', 'gender' => 'male'],
            ],
            'sessions' => [
                ['id' => 900, 'activity_id' => 3, 'activity_code' => 'HALAQAH-SORE', 'activity_name' => 'Halaqah Sore', 'session_code' => 'ATT-20261001-HALAQAH-01',
                    'session_date' => '2026-10-01', 'start_at' => '2026-10-01 15:30:00', 'present_until' => '2026-10-01 15:45:00',
                    'late_until' => '2026-10-01 16:00:00', 'end_at' => '2026-10-01 17:00:00', 'status' => 'open', 'location' => 'Masjid'],
                ['id' => 1, 'session_code' => 'ATT-20260823-SUBUH-001', 'session_date' => '2026-08-23', 'start_at' => '2026-08-23 04:15:00', 'end_at' => '2026-08-23 05:00:00'],
            ],
            'participants' => [
                ['id' => 1, 'attendance_session_id' => 900, 'student_id' => 101, 'eligibility_status' => 'eligible'],
                ['id' => 2, 'attendance_session_id' => 900, 'student_id' => 102, 'eligibility_status' => 'eligible'],
            ],
            'records' => [
                ['id' => 7, 'attendance_session_id' => 900, 'student_id' => 101, 'student_name' => 'Hasan Basri', 'status' => 'late', 'method' => 'qr',
                    'check_in_at' => '2026-10-01 15:50:00', 'late_minutes' => 5, 'recorded_by' => 'Ustadz Ali'],
                ['id' => 8, 'attendance_session_id' => 900, 'student_id' => 102, 'student_name' => 'Husain', 'status' => 'sick', 'method' => 'manual', 'check_in_at' => '2026-10-01 15:40:00'],
                ['id' => 9, 'attendance_session_id' => 1, 'student_id' => 1, 'student_name' => 'Ahmad Fauzan', 'status' => 'present', 'method' => 'manual'],
            ],
        ];
    }

    public function test_dry_run_reports_but_saves_nothing(): void
    {
        $res = $this->postJson('/api/v1/migration/local-data', ['dry_run' => true] + $this->browserPayload())
            ->assertOk()->json('data');

        $this->assertTrue($res['dry_run']);
        $this->assertSame(2, $res['summary']['students']['created']);
        $this->assertSame(1, $res['summary']['students']['demo_skipped']);
        $this->assertSame(2, $res['summary']['records']['created']);
        $this->assertSame(0, Student::count());
        $this->assertSame(0, AttendanceRecord::count());
    }

    public function test_import_maps_local_ids_and_skips_demo_data(): void
    {
        $res = $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $this->browserPayload())
            ->assertOk()->json('data.summary');

        $this->assertSame(2, Student::count());
        $hasan = Student::where('student_number', 'NIS-ASLI-01')->first();
        $this->assertSame('VII A', $hasan->classroom->name);
        $this->assertSame('Kamar Umar 03', $hasan->dormitoryRoom->name);
        $this->assertSame('STU-ASLI0001', $hasan->qr_token, 'QR lama dipertahankan agar kartu tidak perlu dicetak ulang');
        $this->assertSame('AABBCC01', $hasan->rfid_uid);
        $this->assertSame('graduated', Student::where('student_number', 'NIS-ASLI-02')->value('status'));

        // Kelas yang tidak dipakai santri mana pun tidak ikut dibuat
        $this->assertSame(0, Classroom::where('name', 'Kelas Tidak Dipakai')->count());

        $session = AttendanceSession::where('session_code', 'ATT-20261001-HALAQAH-01')->first();
        $this->assertSame('closed', $session->status->value, 'Sesi lama yang masih open ditutup saat impor');
        $this->assertSame('HALAQAH-SORE', $session->activity->code);
        $this->assertSame(0, AttendanceSession::where('session_code', 'ATT-20260823-SUBUH-001')->count());

        $this->assertSame(2, AttendanceRecord::count());
        $rec = AttendanceRecord::where('student_id', $hasan->id)->first();
        $this->assertSame('late', $rec->status->value);
        $this->assertSame('qr', $rec->method->value);
        $this->assertSame('Ustadz Ali', $rec->metadata['recorded_by_name']);
        $this->assertSame(2, $res['participants']['created']);
    }

    public function test_import_is_idempotent_and_keeps_server_data(): void
    {
        $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $this->browserPayload())->assertOk();

        // Komputer operator lain mengimpor data yang sama -> tidak ada duplikat
        $payload = $this->browserPayload();
        $payload['records'][0]['status'] = 'present'; // beda dengan server
        $res = $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $payload)->assertOk()->json('data');

        $this->assertSame(2, Student::count());
        $this->assertSame(2, AttendanceRecord::count());
        $this->assertSame(2, $res['summary']['students']['existing']);
        $this->assertSame(2, $res['summary']['records']['existing']);
        $this->assertNotEmpty(array_filter($res['warnings'], fn ($w) => str_contains($w, 'Data server dipertahankan')));
        $this->assertSame('late', AttendanceRecord::whereHas('student', fn ($q) => $q->where('student_number', 'NIS-ASLI-01'))->first()->status->value);
    }

    public function test_conflicting_rfid_and_qr_are_reported_not_stolen(): void
    {
        $cat = ActivityCategory::create(['code' => 'X', 'name' => 'X']);
        Student::factory()->create(['student_number' => 'LAIN-01', 'name' => 'Pemilik Lama', 'rfid_uid' => 'AABBCC01', 'qr_token' => 'STU-ASLI0001']);

        $res = $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $this->browserPayload())->assertOk()->json('data');

        $hasan = Student::where('student_number', 'NIS-ASLI-01')->first();
        $this->assertNull($hasan->rfid_uid);
        $this->assertNotSame('STU-ASLI0001', $hasan->qr_token);
        $this->assertGreaterThanOrEqual(2, $res['warning_count']);
    }

    public function test_update_mode_fills_server_records_without_blanking(): void
    {
        Student::factory()->create(['student_number' => 'NIS-ASLI-01', 'name' => 'Hasan', 'nisn' => '9999']);
        $payload = $this->browserPayload();
        unset($payload['students'][0]['nisn']);

        $this->postJson('/api/v1/migration/local-data', ['dry_run' => false, 'mode' => 'update'] + $payload)->assertOk();

        $s = Student::where('student_number', 'NIS-ASLI-01')->first();
        $this->assertSame('Hasan Basri', $s->name);
        $this->assertSame('Pak Basri', $s->guardian_name);
        $this->assertSame('9999', $s->nisn, 'NISN server tidak dikosongkan');
    }

    public function test_requires_maintenance_permission(): void
    {
        $guru = User::create(['username' => 'g', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);

        $this->postJson('/api/v1/migration/local-data', ['dry_run' => true])->assertStatus(403);
    }

    public function test_imports_excusals_staff_and_staff_attendance(): void
    {
        $payload = $this->browserPayload() + [
            'excusals' => [
                ['id' => 1763200000001, 'student_id' => 101, 'student_name' => 'Hasan Basri', 'type' => 'sick', 'reason' => 'Demam',
                    'start_at' => '2026-10-01T04:00:00', 'end_at' => '2026-10-01T20:00:00', 'status' => 'approved', 'approved_by' => 'Ustadz Ali'],
                ['id' => 1, 'student_id' => 1, 'student_name' => 'Ahmad Fauzan', 'type' => 'sick', 'reason' => 'demo',
                    'start_at' => '2026-08-23T04:00:00', 'end_at' => '2026-08-23T20:00:00', 'status' => 'approved'],
            ],
            'staff' => [
                ['id' => 77, 'staff_number' => 'NIP-ASLI-9', 'name' => 'Ustadzah Aisyah', 'gender' => 'female', 'staff_type' => 'musyrif', 'employment_status' => 'contract', 'qr_token' => 'STF-ASLI00009'],
                ['id' => 1, 'staff_number' => 'STF260001', 'name' => 'Demo Staff', 'gender' => 'male', 'staff_type' => 'teacher'],
            ],
            'staff_records' => [
                ['id' => 1763200000002, 'staff_id' => 77, 'attendance_date' => '2026-10-01', 'attendance_type' => 'daily', 'status' => 'late',
                    'check_in_at' => '2026-10-01T07:30:00+07:00', 'late_minutes' => 30, 'check_in_method' => 'qr'],
                ['id' => 1763200000003, 'staff_id' => 77, 'attendance_date' => '2026-10-01', 'attendance_type' => 'teaching', 'status' => 'present'],
            ],
            'staff_absences' => [
                ['id' => 1763200000004, 'staff_id' => 77, 'type' => 'leave', 'start_at' => '2026-10-05T00:00:00', 'end_at' => '2026-10-06T23:59:00', 'reason' => 'Cuti', 'status' => 'approved', 'approved_by' => 'Kabag TU'],
            ],
        ];

        $res = $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $payload)->assertOk()->json('data.summary');

        $this->assertSame(1, $res['excusals']['created']);
        $this->assertSame(1, $res['excusals']['demo_skipped']);
        $this->assertSame(1, $res['staff']['created']);
        $this->assertSame(1, $res['staff']['demo_skipped']);
        $this->assertSame(1, $res['staff_records']['created']);
        $this->assertSame(1, $res['staff_absences']['created']);

        $this->assertSame('sick', \App\Models\StudentExcusal::first()->type);
        $staff = \App\Models\StaffProfile::where('staff_number', 'NIP-ASLI-9')->first();
        $this->assertSame('STF-ASLI00009', $staff->qr_token);
        $this->assertSame('P', $staff->gender);
        $this->assertSame(30, \App\Models\StaffAttendanceRecord::first()->late_minutes);

        // Diulang -> tidak ada duplikat
        $again = $this->postJson('/api/v1/migration/local-data', ['dry_run' => false] + $payload)->assertOk()->json('data.summary');
        $this->assertSame(1, $again['excusals']['existing']);
        $this->assertSame(1, $again['staff']['existing']);
        $this->assertSame(1, $again['staff_records']['existing']);
        $this->assertSame(1, $again['staff_absences']['existing']);
    }
}
