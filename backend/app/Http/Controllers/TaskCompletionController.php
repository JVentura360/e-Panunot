<?php

namespace App\Http\Controllers;

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\TaskAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskCompletionController extends Controller
{
    // POST /tasks/{task}/complete  -> mark done
    public function store(Request $request, Task $task)
    {
        $assignment = $this->findAssignment($request, $task);

        if (! $assignment->completed_at) {
            $assignment->update(['completed_at' => now()]);
        }

        return $this->respond($request, $task);
    }

    // DELETE /tasks/{task}/complete  -> undo
    public function destroy(Request $request, Task $task)
    {
        $assignment = $this->findAssignment($request, $task);

        $assignment->update(['completed_at' => null]);

        return $this->respond($request, $task);
    }

    private function findAssignment(Request $request, Task $task): TaskAssignment
    {
        $user = $request->user();

        // you can only complete tasks that belong to your own block
        Gate::authorize('view', $task);

        return TaskAssignment::firstOrCreate([
            'task_id' => $task->id,
            'user_id' => $user->id,
        ]);
    }

    private function respond(Request $request, Task $task)
    {
        $task->load([
            'subject',
            'assignments' => fn ($q) => $q->where('user_id', $request->user()->id),
        ]);

        return new TaskResource($task);
    }
}
