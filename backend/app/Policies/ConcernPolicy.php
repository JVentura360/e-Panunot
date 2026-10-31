<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use App\Models\Concern;

class ConcernPolicy
{
    public function view(User $user, Concern $concern): bool
    {
        return $concern->student_id === $user->id
            || $this->isBlockMayor($user, $concern)
            || $user->role === Role::Admin;
    }

    public function manage(User $user, Concern $concern): bool
    {
        return $this->isBlockMayor($user, $concern)
            || $user->role === Role::Admin;
    }

    private function isBlockMayor(User $user, Concern $concern): bool
    {
        return $user->role === Role::Mayor
            && $user->block_id === $concern->block_id;
    }
}