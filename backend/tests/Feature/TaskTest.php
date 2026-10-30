<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeBlockWithMayor(): array
    {
        $term  = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create();
        $block->update(['mayor_id' => $mayor->id]);

        return [$block, $mayor];
    }

    // ── Mayor can create a task ───────────────────────────────────────────────

    public function test_mayor_can_create_task(): void
    {
        [$block, $mayor] = $this->makeBlockWithMayor();

        $payload = [
            'title'    => 'Submit Lab Report 3',
            'due_date' => now()->addDays(7)->toDateTimeString(),
            'platform' => 'GradeVision',
        ];

        $response = $this->actingAs($mayor)
            ->postJson("/api/blocks/{$block->id}/tasks", $payload);

        $response->assertStatus(201)
            ->assertJsonFragment(['title' => 'Submit Lab Report 3']);

        $this->assertDatabaseHas('tasks', [
            'block_id' => $block->id,
            'title'    => 'Submit Lab Report 3',
        ]);
    }

    // ── Validation rejects missing required fields ────────────────────────────

    public function test_task_creation_fails_without_title(): void
    {
        [$block, $mayor] = $this->makeBlockWithMayor();

        $response = $this->actingAs($mayor)
            ->postJson("/api/blocks/{$block->id}/tasks", [
                'due_date' => now()->addDays(3)->toDateTimeString(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_task_creation_fails_without_due_date(): void
    {
        [$block, $mayor] = $this->makeBlockWithMayor();

        $response = $this->actingAs($mayor)
            ->postJson("/api/blocks/{$block->id}/tasks", [
                'title' => 'Missing deadline task',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['due_date']);
    }

    // ── Student cannot create a task ─────────────────────────────────────────

    public function test_student_cannot_create_task(): void
    {
        [$block, $mayor] = $this->makeBlockWithMayor();
        $student = User::factory()->student($block)->create();

        $response = $this->actingAs($student)
            ->postJson("/api/blocks/{$block->id}/tasks", [
                'title'    => 'Unauthorized task',
                'due_date' => now()->addDays(5)->toDateTimeString(),
            ]);

        $response->assertStatus(403);
    }

    // ── Student can mark their assignment complete ────────────────────────────

    public function test_student_can_complete_task_assignment(): void
    {
        [$block, $mayor] = $this->makeBlockWithMayor();
        $student = User::factory()->student($block)->create();
        $task    = Task::factory()->forBlock($block, $mayor)->create();

        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $student->id,
        ]);

        $response = $this->actingAs($student)
            ->patchJson("/api/task-assignments/{$assignment->id}/complete");

        $response->assertStatus(200);

        $this->assertNotNull(
            TaskAssignment::find($assignment->id)->completed_at
        );
    }

    // ── Unauthenticated request is rejected ───────────────────────────────────

    public function test_unauthenticated_user_cannot_access_tasks(): void
    {
        $term  = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);

        $this->getJson("/api/blocks/{$block->id}/tasks")
            ->assertStatus(401);
    }
}
