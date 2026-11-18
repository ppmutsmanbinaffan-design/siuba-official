<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\StaffAttendanceRecord;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tahap 19: presensi mengajar guru (KBM) di server.
 */
class TeachingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->travelTo(Carbon::parse('2026-11-16 06:30:00')); // Senin
        $this->admin = User::create(['username' => 'kurikulum19', 'name' => 'Waka Kurikulum', 'email' => 'k19@t.l', 'password' => 'Rahasia123', 'is_active' => true]);
        $this->admin->assignRole('admin');
        Sanctum::actingAs($this->admin);
    }

    /** Jadwal: 2 jam pelajaran Senin untuk satu guru + satu guru lain, lalu generate sesi hari ini. */
    private function setupDay(): array
    {
        $class = Classroom::factory()->create(['name' => 'VII A']);
        Student::factory()->count(3)->create(['classroom_id' => $class->id, 'is_active' => true]);
        $subject = $this->postJson('/api/v1/academic/subjects', ['code' => 'FIQ', 'name' => 'Fiqih', 'category' => 'DINYYAH'])->json('data');
        $jp1 = $this->postJson('/api/v1/academic/lesson-periods', ['name' => 'JP 1', 'start_time' => '07:00', 'end_time' => '07:40'])->json('data');
        $jp2 = $this->postJson('/api/v1/academic/lesson-periods', ['name' => 'JP 2', 'start_time' => '07:40', 'end_time' => '08:20'])->json('data');
        $hamzah = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Hamzah', 'employee_number' => 'NIP-77', 'gender' => 'male'])->json('data');
        $yusuf = $this->postJson('/api/v1/academic/teachers', ['name' => 'Ustadz Yusuf', 'employee_number' => 'NIP-78', 'gender' => 'male'])->json('data');
        $s1 = $this->postJson('/api/v1/academic/schedules', ['day_of_week' => 'monday', 'classroom_id' => $class->id, 'subject_id' => $subject['id'], 'teacher_id' => $hamzah['id'], 'lesson_period_id' => $jp1['id']])->json('data');
        $s2 = $this->postJson('/api/v1/academic/schedules', ['day_of_week' => 'monday', 'classroom_id' => $class->id, 'subject_id' => $subject['id'], 'teacher_id' => $hamzah['id'], 'lesson_period_id' => $jp2['id']])->json('data');
        $this->postJson('/api/v1/academic/generate', ['date' => '2026-11-16'])->assertOk();

        return compact('class', 'hamzah', 'yusuf', 's1', 's2');
    }

    public function test_sessions_list_and_scan_check_in_out_with_late(): void
    {
        $d = $this->setupDay();
        $rows = $this->getJson('/api/v1/teaching/sessions?date=2026-11-16')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $this->assertSame('07:00', $rows[0]['scheduled_start_at']);
        $this->assertSame('Ustadz Hamzah', $rows[0]['scheduled_teacher_name']);
        $this->assertSame('unrecorded', $rows[0]['teacher_attendance_status']);
        $this->assertSame('scheduled', $rows[0]['status']);
        $staff = StaffProfile::where('user_id', $d['hamzah']['id'])->firstOrFail();
        $this->assertSame($staff->id, $rows[0]['scheduled_teacher_staff_id']);

        // 07:20 → JP 1 sedang berlangsung, terlambat 20 menit (toleransi 15)
        $this->travelTo(Carbon::parse('2026-11-16 07:20:00'));
        $res = $this->postJson('/api/v1/teaching/scan', ['identifier' => $staff->staff_number, 'method' => 'qr'])->assertOk()->json('data');
        $this->assertSame('check_in', $res['mode']);
        $this->assertSame('late', $res['status']);
        $this->assertSame(20, $res['late_minutes']);
        $this->assertSame($rows[0]['id'], $res['session']['id']);
        $this->assertSame('open', $res['session']['status']);
        $this->assertSame('qr', $res['session']['teacher_check_in_method']);

        // Scan kedua → selesai mengajar
        $this->travelTo(Carbon::parse('2026-11-16 07:41:00'));
        $this->assertSame('check_out', $this->postJson('/api/v1/teaching/scan', ['staff_id' => $staff->id, 'session_id' => $rows[0]['id']])->json('data.mode'));
        $this->assertSame('completed', $this->getJson('/api/v1/teaching/sessions/' . $rows[0]['id'])->json('data.status'));

        // Tercatat sebagai presensi SDM tipe teaching (masuk laporan SDM)
        $rec = StaffAttendanceRecord::where('attendance_type', 'teaching')->where('context_key', 'teaching:' . $rows[0]['id'])->first();
        $this->assertNotNull($rec);
        $this->assertSame('late', $rec->status);
        $this->assertNotNull($rec->check_out_at);
    }

    public function test_manual_statuses_journal_and_finalize(): void
    {
        $d = $this->setupDay();
        $rows = $this->getJson('/api/v1/teaching/sessions?date=2026-11-16')->json('data');

        $this->travelTo(Carbon::parse('2026-11-16 07:05:00'));
        $r = $this->postJson("/api/v1/teaching/sessions/{$rows[0]['id']}/manual", [])->assertOk()->json('data');
        $this->assertSame('present', $r['status']);
        $this->assertSame('manual', $r['session']['teacher_check_in_method']);

        $this->postJson("/api/v1/teaching/sessions/{$rows[0]['id']}/journal", [])->assertStatus(422);
        $this->postJson("/api/v1/teaching/sessions/{$rows[0]['id']}/journal", ['topic' => 'Bab Thaharah', 'journal_notes' => 'Praktik wudhu', 'student_present_count' => 3])->assertOk();
        $j = $this->getJson('/api/v1/teaching/sessions/' . $rows[0]['id'])->json('data');
        $this->assertSame('Bab Thaharah', $j['topic']);
        $this->assertSame('submitted', $j['realization_status']);
        $this->assertSame(3, $j['student_present_count']);
        $this->assertSame('Waka Kurikulum', $j['journal_submitted_by']);

        // Izin untuk JP 2 lalu finalisasi tidak menambah apa pun
        $this->postJson("/api/v1/teaching/sessions/{$rows[1]['id']}/manual", ['status' => 'permission', 'notes' => 'Rapat dinas'])
            ->assertOk()->assertJsonPath('data.status', 'permission');
        $this->assertSame(0, $this->postJson('/api/v1/teaching/finalize', ['date' => '2026-11-16'])->json('data.absent_created'));

        // Hapus catatan JP 2 → finalisasi menandai alpa
        StaffAttendanceRecord::where('context_key', 'teaching:' . $rows[1]['id'])->delete();
        $this->assertSame(1, $this->postJson('/api/v1/teaching/finalize', ['date' => '2026-11-16'])->json('data.absent_created'));
        $this->assertSame('absent', $this->getJson('/api/v1/teaching/sessions/' . $rows[1]['id'])->json('data.teacher_attendance_status'));
    }

    public function test_substitute_by_staff_id_and_assignment_rules(): void
    {
        $d = $this->setupDay();
        $rows = $this->getJson('/api/v1/teaching/sessions?date=2026-11-16')->json('data');
        $yusufStaff = StaffProfile::where('user_id', $d['yusuf']['id'])->firstOrFail();

        // Ustadz Yusuf tidak dijadwalkan → ditolak
        $this->travelTo(Carbon::parse('2026-11-16 07:00:00'));
        $this->postJson('/api/v1/teaching/scan', ['staff_id' => $yusufStaff->id, 'session_id' => $rows[0]['id']])
            ->assertStatus(422)->assertJsonPath('error.code', 'NOT_ASSIGNED_TO_TEACHING_SESSION');

        // Tetapkan sebagai pengganti memakai id staf
        $this->postJson('/api/v1/teaching/substitutions', ['academic_schedule_id' => $d['s1']['id'], 'substitute_staff_id' => $yusufStaff->id, 'date' => '2026-11-16', 'reason' => 'Ustadz Hamzah sakit'])
            ->assertCreated();
        $row = $this->getJson('/api/v1/teaching/sessions/' . $rows[0]['id'])->json('data');
        $this->assertTrue($row['is_substituted']);
        $this->assertSame('Ustadz Yusuf', $row['actual_teacher_name']);
        $this->assertSame('Ustadz Hamzah sakit', $row['substitution_reason']);

        $subs = $this->getJson('/api/v1/teaching/substitutions')->assertOk()->json('data');
        $this->assertSame($yusufStaff->id, $subs[0]['substitute_teacher_id']);

        // Kini Yusuf boleh presensi, Hamzah (guru asli) tidak lagi untuk JP 1
        $this->postJson('/api/v1/teaching/scan', ['staff_id' => $yusufStaff->id, 'session_id' => $rows[0]['id']])->assertOk()->assertJsonPath('data.status', 'present');
        $hamzahStaff = StaffProfile::where('user_id', $d['hamzah']['id'])->firstOrFail();
        $this->postJson('/api/v1/teaching/scan', ['staff_id' => $hamzahStaff->id, 'session_id' => $rows[0]['id']])->assertStatus(422);
    }

    public function test_teacher_only_sees_and_records_own_sessions(): void
    {
        $d = $this->setupDay();
        $hamzahUser = User::findOrFail($d['hamzah']['id']);
        $yusufUser = User::findOrFail($d['yusuf']['id']);
        // Peran "guru" bawaan boleh memantau semua KBM (piket); akun yang hanya punya akses dasbor guru dibatasi ke sesinya.
        foreach ([$hamzahUser, $yusufUser] as $u) {
            $u->syncRoles([]);
            $u->givePermissionTo('kbm.teacher_dashboard');
        }
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Sanctum::actingAs($yusufUser);
        $this->assertCount(0, $this->getJson('/api/v1/teaching/sessions?date=2026-11-16')->assertOk()->json('data'));

        Sanctum::actingAs($hamzahUser);
        $rows = $this->getJson('/api/v1/teaching/sessions?date=2026-11-16')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $yusufStaff = StaffProfile::where('user_id', $yusufUser->id)->firstOrFail();
        $this->postJson('/api/v1/teaching/scan', ['staff_id' => $yusufStaff->id])->assertStatus(403);
        $this->travelTo(Carbon::parse('2026-11-16 06:50:00'));
        $this->postJson('/api/v1/teaching/scan', ['staff_id' => StaffProfile::where('user_id', $hamzahUser->id)->value('id')])
            ->assertOk()->assertJsonPath('data.session.id', $rows[0]['id']);
        $this->postJson('/api/v1/teaching/finalize', ['date' => '2026-11-16'])->assertForbidden();
    }
}
