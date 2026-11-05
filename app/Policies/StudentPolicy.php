<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('students.view') || $user->hasRole('super-admin');
    }

    public function view(User $user, Student $student): bool
    {
        return $user->hasPermissionTo('students.view') || $user->hasRole('super-admin');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('students.create') || $user->hasRole('super-admin');
    }

    public function update(User $user, Student $student): bool
    {
        return $user->hasPermissionTo('students.update') || $user->hasRole('super-admin');
    }

    public function delete(User $user, Student $student): bool
    {
        return $user->hasPermissionTo('students.delete') || $user->hasRole('super-admin');
    }
}
