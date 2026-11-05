<?php

namespace App\Policies;

use App\Models\AttendanceRecord;
use App\Models\User;

class AttendanceRecordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('attendance.view') || $user->hasRole('super-admin');
    }

    public function view(User $user, AttendanceRecord $record): bool
    {
        return $user->hasPermissionTo('attendance.view') || $user->hasRole('super-admin');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('attendance.create') || $user->hasRole('super-admin');
    }

    public function update(User $user, AttendanceRecord $record): bool
    {
        return $user->hasPermissionTo('attendance.update') || $user->hasRole('super-admin');
    }

    public function delete(User $user, AttendanceRecord $record): bool
    {
        return $user->hasPermissionTo('attendance.delete') || $user->hasRole('super-admin');
    }
}
