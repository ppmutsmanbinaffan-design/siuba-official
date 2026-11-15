<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRecordHistory;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Classroom;
use App\Models\Dormitory;
use App\Models\DormitoryRoom;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak API yang dipakai aplikasi React (src/features/students, src/features/attendance).
 * Sebelumnya endpoint ini tidak ada di Laravel sehingga React diam-diam menyimpan ke localStorage.
 */
class SpaApiContractTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::today()->setTime(7, 0));

        $this->admin = User::create(['username' => 'admin', 'name' => 'Admin TU', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        $this->admin->givePermissionTo('students.delete');
        Sanctum::actingAs($this->admin);
    }

    private function openSession(array $overrides = []): AttendanceSession
    {
        $cat = ActivityCategory::firstOrCreate(['code' => 'IBADAH'], ['name' => 'Ibadah']);
        $act = Activity::create([
            'activity_category_id' => $cat->id, 'code' => 'SUBUH' . uniqid(), 'name' => 'Shalat Subuh',
            'allow_manual' => true, 'allow_qr' => true, 'allow_rfid' => true,
        ]);

        return AttendanceSession::create(array_merge([
            'session_code' => 'S-' . uniqid(), 'activity_id' => $act->id, 'session_date' => today(),
            'start_at' => today()->setTime(6, 30), 'present_until' => today()->setTime(7, 15),
            'late_until' => today()->setTime(7, 45), 'end_at' => today()->setTime(8, 0),
            'status' => SessionStatus::OPEN, 'opened_at' => now(),
        ], $overrides));
    }

    // ------------------------------------------------------------ Santri

    public function test_student_crud_roundtrip_matches_react_shape(): void
    {
        $class = Classroom::factory()->create(['name' => 'VII A']);
        $dorm = Dormitory::create(['name' => 'Asrama Putra', 'gender' => 'L']);
        $room = DormitoryRoom::create(['dormitory_id' => $dorm->id, 'name' => 'Kamar 01', 'capacity' => 20]);

        $created = $this->postJson('/api/v1/students', [
            'student_number' => 'UBA260001', 'nisn' => '0012345678', 'name' => 'Ahmad Fauzan',
            'gender' => 'male', 'classroom_id' => $class->id, 'dormitory_room_id' => $room->id,
            'guardian_name' => 'Bapak Fauzi', 'guardian_phone' => '0812', 'address' => 'Bandung',
            'birth_date' => '2013-05-01', 'entry_year' => 2026,
        ])->assertCreated()->json('data');

        $this->assertSame('L', $created['gender']);
        $this->assertSame('VII A', $created['classroom_name']);
        $this->assertSame('Kamar 01', $created['dormitory_room_name']);
        $this->assertSame('active', $created['status']);
        $this->assertStringStartsWith('STU-', $created['qr_token']);

        // NIS duplikat ditolak 422 (React menampilkan error per field)
        $this->postJson('/api/v1/students', ['student_number' => 'UBA260001', 'name' => 'X', 'gender' => 'L'])
            ->assertStatus(422);

        // List dengan meta yang dibaca studentApi.getStudents (total, page, per_page, last_page)
        $list = $this->getJson('/api/v1/students?search=Fauzan&per_page=10&gender=male')->assertOk();
        $list->assertJsonPath('meta.total', 1)->assertJsonPath('meta.page', 1)->assertJsonPath('meta.last_page', 1);
        $this->assertSame('Ahmad Fauzan', $list->json('data.0.name'));

        // Ubah status -> nonaktif
        $this->putJson("/api/v1/students/{$created['id']}", ['status' => 'graduated', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.status', 'graduated')->assertJsonPath('data.is_active', false);

        $this->getJson("/api/v1/students/{$created['id']}")->assertOk()->assertJsonPath('data.guardian_name', 'Bapak Fauzi');

        $this->deleteJson("/api/v1/students/{$created['id']}")->assertOk();
        $this->assertSoftDeleted('students', ['id' => $created['id']]);
    }

    public function test_master_reference_lists(): void
    {
        $class = Classroom::factory()->create(['name' => 'VIII B']);
        Student::factory()->count(2)->create(['classroom_id' => $class->id]);
        $dorm = Dormitory::create(['name' => 'Asrama Putri', 'gender' => 'P']);
        DormitoryRoom::create(['dormitory_id' => $dorm->id, 'name' => 'Kamar Aisyah', 'capacity' => 16]);

        $this->getJson('/api/v1/classrooms')->assertOk()->assertJsonPath('data.0.student_count', 2);
        $this->getJson('/api/v1/dormitories')->assertOk()->assertJsonPath('data.0.gender', 'P');
        $this->getJson('/api/v1/dormitory-rooms')->assertOk()->assertJsonPath('data.0.dormitory_name', 'Asrama Putri');
    }

    public function test_guru_cannot_create_students(): void
    {
        $guru = User::create(['username' => 'guru', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);

        $this->postJson('/api/v1/students', ['student_number' => 'X1', 'name' => 'X', 'gender' => 'L'])->assertStatus(403);
    }

    // ------------------------------------------------------------ Sesi

    public function test_session_list_detail_and_lifecycle(): void
    {
        $session = $this->openSession(['status' => SessionStatus::DRAFT, 'opened_at' => null]);

        $this->getJson('/api/v1/attendance/sessions?date=' . today()->toDateString())
            ->assertOk()->assertJsonPath('data.0.activity_name', 'Shalat Subuh')->assertJsonPath('data.0.status', 'draft');

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/open")->assertOk()
            ->assertJsonPath('data.status', 'open')->assertJsonPath('data.opened_by', 'Admin TU');
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/close")->assertOk()->assertJsonPath('data.status', 'closed');

        // Sesi yang sudah ditutup tidak bisa dibuka lagi -> 409 (bukan diam-diam sukses di browser)
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/open")->assertStatus(409);

        $draft = $this->openSession(['status' => SessionStatus::DRAFT]);
        $this->postJson("/api/v1/attendance/sessions/{$draft->id}/cancel", [])->assertStatus(422);
        $this->postJson("/api/v1/attendance/sessions/{$draft->id}/cancel", ['reason' => 'Hujan deras'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_manual_recording_participants_records_and_kpi(): void
    {
        $session = $this->openSession();
        [$a, $b, $c] = Student::factory()->count(3)->create(['is_active' => true]);
        foreach ([$a, $b] as $st) {
            AttendanceSessionParticipant::create(['attendance_session_id' => $session->id, 'student_id' => $st->id]);
        }

        $this->getJson("/api/v1/attendance/sessions/{$session->id}/participants")->assertOk()->assertJsonCount(2, 'data');

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/manual", ['student_id' => $a->id, 'status' => 'sick', 'notes' => 'Demam'])
            ->assertOk()->assertJsonPath('data.success', true)->assertJsonPath('data.record.status', 'sick');

        // Bukan peserta -> hasil gagal yang jelas (HTTP 200, code STUDENT_NOT_PARTICIPANT)
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/manual", ['student_id' => $c->id, 'status' => 'present'])
            ->assertOk()->assertJsonPath('data.success', false)->assertJsonPath('data.code', 'STUDENT_NOT_PARTICIPANT');

        $bulk = $this->postJson("/api/v1/attendance/sessions/{$session->id}/manual-bulk", [
            'student_ids' => [$a->id, $b->id, $c->id], 'status' => 'absent',
        ])->assertOk()->json('data');
        $this->assertSame(['total' => 3, 'success' => 1, 'skipped' => 1, 'failed' => 1], array_intersect_key($bulk, array_flip(['total', 'success', 'skipped', 'failed'])));

        $this->getJson("/api/v1/attendance/sessions/{$session->id}/records")->assertOk()->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/attendance/sessions/{$session->id}")->assertOk()
            ->assertJsonPath('data.total_participants', 2)->assertJsonPath('data.total_sick', 1)->assertJsonPath('data.total_unrecorded', 0);

        $this->getJson('/api/v1/attendance/kpi?date=' . today()->toDateString())->assertOk()
            ->assertJsonPath('data.totalSessionsToday', 1)->assertJsonPath('data.recordedCount', 2)->assertJsonPath('data.completionRate', 100);

        $this->getJson('/api/v1/attendance/monitoring')->assertOk()->assertJsonPath('data.0.recordedCount', 2);
    }

    public function test_correction_creates_history(): void
    {
        $session = $this->openSession();
        $st = Student::factory()->create();
        $this->postJson("/api/v1/attendance/sessions/{$session->id}/manual", ['student_id' => $st->id, 'status' => 'absent'])->assertOk();
        $record = AttendanceRecord::first();

        $this->postJson("/api/v1/attendance/records/{$record->id}/correct", ['new_status' => 'permission'])->assertStatus(422);

        $this->postJson("/api/v1/attendance/records/{$record->id}/correct", ['new_status' => 'permission', 'reason' => 'Surat izin menyusul'])
            ->assertOk()->assertJsonPath('data.success', true)
            ->assertJsonPath('data.updatedRecord.status', 'permission')
            ->assertJsonPath('data.history.old_status', 'absent');

        $this->assertSame(1, AttendanceRecordHistory::count());
        $this->assertSame('permission', $record->fresh()->status->value);
    }

    public function test_qr_scan_returns_react_response_shape(): void
    {
        $session = $this->openSession();
        $st = Student::factory()->create(['qr_token' => 'STU-ABCDEFGH']);

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/qr", ['qr_token' => 'STU-ABCDEFGH'])
            ->assertOk()->assertJsonPath('data.success', true)->assertJsonPath('data.attendance.status', 'present')
            ->assertJsonPath('data.student.name', $st->name);

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/qr", ['qr_token' => 'STU-ABCDEFGH'])
            ->assertOk()->assertJsonPath('data.code', 'ALREADY_RECORDED')->assertJsonPath('data.existingAttendance.method', 'qr');

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/qr", ['qr_token' => 'PALSU'])
            ->assertOk()->assertJsonPath('data.code', 'INVALID_QR');
    }

    public function test_endpoints_require_login(): void
    {
        $this->app['auth']->forgetGuards();
        foreach (['/api/v1/students', '/api/v1/classrooms', '/api/v1/attendance/sessions', '/api/v1/attendance/kpi'] as $url) {
            $this->getJson($url)->assertStatus(401);
        }
    }
}
