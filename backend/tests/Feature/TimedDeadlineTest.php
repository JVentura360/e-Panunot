<?php

namespace Tests\Feature;

use App\Models\PersonalTodo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class TimedDeadlineTest extends TestCase
{
    use RefreshDatabase;

    public function test_personal_deadline_preserves_exact_time_and_reminders_stop_at_completion(): void
    {
        $this->travelTo(Carbon::parse('2026-11-15T02:00:00Z'));
        $user = User::factory()->create();
        $id = $this->actingAs($user)->postJson('/api/personal-todos', ['title' => 'Timed work',
            'due_date' => '2026-11-15', 'due_at' => '2026-11-15T10:30:00+08:00'])
            ->assertCreated()->json('data.id');
        $this->assertSame('2026-11-15T02:30:00+00:00', PersonalTodo::findOrFail($id)->due_at->toIso8601String());
        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 1 reminder(s).')->assertSuccessful();
        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
        $this->patchJson('/api/personal-todos/'.$id, ['is_done' => true])->assertOk();
        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
        $this->postJson('/api/personal-todos', ['title' => 'Past time', 'due_at' => '2026-11-15T09:00:00+08:00'])
            ->assertUnprocessable()->assertJsonValidationErrors('due_at');
    }

    public function test_offline_creation_keeps_time_even_when_synced_after_the_deadline(): void
    {
        $user = User::factory()->create();
        $operation = ['operation_id' => (string) Str::uuid(), 'kind' => 'create_personal', 'client_id' => (string) Str::uuid(),
            'title' => 'Offline timed work', 'due_date' => '2020-01-02', 'due_at' => '2020-01-02T14:15:00+08:00', 'done' => false];
        $this->actingAs($user)->postJson('/api/offline-sync', ['account_id' => $user->id, 'operations' => [$operation]])
            ->assertOk()->assertJsonPath('data.results.0.status', 'applied');
        $this->assertSame('2020-01-02T06:15:00+00:00', PersonalTodo::sole()->due_at->toIso8601String());
    }

    public function test_class_deadline_is_normalized_to_utc_without_losing_the_selected_instant(): void
    {
        $task = \App\Models\Task::factory()->create(['due_date' => '2026-11-15T00:30:00+08:00']);
        $this->assertSame('2026-11-14T16:30:00+00:00', $task->fresh()->due_date->toIso8601String());
    }
}
