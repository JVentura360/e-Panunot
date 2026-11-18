<?php

namespace Tests\Feature;

use App\Jobs\DeleteGoogleEvent;
use App\Models\Announcement;
use App\Models\Block;
use App\Models\CalendarEvent;
use App\Models\PersonalTodo;
use App\Models\Task;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TermContentClearTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_term_empties_old_blocks_but_keeps_the_blocks(): void
    {
        Queue::fake();
        $old = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $block = Block::factory()->create(['term_id' => $old->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);

        $task = Task::factory()->forBlock($block, $mayor)->create(['google_event_id' => 'g-task']);
        $task->assignments()->create(['user_id' => $mayor->id]);
        Announcement::factory()->create(['block_id' => $block->id, 'created_by' => $mayor->id]);
        CalendarEvent::create([
            'block_id' => $block->id, 'created_by' => $mayor->id, 'title' => 'Class event',
            'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour(), 'google_event_id' => 'g-event',
        ]);
        $personal = CalendarEvent::create([
            'block_id' => null, 'created_by' => $mayor->id, 'title' => 'Mine',
            'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour(),
        ]);
        $todo = PersonalTodo::create(['user_id' => $mayor->id, 'title' => 'Mine too']);

        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/terms/current', [
            'school_year' => '2027-2028', 'semester' => 1,
            'starts_on' => '2027-08-01', 'ends_on' => '2028-01-31',
            'previous_term_id' => $old->id,
        ])->assertOk();

        $this->assertDatabaseHas('blocks', ['id' => $block->id]);
        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('task_assignments', 0);
        $this->assertDatabaseCount('announcements', 0);
        $this->assertDatabaseMissing('calendar_events', ['block_id' => $block->id]);
        // Personal items belong to the student, not the block, so they stay.
        $this->assertDatabaseHas('calendar_events', ['id' => $personal->id]);
        $this->assertDatabaseHas('personal_todos', ['id' => $todo->id]);
        Queue::assertPushed(DeleteGoogleEvent::class, 2);
    }

    public function test_editing_the_same_term_does_not_clear_anything(): void
    {
        $term = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        Task::factory()->forBlock($block, $mayor)->create();

        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/terms/current', [
            'school_year' => '2026-2027', 'semester' => (int) $term->semester,
            'starts_on' => '2026-08-01', 'ends_on' => '2027-01-31',
            'previous_term_id' => $term->id,
        ])->assertOk();

        $this->assertDatabaseCount('tasks', 1);
    }

    public function test_command_clears_leftovers_from_inactive_terms_only(): void
    {
        $old = Term::factory()->create();
        $current = Term::factory()->active()->create();
        $oldBlock = Block::factory()->create(['term_id' => $old->id]);
        $currentBlock = Block::factory()->create(['term_id' => $current->id]);
        $user = User::factory()->create();
        Task::factory()->forBlock($oldBlock, $user)->create();
        $keep = Task::factory()->forBlock($currentBlock, $user)->create();

        $this->artisan('terms:clear-old-content', ['--force' => true])->assertSuccessful();

        $this->assertDatabaseCount('tasks', 1);
        $this->assertDatabaseHas('tasks', ['id' => $keep->id]);
    }

    public function test_clear_completed_removes_only_my_finished_personal_items(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $done = PersonalTodo::create(['user_id' => $user->id, 'title' => 'Done', 'is_done' => true]);
        $open = PersonalTodo::create(['user_id' => $user->id, 'title' => 'Open', 'is_done' => false]);
        $othersDone = PersonalTodo::create(['user_id' => $other->id, 'title' => 'Theirs', 'is_done' => true]);
        $past = CalendarEvent::create(['block_id' => null, 'created_by' => $user->id, 'title' => 'Past',
            'starts_at' => now()->subDays(2), 'ends_at' => now()->subDays(2)->addHour()]);
        $future = CalendarEvent::create(['block_id' => null, 'created_by' => $user->id, 'title' => 'Future',
            'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour()]);
        $othersPast = CalendarEvent::create(['block_id' => null, 'created_by' => $other->id, 'title' => 'Theirs',
            'starts_at' => now()->subDays(2), 'ends_at' => now()->subDays(2)->addHour()]);

        $this->actingAs($user)->postJson('/api/personal-todos/clear-completed')
            ->assertOk()->assertJsonPath('data.tasks', 1)->assertJsonPath('data.events', 1);

        $this->assertDatabaseMissing('personal_todos', ['id' => $done->id]);
        $this->assertDatabaseHas('personal_todos', ['id' => $open->id]);
        $this->assertDatabaseHas('personal_todos', ['id' => $othersDone->id]);
        $this->assertDatabaseMissing('calendar_events', ['id' => $past->id]);
        $this->assertDatabaseHas('calendar_events', ['id' => $future->id]);
        $this->assertDatabaseHas('calendar_events', ['id' => $othersPast->id]);
    }

    public function test_clear_completed_requires_login(): void
    {
        $this->postJson('/api/personal-todos/clear-completed')->assertUnauthorized();
    }
}
