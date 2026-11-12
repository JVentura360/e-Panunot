<?php

namespace Tests\Feature;

use App\Models\PersonalTodo;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TaskReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reminds_assignees_and_owners_about_deadlines_within_24_hours(): void
    {
        $this->travelTo(Carbon::parse('2026-11-10 09:00:00'));

        $user = User::factory()->create();
        $task = Task::factory()->create(['due_date' => now()->addHours(12)]);
        TaskAssignment::create(['task_id' => $task->id, 'user_id' => $user->id]);
        $todo = PersonalTodo::create([
            'user_id' => $user->id,
            'title' => 'Submit reflection',
            'due_date' => now()->toDateString(),
        ]);

        $this->artisan('tasks:send-reminders')
            ->expectsOutput('Sent 2 reminder(s).')
            ->assertSuccessful();

        $this->assertDatabaseCount('notifications', 2);
        $notifications = DB::table('notifications')
            ->where('notifiable_id', $user->id)
            ->get()
            ->map(fn (object $notification): array => json_decode($notification->data, true));

        $this->assertTrue($notifications->contains(fn (array $data): bool => $data['task_id'] === $task->id
            && str_contains($data['message'], 'is due')));
        $this->assertTrue($notifications->contains(fn (array $data): bool => $data['personal_todo_id'] === $todo->id
            && $data['kind'] === 'personal_todo_reminder'));
        $this->assertSame(1, $task->assignments()->first()->reminders_sent);
        $this->assertSame(1, $todo->fresh()->reminders_sent);
    }

    public function test_it_skips_completed_overdue_and_more_than_24_hour_deadlines(): void
    {
        $this->travelTo(Carbon::parse('2026-11-10 09:00:00'));

        $user = User::factory()->create();
        $nearDue = Task::factory()->create(['due_date' => now()->addHours(6)]);
        TaskAssignment::create([
            'task_id' => $nearDue->id,
            'user_id' => $user->id,
            'completed_at' => now(),
        ]);
        foreach ([now()->addHours(25), now()->subMinute()] as $dueDate) {
            $task = Task::factory()->create(['due_date' => $dueDate]);
            TaskAssignment::create(['task_id' => $task->id, 'user_id' => $user->id]);
        }

        $todo = PersonalTodo::create([
            'user_id' => $user->id,
            'title' => 'Already completed',
            'due_date' => now()->toDateString(),
            'is_done' => true,
        ]);
        $todo->forceFill(['reminders_sent' => 0])->save();
        PersonalTodo::create([
            'user_id' => $user->id,
            'title' => 'Due later',
            'due_date' => now()->addDays(2)->toDateString(),
        ]);

        $this->artisan('tasks:send-reminders')
            ->expectsOutput('Sent 0 reminder(s).')
            ->assertSuccessful();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_it_sends_once_at_each_deadline_milestone(): void
    {
        $this->travelTo(Carbon::parse('2026-11-10 09:00:00'));

        $user = User::factory()->create();
        $task = Task::factory()->create([
            'due_date' => now()->addHours(24),
            'reminder_interval_minutes' => 60,
        ]);
        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
        ]);

        foreach ([1440, 720, 360, 180, 60, 30] as $minutes) {
            $this->travelTo($task->due_date->copy()->subMinutes($minutes));
            $this->artisan('tasks:send-reminders')->expectsOutput('Sent 1 reminder(s).')->assertSuccessful();
            $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
        }
        $this->assertDatabaseCount('notifications', 6);
        $this->assertSame(6, $assignment->fresh()->reminders_sent);
    }

    public function test_completion_stops_remaining_milestones(): void
    {
        $task = Task::factory()->create(['due_date' => now()->addHours(24)]);
        $assignment = TaskAssignment::create(['task_id' => $task->id, 'user_id' => User::factory()->create()->id]);
        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 1 reminder(s).')->assertSuccessful();
        $assignment->update(['completed_at' => now()]);
        $this->travelTo($task->due_date->copy()->subHours(12));
        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
    }

    public function test_manual_reminders_are_scoped_and_do_not_change_automatic_timing(): void
    {
        $term = \App\Models\Term::factory()->active()->create();
        $mayor = User::factory()->create(['role' => 'mayor']);
        $block = \App\Models\Block::factory()->create(['term_id' => $term->id, 'mayor_id' => $mayor->id]);
        $student = User::factory()->create(['block_id' => $block->id]);
        $task = Task::factory()->create(['block_id' => $block->id, 'due_date' => now()->addHours(5)]);
        $assignment = TaskAssignment::create(['task_id' => $task->id, 'user_id' => $student->id]);
        $completed = Task::factory()->create(['block_id' => $block->id, 'due_date' => now()->addHours(5)]);
        TaskAssignment::create(['task_id' => $completed->id, 'user_id' => $student->id, 'completed_at' => now()]);
        $otherTask = Task::factory()->create(['due_date' => now()->addHours(2)]);
        TaskAssignment::create(['task_id' => $otherTask->id, 'user_id' => $student->id]);
        $url = '/api/blocks/'.$block->id.'/deadline-reminders';
        $this->actingAs($student)->postJson($url)->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => 'mayor']))->postJson($url)->assertForbidden();
        $this->actingAs($mayor)->postJson($url)->assertOk()->assertJson(['sent' => 1, 'students' => 1, 'failed' => 0, 'push_enabled_students' => 0, 'push_unregistered_students' => 1]);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertNull($assignment->fresh()->last_reminded_at);
        $this->actingAs($mayor)->postJson($url)->assertStatus(429);
        $this->travel(61)->seconds();
        $this->actingAs($mayor)->postJson($url)->assertOk()->assertJson(['sent' => 1]);
        $this->assertDatabaseCount('notifications', 2);
        $this->actingAs($student)->getJson('/api/notifications')->assertOk()->assertJsonCount(2, 'data');
    }
}
