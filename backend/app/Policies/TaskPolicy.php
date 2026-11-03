<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Task;
use App\Models\User;
use App\Services\SubjectAccess;

class TaskPolicy
{
    // Read or complete: same rule the task list uses (own block, or an enrolled subject).
    public function view(User $user, Task $task): bool
    {
        return $task->block_id
            && SubjectAccess::canAccess($user, (int) $task->block_id, $task->subject_id ? (int) $task->subject_id : null);
    }

    // Edit or delete: only the mayor of the task's own block.
    public function update(User $user, Task $task): bool
    {
        return $user->role === Role::Mayor
            && $task->block_id !== null
            && (int) $user->block_id === (int) $task->block_id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->update($user, $task);
    }
}