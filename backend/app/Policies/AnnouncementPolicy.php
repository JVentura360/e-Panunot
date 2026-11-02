<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use App\Models\Announcement;

class AnnouncementPolicy
{
    public function view(User $user, Announcement $announcement): bool
    {
        return $user->block_id === $announcement->block_id;
    }

    public function create(User $user): bool
    {
        return $user->role === Role::Mayor;
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->role === Role::Mayor
            && $user->block_id === $announcement->block_id;
    }
}