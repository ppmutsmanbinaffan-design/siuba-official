<?php

namespace Tests\Feature;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AppSetting;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Models\User;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\SessionService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Tahap 21: Aturan Absensi di Pengaturan Sistem benar-benar berlaku
 * (auto-close, debounce RFID, izin mandiri, toleransi terlambat global).
 */
class AttendanceRulesTest extends TestCase
{
    use RefreshDatabase;

    private ActivityCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::today()->setTime(9, 0));
        $this->category = ActivityCategory::create(['code' => 'IBADAH', 'name' => 'Ibadah']);
    }

    private function rules(array $values): void
    {
        AppSetting::put('attendance', array_merge(AppSetting::get('attendance'), $values));
    }

    private function activity(array $overrides = []): Activity
    {
        static $n = 0;
        $n++;

        return Activity::create(array_merge([
            'activity_category_id' => $this->category->id,
            'code' => 'ACT-' . $n,
            'name' => 'Kegiatan ' . $n,
            'allow_rfid' => true, 'allow_qr' => true, 'allow_manual' => true,
        ], $overrides));
    }

    private function openSession(string $code, Carbon $endAt, array $overrides = []): AttendanceSession
    {
        return AttendanceSession::create(array_merge([
            'session_code' => $code,
            'activity_id' => $this->activity()->id,
            'session_date' => today(),
            'start_at' => $endAt->copy()->subHour(),
            'present_until' => $endAt->copy()->subMinutes(45),
            'late_until' => $endAt->copy()->subMinutes(30),
            'end_at' => $endAt,
            'status' => SessionStatus::OPEN,
            'opened_at' => $endAt->copy()->subHour(),
        ], $overrides));
    }

    // ------------------------------------------------------------ auto-close

    public function test_auto_close_closes_expired_sessions_and_marks_absent(): void
    {
        $this->rules(['auto_close_session_minutes' => 30]);
        $expired = $this->openSession('LAMA', now()->subMinutes(45));     // selesai 45 menit lalu → ditutup
        $recent = $this->openSession('BARU', now()->subMinutes(10));      // baru 10 menit → tetap dibuka
        $draft = $this->openSession('DRAF', now()->subHours(2), ['status' => SessionStatus::DRAFT]);

        [$hadir, $alpa, $izin] = Student::factory()->count(3)->create(['is_active' => true]);
        foreach ([$hadir, $alpa, $izin] as $s) {
            AttendanceSessionParticipant::create(['attendance_session_id' => $expired->id, 'student_id' => $s->id]);
        }
        AttendanceRecord::create([
            'attendance_session_id' => $expired->id, 'student_id' => $hadir->id,
            'status' => AttendanceStatus::PRESENT, 'method' => 'manual', 'check_in_at' => now()->subHour(),
        ]);
        \App\Models\StudentExcusal::create([
            'student_id' => $izin->id, 'type' => 'sick', 'status' => 'approved',
            'start_at' => today(), 'end_at' => today()->endOfDay(), 'reason' => 'Demam',
        ]);

        $this->artisan('attendance:auto-close')->assertExitCode(0);

        $this->assertSame(SessionStatus::CLOSED, $expired->fresh()->status);
        $this->assertNull($expired->fresh()->closed_by);
        $this->assertSame(SessionStatus::OPEN, $recent->fresh()->status);
        $this->assertSame(SessionStatus::DRAFT, $draft->fresh()->status);

        $byStudent = AttendanceRecord::where('attendance_session_id', $expired->id)->get()->keyBy('student_id');
        $this->assertSame(AttendanceStatus::PRESENT, $byStudent[$hadir->id]->status);
        $this->assertSame(AttendanceStatus::ABSENT, $byStudent[$alpa->id]->status);
        $this->assertSame(AttendanceStatus::SICK, $byStudent[$izin->id]->status);

        $this->assertDatabaseHas('audit_logs', ['event' => 'attendance.session.auto_closed']);
    }

    public function test_auto_close_disabled_when_zero(): void
    {
        $this->rules(['auto_close_session_minutes' => 0]);
        $s = $this->openSession('LAMA', now()->subHours(3));

        $this->artisan('attendance:auto-close')->assertExitCode(0);

        $this->assertSame(SessionStatus::OPEN, $s->fresh()->status);
    }

    public function test_auto_close_is_scheduled(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('attendance:auto-close');
    }

    // ------------------------------------------------------------ debounce RFID

    public function test_rfid_debounce_ignores_repeat_tap(): void
    {
        config(['services.nexabsen.key' => 'k', 'services.nexabsen.master_admin_uid' => null, 'services.nexabsen.auto_register_device' => false]);
        AttendanceDevice::create(['device_code' => 'GRB-01', 'device_name' => 'Gerbang', 'device_type' => 'rfid_reader', 'is_active' => true]);
        $student = Student::factory()->create(['rfid_uid' => 'AABBCCDD', 'is_active' => true]);
        $session = $this->openSession('SUBUH', now()->addHour(), ['start_at' => now()->subMinutes(5), 'present_until' => now()->addMinutes(10), 'late_until' => now()->addMinutes(30)]);
        AttendanceSessionParticipant::create(['attendance_session_id' => $session->id, 'student_id' => $student->id]);
        $this->rules(['rfid_debounce_seconds' => 5]);

        $tap = fn () => $this->postJson('/api/v1/iot/rfid-tap', ['uid' => 'aa:bb:cc:dd', 'device_id' => 'GRB-01'], ['X-GLOBAL-KEY' => 'k']);

        $tap()->assertOk()->assertJsonMissing(['code' => 'DUPLICATE_TAP']);
        $tap()->assertOk()->assertJsonPath('code', 'DUPLICATE_TAP');

        $this->travel(6)->seconds();
        $this->assertNotSame('DUPLICATE_TAP', $tap()->json('code'));
        $this->assertSame(1, AttendanceRecord::where('student_id', $student->id)->count());
    }

    // ------------------------------------------------------------ izin mandiri

    public function test_self_excusal_toggle(): void
    {
        $student = Student::factory()->create(['is_active' => true]);
        Permission::findOrCreate('attendance.manual', 'web');
        $guru = User::create(['username' => 'guru1', 'name' => 'Guru', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->givePermissionTo('attendance.manual');
        Sanctum::actingAs($guru);

        $payload = ['student_id' => $student->id, 'type' => 'permission', 'start_at' => now()->addDay()->toDateTimeString(),
            'end_at' => now()->addDays(2)->toDateTimeString(), 'reason' => 'Acara keluarga'];

        $this->rules(['allow_self_excusal' => true]);
        $this->postJson('/api/v1/student-excusals', $payload)->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->rules(['allow_self_excusal' => false]);
        $this->postJson('/api/v1/student-excusals', $payload)->assertStatus(403)->assertJsonPath('error.code', 'SELF_EXCUSAL_DISABLED');

        // Petugas perizinan tetap bisa
        $admin = User::create(['username' => 'admin1', 'name' => 'Admin', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/student-excusals', $payload)->assertCreated()->assertJsonPath('data.status', 'approved');
    }

    // ------------------------------------------------------------ toleransi terlambat

    public function test_global_tolerance_used_when_session_has_no_present_limit(): void
    {
        $this->rules(['late_tolerance_minutes' => 20]);
        $activity = $this->activity(['late_tolerance_minutes' => null]);
        $session = app(SessionService::class)->createSession($activity, null, today(), [
            'start_at' => today()->setTime(9, 0), 'end_at' => today()->setTime(10, 0),
        ]);

        $this->assertEquals(today()->setTime(9, 20), $session->present_until);
        $this->assertEquals(today()->setTime(10, 0), $session->late_until);

        $svc = app(AttendanceService::class);
        $this->assertSame(AttendanceStatus::PRESENT, $svc->determineStatus($session, today()->setTime(9, 19)));
        $this->assertSame(AttendanceStatus::LATE, $svc->determineStatus($session, today()->setTime(9, 25)));
    }

    public function test_activity_tolerance_overrides_global(): void
    {
        $this->rules(['late_tolerance_minutes' => 20]);
        $activity = $this->activity(['late_tolerance_minutes' => 5]);
        $session = app(SessionService::class)->createSession($activity, null, today(), [
            'start_at' => today()->setTime(9, 0), 'end_at' => today()->setTime(10, 0),
        ]);

        $this->assertEquals(today()->setTime(9, 5), $session->present_until);
    }
}
