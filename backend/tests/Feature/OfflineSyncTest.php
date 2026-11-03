<?php

namespace Tests\Feature;

use App\Models\{Block, PersonalTodo, Task, TaskAssignment, Term, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;
use Illuminate\Testing\TestResponse;

class OfflineSyncTest extends TestCase
{
    use RefreshDatabase;

    private function replay(User $user, array $operations): TestResponse
    {
        Queue::fake();
        return $this->actingAs($user)->postJson('/api/offline-sync', ['account_id' => $user->id, 'operations' => $operations]);
    }

    private function createOperation(array $values = []): array
    {
        return $values + ['operation_id' => (string) Str::uuid(), 'kind' => 'create_personal', 'client_id' => (string) Str::uuid(), 'title' => 'Offline work', 'due_date' => '2020-01-02', 'done' => false];
    }

    public function test_personal_creation_preserves_overdue_dates_and_is_idempotent(): void
    {
        $user = User::factory()->create();
        $operation = $this->createOperation();
        $first = $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'applied')->json('data.results.0');
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0', $first);
        $operation['operation_id'] = (string) Str::uuid();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.todo_id', $first['todo_id']);
        $this->assertDatabaseCount('personal_todos', 1);
        $this->assertDatabaseHas('personal_todos', ['due_date' => '2020-01-02', 'client_id' => $operation['client_id']]);
        $this->getJson('/api/personal-todos')->assertJsonPath('data.0.revision', 0)->assertJsonPath('data.0.client_id', $operation['client_id']);
    }

    public function test_online_changes_win_and_invalid_operations_do_not_discard_valid_ones(): void
    {
        $user = User::factory()->create();
        $todo = PersonalTodo::create(['user_id' => $user->id, 'title' => 'Original']);
        $this->actingAs($user)->patchJson('/api/personal-todos/'.$todo->id, ['title' => 'Server'])->assertOk()->assertJsonPath('data.revision', 1);
        $complete = ['operation_id' => (string) Str::uuid(), 'kind' => 'complete_personal', 'todo_id' => $todo->id, 'done' => true, 'expected_revision' => 0];
        $this->replay($user, [$complete, $this->createOperation(['title' => '']), $this->createOperation()])->assertOk()
            ->assertJsonPath('data.results.0.status', 'conflict')->assertJsonPath('data.results.1.status', 'rejected')->assertJsonPath('data.results.2.status', 'applied');
        $this->assertFalse($todo->fresh()->is_done);
    }

    public function test_account_mismatch_and_private_ownership_have_no_effects(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $todo = PersonalTodo::create(['user_id' => $other->id, 'title' => 'Private']);
        $this->actingAs($user)->postJson('/api/offline-sync', ['account_id' => $other->id, 'operations' => [$this->createOperation()]])->assertForbidden();
        $this->replay($user, [['operation_id' => (string) Str::uuid(), 'kind' => 'complete_personal', 'todo_id' => $todo->id, 'done' => true, 'expected_revision' => 0]])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');
        $this->assertDatabaseCount('personal_todos', 1);
        $this->assertFalse($todo->fresh()->is_done);
    }

    public function test_class_completion_revisions_retries_conflicts_and_removed_access(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $user = User::factory()->student($block)->create();
        $task = Task::factory()->forBlock($block, $user)->create();
        $operation = ['operation_id' => (string) Str::uuid(), 'kind' => 'complete_task', 'task_id' => $task->id, 'done' => true, 'expected_revision' => 0];
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.revision', 1);
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'applied');
        $this->deleteJson('/api/tasks/'.$task->id.'/complete')->assertOk()->assertJsonPath('data.completion_revision', 2);
        $operation['operation_id'] = (string) Str::uuid();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'conflict');
        $user->update(['block_id' => null]);
        $operation['operation_id'] = (string) Str::uuid();
        $operation['expected_revision'] = 2;
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');
        $this->assertNull(TaskAssignment::first()->completed_at);
        $task->delete();
        $operation['operation_id'] = (string) Str::uuid();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');
    }

    public function test_deleted_personal_creates_are_not_resurrected_and_operation_ids_are_immutable(): void
    {
        $user = User::factory()->create();
        $operation = $this->createOperation();
        $result = $this->replay($user, [$operation])->assertOk()->json('data.results.0');
        $changed = $operation;
        $changed['title'] = 'Different payload';
        $this->replay($user, [$changed])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');
        $this->actingAs($user)->deleteJson('/api/personal-todos/'.$result['todo_id'])->assertNoContent();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'applied');
        $operation['operation_id'] = (string) Str::uuid();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'rejected');
        $this->assertDatabaseCount('personal_todos', 0);
    }

    public function test_completion_and_personal_revisions_only_change_for_real_writes(): void
    {
        $user = User::factory()->create();
        $todo = PersonalTodo::create(['user_id' => $user->id, 'title' => 'Work', 'is_done' => false]);
        $operation = ['operation_id' => (string) Str::uuid(), 'kind' => 'complete_personal', 'todo_id' => $todo->id, 'done' => true, 'expected_revision' => 0];
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.revision', 1);
        $this->actingAs($user)->patchJson('/api/personal-todos/'.$todo->id, ['is_done' => true])->assertOk()->assertJsonPath('data.revision', 1);
        $this->patchJson('/api/personal-todos/'.$todo->id, ['is_done' => false])->assertOk()->assertJsonPath('data.revision', 2);
        $operation['operation_id'] = (string) Str::uuid();
        $this->replay($user, [$operation])->assertOk()->assertJsonPath('data.results.0.status', 'conflict');
        $this->assertFalse($todo->fresh()->is_done);
    }

    public function test_offline_replay_updates_other_devices_task_and_personal_sync_domains(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $before = $this->getJson('/api/sync')->assertOk()->json('data');
        $this->replay($user, [$this->createOperation()])->assertOk();
        $after = $this->getJson('/api/sync')->assertOk()->json('data');
        $this->assertNotSame($before['tasks'], $after['tasks']);
        $this->assertNotSame($before['personal'], $after['personal']);
        $this->assertNotSame($before['calendar'], $after['calendar']);
        $this->assertSame($before['concerns'], $after['concerns']);
    }

    public function test_replay_requires_authentication_and_a_student_or_mayor_account(): void
    {
        $this->postJson('/api/offline-sync', ['account_id' => 1, 'operations' => [$this->createOperation()]])->assertUnauthorized();
        $admin = User::factory()->admin()->create();
        $this->replay($admin, [$this->createOperation()])->assertForbidden();
        $mayor = User::factory()->create(['role' => 'mayor']);
        $this->replay($mayor, [$this->createOperation()])->assertOk()->assertJsonPath('data.results.0.status', 'applied');
    }
}
