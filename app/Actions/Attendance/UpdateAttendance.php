<?php

namespace App\Actions\Attendance;

use App\Enums\AttendanceStatus;
use App\Models\AttendanceRecord;
use App\Models\User;

class UpdateAttendance
{
    public function execute(
        AttendanceRecord $record,
        AttendanceStatus $status,
        ?string $notes = null,
        ?User $operator = null
    ): AttendanceRecord {
        $record->update([
            'status' => $status,
            'notes' => $notes ?? $record->notes,
            'recorded_by' => $operator?->id ?? $record->recorded_by,
        ]);

        return $record->fresh();
    }
}
