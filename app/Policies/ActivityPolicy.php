<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('activities.view') || $user->hasRole('super-admin');
    }

    public function view(User $user, Activity $activity): bool
    {
        return $user->hasPermissionTo('activities.view') || $user->hasRole('super-admin');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('activities.create') || $user->hasRole('super-admin');
    }

    public function update(User $user, Activity $activity): bool
    {
        return $user->hasPermissionTo('activities.update') || $user->hasRole('super-admin');
    }

    public function delete(User $user, Activity $activity): bool
    {
        return $user->hasPermissionTo('activities.delete') || $user->hasRole('super-admin');
    }
}
