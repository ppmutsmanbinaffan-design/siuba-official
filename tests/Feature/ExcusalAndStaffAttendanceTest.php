<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExcusalAndStaffAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        // Senin pukul 07:00
        $this->travelTo(Carbon::parse('2026-11-16 07:00:00'));
        $this->admin = User::create(['username' => 'admin', 'name' => 'Admin TU', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    // ------------------------------------------------------------ Izin santri

    public function test_excusal_lifecycle_and_listing(): void
    {
        $st = Student::factory()->create(['name' => 'Ahmad']);

        $ex = $this->postJson('/api/v1/student-excusals', [
            'student_id' => $st->id, 'type' => 'sick', 'reason' => 'Demam',
            'start_at' => '2026-11-16T04:00:00', 'end_at' => '2026-11-16T20:00:00',
        ])->assertCreated()->json('data');

        $this->assertSame('approved', $ex['status'], 'Petugas berwenang -> langsung disetujui');
        $this->assertSame('Admin TU', $ex['approved_by']);
        $this->assertSame('Ahmad', $ex['student_name']);

        $this->postJson('/api/v1/student-excusals', [
            'student_id' => $st->id, 'type' => 'permission', 'reason' => 'x',
            'start_at' => '2026-11-16T10:00:00', 'end_at' => '2026-11-16T08:00:00',
        ])->assertStatus(422);

        $this->getJson('/api/v1/student-excusals?status=approved')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson("/api/v1/student-excusals/{$ex['id']}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->postJson("/api/v1/student-excusals/{$ex['id']}/approve")->assertStatus(409);
    }

    public function test_marking_absent_respects_approved_excusal(): void
    {
        $cat = ActivityCategory::create(['code' => 'IB', 'name' => 'Ibadah']);
        $act = Activity::create(['activity_category_id' => $cat->id, 'code' => 'SUBUH', 'name' => 'Subuh', 'allow_manual' => true, 'allow_qr' => true, 'allow_rfid' => true]);
        $session = AttendanceSession::create(['session_code' => 'S1', 'activity_id' => $act->id, 'session_date' => today(),
            'start_at' => today()->setTime(6, 30), 'present_until' => today()->setTime(7, 15), 'late_until' => today()->setTime(7, 45),
            'end_at' => today()->setTime(8, 0), 'status' => SessionStatus::OPEN]);
        [$sick, $healthy] = Student::factory()->count(2)->create();

        $this->postJson('/api/v1/student-excusals', ['student_id' => $sick->id, 'type' => 'sick', 'reason' => 'UKS',
            'start_at' => '2026-11-16T00:00:00', 'end_at' => '2026-11-16T23:59:00'])->assertCreated();

        $this->postJson("/api/v1/attendance/sessions/{$session->id}/manual-bulk", ['student_ids' => [$sick->id, $healthy->id], 'status' => 'absent'])->assertOk();

        $this->assertSame('sick', AttendanceRecord::where('student_id', $sick->id)->first()->status->value);
        $this->assertSame('absent', AttendanceRecord::where('student_id', $healthy->id)->first()->status->value);
    }

    // ------------------------------------------------------------ Presensi SDM

    private function staff(array $attrs = []): StaffProfile
    {
        return StaffProfile::create(array_merge(['staff_number' => 'NIP-' . uniqid(), 'name' => 'Ustadz Ridwan', 'staff_type' => 'teacher'], $attrs));
    }

    public function test_staff_check_in_late_and_check_out_flow(): void
    {
        $staff = $this->staff();
        $this->travelTo(Carbon::parse('2026-11-16 07:20:00'));

        $in = $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])->assertOk()->json('data');
        $this->assertSame('CHECK_IN_SUCCESS', $in['code']);
        $this->assertSame('late', $in['record']['status']);
        $this->assertSame(20, $in['record']['late_minutes']);

        // Tap ganda cepat tidak dianggap pulang
        $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])
            ->assertOk()->assertJsonPath('data.code', 'TOO_SOON_TO_CHECK_OUT');

        $this->travelTo(Carbon::parse('2026-11-16 15:00:00'));
        $out = $this->postJson('/api/v1/staff-attendance/daily/manual', ['staff_id' => $staff->id])->assertOk()->json('data');
        $this->assertSame('CHECK_OUT_SUCCESS', $out['code']);
        $this->assertSame(60, $out['record']['early_leave_minutes']);

        $this->postJson('/api/v1/staff-attendance/daily/scan', ['identifier' => $staff->qr_token, 'method' => 'qr'])
            ->assertOk()->assertJsonPath('data.code', 'ALREADY_CHECKED_OUT');

        $sum = $this->getJson('/api/v1/staff-attendance/daily/summary?date=2026-11-16')->assertOk()->json('data');
        $this->assertSame(1, $sum['total_late']);
        $this->assertSame(1, $sum['total_checked_out']);
        $this->assertSame(1, $sum['total_early_leave']);

        $rec = StaffAttendanceRecord::first();
        $this->postJson("/api/v1/staff-attendance/records/{$rec->id}/correct", ['status' => 'present'])->assertStatus(422);
        $this->postJson("/api/v1/staff-attendance/records/{$rec->id}/correct", ['status' => 'present', 'late_minutes' => 0, 'notes' => 'Ban motor bocor, izin lisan'])
            ->assertOk()->assertJsonPath('data.status', 'present');
    }

    public function test_sunday_and_before_open_are_rejected(): void
    {
        $staff = $this->staff();
        $this->travelTo(Carbon::parse('2026-11-16 05:30:00'));
        $this->postJson('/api/v1/staff-attendance/daily/manual', ['staff_id' => $staff->id])->assertJsonPath('data.code', 'CHECK_IN_NOT_OPEN');

        $this->travelTo(Carbon::parse('2026-11-15 08:00:00')); // Ahad
        $this->postJson('/api/v1/staff-attendance/daily/manual', ['staff_id' => $staff->id])->assertJsonPath('data.code', 'NOT_WORKING_DAY');
    }

    public function test_absence_request_approval_marks_working_days(): void
    {
        $staff = $this->staff();
        $req = $this->postJson('/api/v1/staff-attendance/absences', [
            'staff_id' => $staff->id, 'type' => 'leave', 'reason' => 'Cuti keluarga',
            'start_at' => '2026-11-20T00:00:00', 'end_at' => '2026-11-23T23:59:00', // Jum'at s/d Senin (Ahad libur)
        ])->assertCreated()->json('data');
        $this->assertSame('pending', $req['status']);

        $this->postJson("/api/v1/staff-attendance/absences/{$req['id']}/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertSame(3, StaffAttendanceRecord::where('status', 'leave')->count()); // Jum, Sab, Sen

        $this->postJson("/api/v1/staff-attendance/absences/{$req['id']}/reject", ['rejection_reason' => 'x'])->assertStatus(409);

        // Hari cuti tidak bisa check-in
        $this->travelTo(Carbon::parse('2026-11-20 07:00:00'));
        $this->postJson('/api/v1/staff-attendance/daily/manual', ['staff_id' => $staff->id]);
        $this->assertNull(StaffAttendanceRecord::whereDate('attendance_date', '2026-11-20')->first()->check_in_at);
    }

    public function test_staff_rfid_tap_on_esp32_does_check_in(): void
    {
        config(['services.nexabsen.key' => 'k', 'services.nexabsen.auto_register_device' => false]);
        AttendanceDevice::create(['device_code' => 'KANTOR-01', 'device_name' => 'Kantor', 'device_type' => 'rfid_reader', 'is_active' => true]);
        $staff = $this->staff(['rfid_uid' => 'BEEF0001']);

        $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'be:ef:00:01', 'device_id' => 'KANTOR-01'], ['X-GLOBAL-KEY' => 'k'])
            ->assertOk()->assertJsonPath('code', 'CHECK_IN_SUCCESS')->assertJsonPath('message', 'Masuk Sukses')->assertJsonPath('person_type', 'staff');

        $this->assertSame('rfid', StaffAttendanceRecord::first()->check_in_method);
        $this->assertSame(0, AttendanceRecord::count());
    }

    public function test_guru_cannot_approve_staff_absence(): void
    {
        $staff = $this->staff();
        $req = $this->postJson('/api/v1/staff-attendance/absences', ['staff_id' => $staff->id, 'type' => 'sick', 'reason' => 'x',
            'start_at' => '2026-11-16T00:00:00', 'end_at' => '2026-11-16T23:00:00'])->json('data');

        $guru = User::create(['username' => 'g', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);
        $this->postJson("/api/v1/staff-attendance/absences/{$req['id']}/approve")->assertStatus(403);
    }
}
