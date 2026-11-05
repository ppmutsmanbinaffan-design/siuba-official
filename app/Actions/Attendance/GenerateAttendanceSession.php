<?php

namespace App\Actions\Attendance;

use App\Models\Activity;
use App\Models\ActivitySchedule;
use App\Models\AttendanceSession;
use App\Models\User;
use App\Services\Attendance\SessionService;
use Carbon\Carbon;

class GenerateAttendanceSession
{
    public function __construct(
        protected SessionService $sessionService
    ) {}

    public function execute(
        Activity $activity,
        ?ActivitySchedule $schedule = null,
        ?Carbon $date = null,
        array $attributes = [],
        ?User $creator = null
    ): AttendanceSession {
        return $this->sessionService->createSession(
            activity: $activity,
            schedule: $schedule,
            date: $date,
            customAttributes: $attributes,
            creator: $creator
        );
    }
}
