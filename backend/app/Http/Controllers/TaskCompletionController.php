<?php

namespace App\Http\Controllers;

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Services\TaskCompletionService;
use Illuminate\Http\Request;

class TaskCompletionController extends Controller
{
    // POST /tasks/{task}/complete  -> mark done
    public function store(Request $request, Task $task): TaskResource
    {
        $task = app(TaskCompletionService::class)->set($request->user(), $task->id, true);
        return $this->respond($request, $task);
    }

    // DELETE /tasks/{task}/complete  -> undo
    public function destroy(Request $request, Task $task): TaskResource
    {
        $task = app(TaskCompletionService::class)->set($request->user(), $task->id, false);
        return $this->respond($request, $task);
    }

    private function respond(Request $request, Task $task): TaskResource
    {
        $task->load([
            'subject',
            'assignments' => fn ($q) => $q->where('user_id', $request->user()->id),
        ]);

        return new TaskResource($task);
    }
}
