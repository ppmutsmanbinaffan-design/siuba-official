<?php

namespace App\Policies;

use App\Models\AttendanceSession;
use App\Models\User;

class AttendanceSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('attendance.sessions.view') || $user->hasRole('super-admin');
    }

    public function view(User $user, AttendanceSession $session): bool
    {
        return $user->hasPermissionTo('attendance.sessions.view') || $user->hasRole('super-admin');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('attendance.sessions.create') || $user->hasRole('super-admin');
    }

    public function open(User $user, AttendanceSession $session): bool
    {
        return $user->hasPermissionTo('attendance.sessions.open') || $user->hasRole('super-admin');
    }

    public function close(User $user, AttendanceSession $session): bool
    {
        return $user->hasPermissionTo('attendance.sessions.close') || $user->hasRole('super-admin');
    }

    public function cancel(User $user, AttendanceSession $session): bool
    {
        return $user->hasPermissionTo('attendance.sessions.close') || $user->hasRole('super-admin');
    }
}
