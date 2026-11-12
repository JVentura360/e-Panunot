<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberTasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_mayor_sees_only_members_unfinished_tasks_in_their_block(): void
    {
        $mayor = User::factory()->create(['role' => 'mayor']);
        $block = Block::factory()->create(['mayor_id' => $mayor->id, 'term_id' => Term::factory()->active()]);
        $student = User::factory()->create(['block_id' => $block->id]);
        $pending = Task::factory()->create(['block_id' => $block->id, 'due_date' => now()->subDay()]);
        $completed = Task::factory()->create(['block_id' => $block->id]);
        TaskAssignment::create(['task_id' => $completed->id, 'user_id' => $student->id, 'completed_at' => now()]);
        Task::factory()->create();
        \App\Models\PersonalTodo::create(['user_id' => $student->id, 'title' => 'Private', 'due_date' => now()->toDateString()]);

        $url = '/api/blocks/'.$block->id.'/members/'.$student->id.'/unfinished-tasks';
        $this->actingAs($mayor)->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pending->id);
        $this->actingAs($student)->getJson($url)->assertForbidden();
        $otherMayor = User::factory()->create(['role' => 'mayor']);
        $this->actingAs($otherMayor)->getJson($url)->assertForbidden();
        $outsider = User::factory()->create();
        $this->actingAs($mayor)->getJson('/api/blocks/'.$block->id.'/members/'.$outsider->id.'/unfinished-tasks')->assertNotFound();
    }
}
