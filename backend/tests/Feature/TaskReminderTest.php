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

    public function test_it_honors_the_task_interval_and_reminder_limit(): void
    {
        $this->travelTo(Carbon::parse('2026-11-10 09:00:00'));

        $user = User::factory()->create();
        $task = Task::factory()->create([
            'due_date' => now()->addHours(6),
            'reminder_interval_minutes' => 60,
        ]);
        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'last_reminded_at' => now()->subMinutes(30),
        ]);

        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
        $assignment->update(['last_reminded_at' => now()->subMinutes(61)]);

        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 1 reminder(s).')->assertSuccessful();
        $assignment->update(['reminders_sent' => 3, 'last_reminded_at' => now()->subDay()]);

        $this->artisan('tasks:send-reminders')->expectsOutput('Sent 0 reminder(s).')->assertSuccessful();
        $this->assertDatabaseCount('notifications', 1);
    }
}
