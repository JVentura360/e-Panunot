<?php

namespace App\Http\Controllers;

use App\Jobs\SyncTaskToGoogle;
use App\Jobs\DeleteGoogleEvent;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->block_id, 403, 'You are not in a block yet.');

        $tasks = Task::where('block_id', $user->block_id)
            ->with([
                'subject',
                'assignments' => fn ($q) => $q->where('user_id', $user->id),
            ])
            ->orderBy('due_date')
            ->get();

        return TaskResource::collection($tasks);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTaskRequest $request)
    {
        $user = $request->user();
        abort_unless($user->block_id, 403, 'You are not in a block yet.');

        $task = DB::transaction(function () use ($request, $user) {
            $task = Task::create([
                ...$request->validated(),
                'block_id' => $user->block_id,
                'created_by' => $user->id,
            ]);

            // one "to-do" row per member of the block
            $rows = User::where('block_id', $user->block_id)
                ->pluck('id')
                ->map(fn ($id) => [
                    'task_id' => $task->id,
                    'user_id' => $id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all();

            TaskAssignment::insert($rows);

            return $task;
        });
        SyncTaskToGoogle::dispatch($task->id);
        return new TaskResource($task->load('subject'));
    }

    /**
     * Display the specified resource.
     */
    // public function show(string $id)
    // {
    //     //
    // }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateTaskRequest $request, Task $task)
    {
        $this->ensureOwnBlock($request, $task);

        $task->update($request->validated());
        SyncTaskToGoogle::dispatch($task->id);
        return new TaskResource($task->load('subject'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task)
    {
        $this->ensureOwnBlock($request, $task);
        $task->google_event_id
        $task->block_id
        $task->delete();

        return response()->noContent();
    }

    /**
     * Block a mayor from touching another block's tasks.
     */
    private function ensureOwnBlock(Request $request, Task $task): void
    {
        abort_unless($task->block_id === $request->user()->block_id, 403);
    }
}
