<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Announcement;
use App\Models\User;
use App\Services\SubjectAccess;

class AnnouncementPolicy
{
    public function view(User $user, Announcement $announcement): bool
    {
        return SubjectAccess::canAccess(
            $user,
            (int) $announcement->block_id,
            $announcement->subject_id ? (int) $announcement->subject_id : null
        );
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->role === Role::Mayor
            && (int) $user->block_id === (int) $announcement->block_id;
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $this->update($user, $announcement);
    }
}