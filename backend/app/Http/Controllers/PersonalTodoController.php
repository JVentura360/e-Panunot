<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePersonalTodoRequest;
use App\Http\Requests\UpdatePersonalTodoRequest;
use App\Http\Resources\PersonalTodoResource;
use App\Models\PersonalTodo;
use Illuminate\Http\Request;

/**
 * A student's private to-do checklist. Every query is limited to the signed-in
 * user, so nobody can see or touch someone else's to-dos.
 */
class PersonalTodoController extends Controller
{
    /**
     * GET /api/personal-todos            (optional: ?done=0 or ?done=1)
     */
    public function index(Request $request)
    {
        $request->validate(['done' => ['nullable', 'boolean']]);

        $todos = PersonalTodo::where('user_id', $request->user()->id)
            ->when($request->has('done'), fn ($q) => $q->where('is_done', $request->boolean('done')))
            ->orderBy('is_done')      // unfinished first
            ->orderByDesc('id')       // newest first
            ->get();

        return PersonalTodoResource::collection($todos);
    }

    /**
     * POST /api/personal-todos
     */
    public function store(StorePersonalTodoRequest $request)
    {
        $todo = PersonalTodo::create([
            'user_id' => $request->user()->id,
            'title' => $request->validated('title'),
            'is_done' => false,
        ]);

        // GOOGLE TASKS HOOK (optional, later): if the student connected Google Tasks,
        // dispatch a job here to create the matching Google task.

        return (new PersonalTodoResource($todo))->response()->setStatusCode(201);
    }

    /**
     * PUT/PATCH /api/personal-todos/{personalTodo}
     */
    public function update(UpdatePersonalTodoRequest $request, PersonalTodo $personalTodo)
    {
        $this->ownOrFail($request, $personalTodo);

        $personalTodo->update($request->validated());

        return new PersonalTodoResource($personalTodo);
    }

    /**
     * DELETE /api/personal-todos/{personalTodo}
     */
    public function destroy(Request $request, PersonalTodo $personalTodo)
    {
        $this->ownOrFail($request, $personalTodo);

        $personalTodo->delete();

        return response()->noContent();
    }

    /**
     * Someone else's to-do looks like it doesn't exist (404), so ids can't be probed.
     */
    private function ownOrFail(Request $request, PersonalTodo $todo): void
    {
        abort_unless((int) $todo->user_id === (int) $request->user()->id, 404);
    }
}
