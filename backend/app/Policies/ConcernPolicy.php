<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Concern;

class ConcernPolicy
{
    public function view(User $user, Concern $concern)
    {
        return $user->id === $concern->student_id || $user->role === 'Mayor' || $user->role === 'Admin';
    }

    public function update(User $user, Concern $concern)
    {
        return in_array($user->role, ['Mayor', 'Admin']);
    }

    public function delete(User $user, Concern $concern)
    {
        return $user->id === $concern->student_id || $user->role === 'Admin';
    }
}