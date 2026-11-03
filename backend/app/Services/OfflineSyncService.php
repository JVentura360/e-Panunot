<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\PersonalTodo;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OfflineSyncService
{
    public function __construct(private TaskCompletionService $completion) {}

    public function replay(User $user, array $operation): array
    {
        $validator = Validator::make($operation, [
            'operation_id' => ['required', 'uuid'],
            'kind' => ['required', Rule::in(['complete_task', 'create_personal', 'complete_personal'])],
            'done' => ['required', 'boolean'],
            'task_id' => ['required_if:kind,complete_task', 'integer', 'min:1'],
            'todo_id' => ['required_if:kind,complete_personal', 'integer', 'min:1'],
            'expected_revision' => ['required_unless:kind,create_personal', 'integer', 'min:0'],
            'client_id' => ['required_if:kind,create_personal', 'uuid'],
            'title' => ['required_if:kind,create_personal', 'string', 'max:255'],
            'due_date' => ['required_if:kind,create_personal', 'nullable', 'date_format:Y-m-d'],
        ]);
        if ($validator->fails()) {
            return ['operation_id' => $operation['operation_id'], 'status' => 'rejected', 'message' => $validator->errors()->first()];
        }
        $values = $validator->validated();
        ksort($values);
        $hash = hash('sha256', json_encode($values, JSON_THROW_ON_ERROR));
        $candidate = $values['kind'] === 'complete_task' ? $this->completion->candidate((int) $values['task_id']) : null;

        return DB::transaction(function () use ($user, $values, $hash, $candidate): array {
            $task = $values['kind'] === 'complete_task' ? $this->completion->lockContext($user, (int) $values['task_id'], $candidate) : null;
            $freshUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_unless(in_array($freshUser->role, [Role::Student, Role::Mayor], true), 403);
            $previous = DB::table('offline_operations')->where('user_id', $user->id)->where('operation_id', $values['operation_id'])->lockForUpdate()->first();
            if ($previous) {
                return $previous->payload_hash === $hash ? json_decode($previous->result, true, flags: JSON_THROW_ON_ERROR)
                    : ['operation_id' => $values['operation_id'], 'status' => 'rejected', 'message' => 'This saved operation ID was already used for a different change.'];
            }
            $result = match ($values['kind']) {
                'complete_task' => $task ? $this->completion->apply($user, $task, (bool) $values['done'], (int) $values['expected_revision'])
                    : ['status' => 'rejected', 'message' => 'This task was removed or is no longer available to you.'],
                'create_personal' => $this->createPersonal($user, $values),
                'complete_personal' => $this->completePersonal($user, $values),
            };
            $result = ['operation_id' => $values['operation_id']] + $result;
            DB::table('offline_operations')->insert(['user_id' => $user->id, 'operation_id' => $values['operation_id'],
                'client_id' => $values['kind'] === 'create_personal' ? $values['client_id'] : null,
                'payload_hash' => $hash, 'result' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
            return $result;
        }, 3);
    }

    private function createPersonal(User $user, array $values): array
    {
        $existing = PersonalTodo::where('user_id', $user->id)->where('client_id', $values['client_id'])->lockForUpdate()->first();
        if ($existing) {
            return ['status' => 'applied', 'todo_id' => $existing->id, 'revision' => (int) $existing->revision, 'client_id' => $existing->client_id];
        }
        $priorCreation = DB::table('offline_operations')->where('user_id', $user->id)->where('client_id', $values['client_id'])->exists();
        if ($priorCreation) {
            return ['status' => 'rejected', 'message' => 'This personal task was deleted online and was not restored.'];
        }
        $todo = PersonalTodo::create(['user_id' => $user->id, 'client_id' => $values['client_id'], 'title' => trim($values['title']),
            'due_date' => $values['due_date'] ?? null, 'is_done' => (bool) $values['done']]);
        return ['status' => 'applied', 'todo_id' => $todo->id, 'revision' => 0, 'client_id' => $todo->client_id];
    }

    private function completePersonal(User $user, array $values): array
    {
        $todo = PersonalTodo::where('user_id', $user->id)->whereKey($values['todo_id'])->lockForUpdate()->first();
        if (! $todo) {
            return ['status' => 'rejected', 'message' => 'This personal task was deleted or is no longer available.'];
        }
        if ((int) $todo->revision !== (int) $values['expected_revision']) {
            return ['status' => 'conflict', 'todo_id' => $todo->id, 'revision' => (int) $todo->revision,
                'message' => 'This personal task changed online. The server version was kept.'];
        }
        if ($todo->is_done !== (bool) $values['done']) {
            $todo->is_done = (bool) $values['done'];
            $todo->revision = (int) $todo->revision + 1;
            $todo->save();
        }
        return ['status' => 'applied', 'todo_id' => $todo->id, 'revision' => (int) $todo->revision];
    }
}
