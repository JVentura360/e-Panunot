<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Announcement;

class AnnouncementPolicy
{
    public function view(User $user, Announcement $announcement)
    {
        return $user->block_id === $announcement->block_id;
    }

    public function create(User $user)
    {
        return in_array($user->role, ['Mayor', 'Admin']);
    }

    public function delete(User $user, Announcement $announcement)
    {
        return $user->role === 'Admin' || ($user->role === 'Mayor' && $user->id === $announcement->created_by);
    }
}