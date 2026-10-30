<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TaskDeadlineTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('deadlines')]
    public function test_deadlines_on_create_and_update(string $method, string $deadline, bool $valid): void
    {
        $this->travelTo(now()->setDate(2026, 10, 30)->setTime(12, 0));
        Queue::fake();
        $block = Block::factory()->create();
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $this->actingAs($mayor);
        $task = $method === 'PUT' ? Task::factory()->forBlock($block, $mayor)->create(['due_date' => '2026-11-05']) : null;

        $response = $this->json($method, $task ? "/api/tasks/{$task->id}" : '/api/tasks', [
            'title' => 'Deadline test',
            'due_date' => $deadline,
        ]);

        if ($valid) {
            $response->assertSuccessful();
            $this->assertDatabaseHas('tasks', ['title' => 'Deadline test']);
        } else {
            $response->assertUnprocessable()->assertJsonValidationErrors('due_date');
            $this->assertDatabaseMissing('tasks', ['title' => 'Deadline test']);
            Queue::assertNothingPushed();
            if ($task) {
                $this->assertSame('2026-11-05', $task->fresh()->due_date->toDateString());
            }
        }
    }

    public static function deadlines(): array
    {
        $cases = [];
        foreach (['POST', 'PUT'] as $method) {
            foreach (['yesterday' => ['2026-10-29', false], 'today' => ['2026-10-30', true], 'tomorrow' => ['2026-10-31', true], 'earlier today' => ['2026-10-30 00:00:00', true], 'invalid' => ['not-a-date', false]] as $name => [$date, $valid]) {
                $cases["{$method} {$name}"] = [$method, $date, $valid];
            }
        }

        return $cases;
    }

    public function test_overdue_task_can_be_edited_without_resubmitting_its_deadline(): void
    {
        Queue::fake();
        $block = Block::factory()->create();
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $task = Task::factory()->forBlock($block, $mayor)->create(['due_date' => now()->subDay()]);
        $deadline = $task->due_date->toDateTimeString();

        $this->actingAs($mayor)->putJson("/api/tasks/{$task->id}", ['title' => 'Updated title'])->assertSuccessful();

        $this->assertSame($deadline, $task->fresh()->due_date->toDateTimeString());
        $this->assertSame('Updated title', $task->fresh()->title);
    }
}
