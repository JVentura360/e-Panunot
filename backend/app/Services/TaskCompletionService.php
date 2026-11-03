<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class TaskCompletionService
{
    /** Resolve outside the transaction so MySQL cannot establish a stale snapshot before waiting on locks. */
    public function candidate(int $taskId): ?object
    {
        return DB::table('tasks')->join('blocks', 'blocks.id', '=', 'tasks.block_id')
            ->where('tasks.id', $taskId)->select('blocks.id', 'blocks.term_id')->first();
    }

    /** Acquire the same term/user/block locks used by enrollment changes. Caller owns the transaction. */
    public function lockContext(User $user, int $taskId, ?object $candidate): ?Task
    {
        if (! $candidate) {
            return null;
        }
        $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
        $freshUser = User::whereKey($user->id)->lockForUpdate()->first();
        $block = DB::table('blocks')->where('id', $candidate->id)->lockForUpdate()->first();
        $task = Task::whereKey($taskId)->lockForUpdate()->first();
        if (! $term?->is_active || ! $freshUser || ! $block || ! $task || (int) $task->block_id !== (int) $block->id
            || ! Gate::forUser($freshUser)->allows('view', $task)) {
            return null;
        }
        return $task;
    }

    /** Caller holds the context locks and transaction; null expected revision is an ordinary online write. */
    public function apply(User $user, Task $task, bool $done, ?int $expectedRevision = null): array
    {
        $assignment = TaskAssignment::where('task_id', $task->id)->where('user_id', $user->id)->lockForUpdate()->first();
        $revision = (int) ($assignment?->completion_revision ?? 0);
        if ($expectedRevision !== null && $revision !== $expectedRevision) {
            return ['status' => 'conflict', 'task_id' => $task->id, 'revision' => $revision,
                'message' => 'This task changed online. The server completion was kept.'];
        }
        if (! $assignment) {
            $assignment = TaskAssignment::create(['task_id' => $task->id, 'user_id' => $user->id]);
        }
        if ((bool) $assignment->completed_at !== $done) {
            $assignment->completed_at = $done ? now() : null;
            $assignment->completion_revision = $revision + 1;
            $assignment->save();
        }
        return ['status' => 'applied', 'task_id' => $task->id, 'revision' => (int) $assignment->completion_revision];
    }

    public function set(User $user, int $taskId, bool $done): Task
    {
        $candidate = $this->candidate($taskId);
        return DB::transaction(function () use ($user, $taskId, $done, $candidate): Task {
            $task = $this->lockContext($user, $taskId, $candidate);
            abort_unless($task, 403, 'This task is no longer available to you.');
            $this->apply($user, $task, $done);
            return $task;
        }, 3);
    }
}
