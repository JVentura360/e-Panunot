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
use Illuminate\Support\Facades\Gate;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $tasks = \App\Services\SubjectAccess::scope(Task::query(), $user, 'tasks')
            ->with([
                'subject',
                'creator',
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
        $tasks = app(\App\Services\SubjectTaskService::class)->create($request->user(), $request->validated());
        if ($request->boolean('all_subjects')) {
            return TaskResource::collection($tasks)->response()->setStatusCode(201);
        }
        return (new TaskResource($tasks->first()))->response()->setStatusCode(201);
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
        Gate::authorize('update', $task);

        DB::transaction(function () use ($request, $task): void {
            $candidate = DB::table('blocks')->where('id', $task->block_id)->first();
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            DB::table('blocks')->where('id', $task->block_id)->lockForUpdate()->first();
            $locked = Task::whereKey($task->id)->lockForUpdate()->firstOrFail();
            $locked->fill($request->validated());
            $subjectChanged = $locked->isDirty('subject_id');
            if ($subjectChanged) {
                abort_unless($term?->is_active, 422, 'This term is no longer active.');
            }
            $locked->save();
            if ($subjectChanged) {
                $locked->assignments()->delete();
                foreach (DB::table('subject_enrollments')->where('block_id', $locked->block_id)
                    ->where('term_id', $term->id)->where('subject_id', $locked->subject_id)->pluck('user_id') as $userId) {
                    TaskAssignment::create(['task_id' => $locked->id, 'user_id' => $userId]);
                }
            }
        }, 3);
        $task->refresh();
        SyncTaskToGoogle::dispatch($task->id);
        return new TaskResource($task->load('subject'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Task $task)
    {
        Gate::authorize('delete', $task);
        $googleEventId = $task->google_event_id;
        $blockId = $task->block_id;

        $task->delete();
        if ($googleEventId && $blockId) {
            DeleteGoogleEvent::dispatch((int) $blockId, $googleEventId);
        }

        return response()->noContent();
    }
}
