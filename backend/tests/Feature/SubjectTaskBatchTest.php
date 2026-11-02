<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Services\StudentEnrollmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubjectTaskBatchTest extends TestCase
{
    use RefreshDatabase;

    private function setupBlock(): array
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $subjects = [];
        foreach ([301, 302, 303] as $number) {
            $subject = Subject::create(['code' => 'ITE'.$number, 'name' => 'Subject '.$number]);
            DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
            $subjects[] = $subject;
        }
        app(StudentEnrollmentService::class)->enrollBlock($mayor->id, $block->id, 'regular');
        return [$block, $mayor, $subjects];
    }

    public function test_all_subjects_creates_three_tasks_and_completion_is_independent(): void
    {
        [$block, $mayor, $subjects] = $this->setupBlock();
        $student = User::factory()->create();
        app(StudentEnrollmentService::class)->enrollBlock($student->id, $block->id, 'regular');
        $tasks = $this->actingAs($mayor)->postJson('/api/tasks', ['title' => 'Read chapter 1', 'all_subjects' => true,
            'due_date' => now()->addDay()->toDateTimeString()])->assertCreated()->assertJsonCount(3, 'data')->json('data');
        $this->assertCount(3, array_unique(array_column($tasks, 'id')));
        $this->assertDatabaseCount('tasks', 3);
        $this->actingAs($student)->getJson('/api/tasks')->assertJsonCount(3, 'data');
        $this->postJson('/api/tasks/'.$tasks[0]['id'].'/complete')->assertOk();
        $list = $this->getJson('/api/tasks')->assertOk()->json('data');
        $this->assertCount(1, array_filter($list, fn (array $task) => $task['completed_at'] !== null));
        $this->assertCount(2, array_filter($list, fn (array $task) => $task['completed_at'] === null));
    }

    public function test_irregular_primary_member_receives_only_enrolled_subject_tasks(): void
    {
        [$block, $mayor, $subjects] = $this->setupBlock();
        $student = User::factory()->student($block)->create();
        app(StudentEnrollmentService::class)->enrollBlock($student->id, $block->id, 'irregular', [$subjects[0]->id, $subjects[1]->id]);
        $this->actingAs($mayor)->postJson('/api/tasks', ['title' => 'Submit report', 'all_subjects' => true,
            'due_date' => now()->addDay()->toDateTimeString()])->assertCreated()->assertJsonCount(3, 'data');
        $this->actingAs($student)->getJson('/api/tasks')->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(2, DB::table('task_assignments')->where('user_id', $student->id)->count());
    }

    public function test_task_creation_requires_a_subject_and_rejects_mixed_or_unrelated_selection(): void
    {
        [$block, $mayor, $subjects] = $this->setupBlock();
        $base = ['title' => 'Report', 'due_date' => now()->addDay()->toDateTimeString()];
        $this->actingAs($mayor)->postJson('/api/tasks', $base)->assertUnprocessable();
        $this->postJson('/api/tasks', $base + ['all_subjects' => true, 'subject_id' => $subjects[0]->id])->assertUnprocessable();
        $other = Subject::create(['code' => 'OTHER', 'name' => 'Other Subject']);
        $this->postJson('/api/tasks', $base + ['subject_id' => $other->id])->assertUnprocessable();
        $this->assertDatabaseCount('tasks', 0);
        $this->postJson('/api/tasks', $base + ['subject_id' => $subjects[0]->id])->assertCreated()->assertJsonPath('data.subject.id', $subjects[0]->id);
    }

    public function test_empty_load_and_unreconciled_mayor_cannot_create_class_tasks(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $this->actingAs($mayor)->postJson('/api/tasks', ['title' => 'Report', 'all_subjects' => true,
            'due_date' => now()->addDay()->toDateTimeString()])->assertUnprocessable();
        $this->assertDatabaseCount('tasks', 0);
    }
}
