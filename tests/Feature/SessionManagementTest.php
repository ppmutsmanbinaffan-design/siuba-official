<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Activity;
use App\Models\ActivityCategory;
use App\Models\AttendanceSession;
use App\Models\User;
use App\Services\Attendance\SessionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class SessionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected SessionService $sessionService;
    protected Activity $activity;
    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sessionService = new SessionService();

        $category = ActivityCategory::create([
            'code' => 'IBADAH',
            'name' => 'Ibadah',
        ]);

        $this->activity = Activity::create([
            'activity_category_id' => $category->id,
            'code' => 'SHALAT-SUBUH',
            'name' => 'Shalat Subuh',
            'location' => 'Masjid',
        ]);

        $this->operator = User::create([
            'name' => 'Ustadz Admin',
            'username' => 'admin.sesi',
            'password' => bcrypt('password123'),
        ]);
    }

    /** @test */
    public function test_session_lifecycle_transitions_draft_open_closed()
    {
        $session = $this->sessionService->createSession(
            activity: $this->activity,
            date: Carbon::parse('2026-08-23', 'Asia/Jakarta'),
            customAttributes: [
                'status' => SessionStatus::DRAFT,
                'start_at' => Carbon::parse('2026-08-23 04:15:00', 'Asia/Jakarta'),
                'present_until' => Carbon::parse('2026-08-23 04:30:00', 'Asia/Jakarta'),
                'late_until' => Carbon::parse('2026-08-23 04:45:00', 'Asia/Jakarta'),
                'end_at' => Carbon::parse('2026-08-23 05:00:00', 'Asia/Jakarta'),
            ],
            creator: $this->operator
        );

        $this->assertEquals(SessionStatus::DRAFT, $session->status);

        // Open Session
        $openSession = $this->sessionService->openSession($session, $this->operator);
        $this->assertEquals(SessionStatus::OPEN, $openSession->status);
        $this->assertEquals($this->operator->id, $openSession->opened_by);
        $this->assertNotNull($openSession->opened_at);

        // Close Session
        $closedSession = $this->sessionService->closeSession($openSession, $this->operator);
        $this->assertEquals(SessionStatus::CLOSED, $closedSession->status);
        $this->assertEquals($this->operator->id, $closedSession->closed_by);
        $this->assertNotNull($closedSession->closed_at);
    }

    /** @test */
    public function test_cannot_reopen_closed_session()
    {
        $session = AttendanceSession::create([
            'activity_id' => $this->activity->id,
            'session_code' => 'ATT-20260823-TEST-001',
            'session_date' => '2026-08-23',
            'start_at' => Carbon::parse('2026-08-23 04:15:00'),
            'present_until' => Carbon::parse('2026-08-23 04:30:00'),
            'late_until' => Carbon::parse('2026-08-23 04:45:00'),
            'end_at' => Carbon::parse('2026-08-23 05:00:00'),
            'status' => SessionStatus::CLOSED,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->sessionService->openSession($session, $this->operator);
    }
}
