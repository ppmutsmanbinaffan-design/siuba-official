<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceDevice;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AttendanceSessionParticipant;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tap RFID dari perangkat harus mengikuti aturan absensi yang sama dengan QR & manual,
 * dan hanya perangkat yang sudah diaktifkan yang boleh mengirim tap.
 */
class IotTapConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private const KEY = 'iot-test-key';
    private array $headers = ['X-GLOBAL-KEY' => self::KEY];
    private ActivityCategory $category;
    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.nexabsen.key' => self::KEY,
            'services.nexabsen.master_admin_uid' => null,
            'services.nexabsen.auto_register_device' => false,
            'services.nexabsen.auto_daily_session' => true,
        ]);

        // Jam tetap: hari ini pukul 07:00
        $this->travelTo(Carbon::today()->setTime(7, 0));

        $this->category = ActivityCategory::create(['code' => 'IBADAH', 'name' => 'Ibadah']);
        $this->student = Student::factory()->create(['rfid_uid' => 'A1B2C3D4', 'is_active' => true]);
        AttendanceDevice::create([
            'device_code' => 'MSJ-01', 'device_name' => 'Masjid', 'device_type' => 'rfid_reader', 'is_active' => true,
        ]);
    }

    private function makeSession(string $code, array $overrides = [], array $activityOverrides = []): AttendanceSession
    {
        $activity = Activity::create(array_merge([
            'activity_category_id' => $this->category->id,
            'code' => 'ACT-' . $code,
            'name' => 'Kegiatan ' . $code,
            'allow_rfid' => true, 'allow_qr' => true, 'allow_manual' => true,
        ], $activityOverrides));

        return AttendanceSession::create(array_merge([
            'session_code' => $code,
            'activity_id' => $activity->id,
            'session_date' => today(),
            'start_at' => today()->setTime(6, 30),
            'present_until' => today()->setTime(7, 15),
            'late_until' => today()->setTime(7, 45),
            'end_at' => today()->setTime(8, 0),
            'status' => SessionStatus::OPEN,
            'opened_at' => now(),
        ], $overrides));
    }

    private function tap(string $device = 'MSJ-01', array $extra = [])
    {
        return $this->postJson('/api/v1/iot/rfid-tap', array_merge(['uid' => 'a1:b2:c3:d4', 'device_id' => $device], $extra), $this->headers);
    }

    // ------------------------------------------------------------ whitelist perangkat

    public function test_unknown_device_is_registered_as_pending_and_rejected(): void
    {
        $this->makeSession('S1');

        $this->tap('ALAT-BARU')->assertStatus(403)->assertJsonPath('code', 'DEVICE_NOT_ACTIVE');

        $device = AttendanceDevice::where('device_code', 'ALAT-BARU')->first();
        $this->assertNotNull($device, 'Alat baru harus tercatat agar admin bisa mengaktifkannya');
        $this->assertFalse($device->is_active);
        $this->assertSame(0, AttendanceRecord::count());

        // Setelah diaktifkan admin -> tap diterima
        $this->artisan('siuba:device-activate', ['code' => 'ALAT-BARU'])->assertSuccessful();
        $this->tap('ALAT-BARU')->assertOk()->assertJsonPath('code', 'SUCCESS');
    }

    public function test_deactivated_device_is_rejected_including_ping(): void
    {
        AttendanceDevice::where('device_code', 'MSJ-01')->update(['is_active' => false]);
        $this->makeSession('S1');

        $this->tap()->assertStatus(403);
        $this->postJson('/api/v1/iot/ping', ['device_code' => 'MSJ-01'], $this->headers)->assertStatus(403);
    }

    public function test_auto_register_option_keeps_old_behaviour(): void
    {
        config(['services.nexabsen.auto_register_device' => true]);
        $this->makeSession('S1');

        $this->tap('ALAT-LAIN')->assertOk()->assertJsonPath('code', 'SUCCESS');
    }

    // ------------------------------------------------------------ konsistensi aturan absensi

    public function test_non_participant_is_rejected_like_qr_and_manual(): void
    {
        $s = $this->makeSession('S1');
        $other = Student::factory()->create();
        AttendanceSessionParticipant::create(['attendance_session_id' => $s->id, 'student_id' => $other->id]);

        $this->tap()->assertStatus(403)->assertJsonPath('code', 'STUDENT_NOT_PARTICIPANT');
        $this->assertSame(0, AttendanceRecord::count());
    }

    public function test_tap_after_session_end_is_rejected(): void
    {
        $this->makeSession('S1', ['end_at' => today()->setTime(6, 50)]);

        $this->tap()->assertStatus(409)->assertJsonPath('code', 'OUTSIDE_ATTENDANCE_TIME');
        $this->assertSame(0, AttendanceRecord::count());
    }

    public function test_activity_without_rfid_rejects_tap(): void
    {
        $this->makeSession('S1', [], ['allow_rfid' => false]);

        $this->tap()->assertStatus(409)->assertJsonPath('code', 'INVALID_METHOD');
    }

    public function test_picks_the_open_session_where_student_is_participant(): void
    {
        $other = Student::factory()->create();
        $sA = $this->makeSession('KELAS-A', ['start_at' => today()->setTime(6, 45)]);
        AttendanceSessionParticipant::create(['attendance_session_id' => $sA->id, 'student_id' => $other->id]);
        $sB = $this->makeSession('KELAS-B', ['start_at' => today()->setTime(6, 30)]);
        AttendanceSessionParticipant::create(['attendance_session_id' => $sB->id, 'student_id' => $this->student->id]);

        $this->tap()->assertOk()->assertJsonPath('session.code', 'KELAS-B');
        $this->assertSame($sB->id, AttendanceRecord::first()->attendance_session_id);
    }

    public function test_closed_sessions_are_never_used_and_no_session_is_auto_created(): void
    {
        $this->makeSession('S1', ['status' => SessionStatus::CLOSED]);

        $this->tap()->assertStatus(409)->assertJsonPath('code', 'NO_ACTIVE_SESSION');
        $this->assertSame(1, AttendanceSession::count());
    }

    public function test_daily_session_auto_created_only_when_no_session_today(): void
    {
        $this->tap()->assertOk()->assertJsonPath('code', 'SUCCESS');
        $this->assertSame(1, AttendanceSession::where('session_code', 'like', '%-HARIAN')->count());

        // Bisa dimatikan
        AttendanceRecord::query()->delete();
        AttendanceSession::query()->delete();
        config(['services.nexabsen.auto_daily_session' => false]);
        $this->tap()->assertStatus(409)->assertJsonPath('code', 'NO_ACTIVE_SESSION');
    }

    public function test_late_status_and_double_tap(): void
    {
        $this->makeSession('S1');
        $this->travelTo(today()->setTime(7, 30));

        $this->tap()->assertOk()->assertJsonPath('status', 'late')->assertJsonPath('message', 'Absen (TELAT)');
        $this->tap()->assertOk()->assertJsonPath('code', 'ALREADY_RECORDED')->assertJsonPath('message', 'Sudah Absen');
        $this->assertSame(1, AttendanceRecord::count());
        $this->assertSame('rfid', AttendanceRecord::first()->method->value);
    }

    public function test_offline_queued_tap_uses_device_time_when_reasonable(): void
    {
        $this->makeSession('S1');
        $this->travelTo(today()->setTime(7, 50));

        // ESP32 baru online jam 07:50, tapi santri tap pukul 07:05 (masih tepat waktu)
        $this->tap('MSJ-01', ['tapped_at' => today()->setTime(7, 5)->toDateTimeString()])
            ->assertOk()->assertJsonPath('status', 'present');
    }

    // ------------------------------------------------------------ API kelola perangkat

    public function test_device_management_api_requires_permission(): void
    {
        $device = AttendanceDevice::first();
        $this->getJson('/api/v1/devices')->assertStatus(401);

        $this->seed(RolePermissionSeeder::class);
        $guru = User::create(['username' => 'g', 'name' => 'G', 'email' => 'g@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $guru->assignRole('guru');
        Sanctum::actingAs($guru);
        $this->patchJson("/api/v1/devices/{$device->id}", ['is_active' => false])->assertStatus(403);

        $admin = User::create(['username' => 'a', 'name' => 'A', 'email' => 'a@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/devices')->assertOk()->assertJsonPath('devices.0.device_code', 'MSJ-01');
        $this->patchJson("/api/v1/devices/{$device->id}", ['is_active' => false, 'location' => 'Gerbang'])->assertOk();
        $this->assertFalse($device->fresh()->is_active);
    }
}
