<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Task;

class TaskPolicy
{
    public function view(User $user, Task $task)
    {
        return $user->block_id === $task->block_id;
    }

    public function update(User $user, Task $task)
    {
        return $user->role === 'Student' && $user->block_id === $task->block_id;
    }

    public function delete(User $user, Task $task)
    {
        return in_array($user->role, ['Mayor', 'Admin']);
    }
}