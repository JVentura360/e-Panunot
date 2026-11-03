<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubjectLoadTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Term $term, array $extra = []): array
    {
        return array_replace([
            'term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'expected_revision' => 0,
            'subjects' => [['code' => ' ite301 ', 'name' => 'fundamentals of database systems']],
        ], $extra);
    }

    public function test_publication_updates_matching_blocks_only_and_increments_revision(): void
    {
        $term = Term::factory()->active()->create();
        $first = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 4]);
        $second = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9]);
        $otherProgram = Block::factory()->create(['term_id' => $term->id, 'program' => 'BSA', 'year_level' => 3]);
        $otherYear = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 2]);
        $archived = Block::factory()->create(['program' => 'ITE', 'year_level' => 3]);
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/subject-loads/current', $this->payload($term))
            ->assertOk()->assertJsonPath('data.load.revision', 1)
            ->assertJsonPath('data.load.subjects.0.code', 'ITE301')
            ->assertJsonPath('data.load.subjects.0.name', 'Fundamentals of Database Systems');
        foreach ([$first, $second] as $block) {
            $this->assertDatabaseHas('block_subjects', ['block_id' => $block->id]);
        }
        foreach ([$otherProgram, $otherYear, $archived] as $block) {
            $this->assertDatabaseMissing('block_subjects', ['block_id' => $block->id]);
        }
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 1]))
            ->assertOk()->assertJsonPath('data.load.revision', 2);
        $this->getJson('/api/subject-loads/current?program=ITE&year_level=3')->assertOk()->assertJsonCount(2, 'data.blocks');
        $this->assertDatabaseCount('subjects', 1);
    }

    public function test_only_admin_can_publish_and_legacy_block_writes_are_not_a_bypass(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertUnauthorized();
        foreach ([User::factory()->create(), $mayor, User::factory()->admin()->create()] as $user) {
            $this->actingAs($user);
            if ($user->role->value !== 'admin') {
                $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertForbidden();
            }
            $this->postJson('/api/blocks/'.$block->id.'/subjects', ['code' => 'ITE301', 'name' => 'Database Systems'])->assertForbidden();
            $this->putJson('/api/blocks/'.$block->id.'/subjects', ['subject_ids' => []])->assertForbidden();
        }
        $this->assertDatabaseCount('subjects', 0);
    }

    public function test_revision_and_archived_term_checks_prevent_stale_writes(): void
    {
        $term = Term::factory()->active()->create();
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertOk();
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertConflict();
        $term->forceFill(['is_active' => false])->save();
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 1]))->assertUnprocessable();
        $this->assertDatabaseHas('subject_loads', ['term_id' => $term->id, 'revision' => 1]);
    }

    public function test_invalid_or_conflicting_subjects_do_not_publish_partial_loads(): void
    {
        $term = Term::factory()->active()->create();
        $this->actingAs(User::factory()->admin()->create());
        $rows = [['code' => 'ITE301', 'name' => 'Database Systems'], ['code' => 'ite301', 'name' => 'Database Systems']];
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['subjects' => $rows]))->assertUnprocessable();
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['subjects' => [['code' => [], 'name' => '']]]))->assertUnprocessable();
        Subject::create(['code' => 'ITE301', 'name' => 'Operating Systems']);
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertUnprocessable();
        $this->assertDatabaseCount('subject_loads', 0);
        $this->assertDatabaseCount('subjects', 1);
    }

    public function test_admin_removal_persists_across_blocks_and_clears_enrollments_but_preserves_history(): void
    {
        $term = Term::factory()->active()->create();
        $blocks = [Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 4]),
            Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9])];
        $subject = Subject::create(['code' => 'OLD301', 'name' => 'Existing Subject']);
        foreach ($blocks as $block) {
            DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        }
        $student = User::factory()->create();
        $blocks[1]->update(['mayor_id' => User::factory()->create(['role' => 'mayor'])->id]);
        $this->actingAs($student)->postJson('/api/blocks/'.$blocks[1]->id.'/join', ['student_type' => 'irregular'])->assertOk();
        $this->postJson('/api/subject-enrollments', ['block_id' => $blocks[1]->id, 'subject_id' => $subject->id, 'student_type' => 'irregular'])->assertCreated();
        $this->actingAs(User::factory()->admin()->create())->getJson('/api/subject-loads/current?program=ITE&year_level=3')
            ->assertOk()->assertJsonPath('data.load', null)->assertJsonCount(1, 'data.existing_subjects');
        $task = \App\Models\Task::factory()->forBlock($blocks[1], $student)->create(['subject_id' => $subject->id]);
        $assignment = \App\Models\TaskAssignment::create(['task_id' => $task->id, 'user_id' => $student->id, 'completed_at' => now()]);
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertOk();
        $this->assertDatabaseCount('subject_loads', 1);
        $this->assertDatabaseCount('block_subjects', 2);
        $this->assertDatabaseMissing('block_subjects', ['subject_id' => $subject->id]);
        $this->assertDatabaseMissing('subject_enrollments', ['subject_id' => $subject->id]);
        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'subject_id' => $subject->id]);
        $this->assertNotNull($assignment->fresh()->completed_at);
        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
        $this->getJson('/api/subject-loads/current?program=ITE&year_level=3')->assertOk()->assertJsonPath('data.load.subjects.0.code', 'ITE301');
    }

    public function test_admin_can_edit_existing_subject_identity_and_clear_the_load(): void
    {
        $term = Term::factory()->active()->create();
        $this->actingAs(User::factory()->admin()->create());
        $subjectId = $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertOk()->json('data.load.subjects.0.id');
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 1,
            'subjects' => [['id' => $subjectId, 'code' => 'ITE302', 'name' => 'advanced database systems']]]))
            ->assertOk()->assertJsonPath('data.load.subjects.0.id', $subjectId)->assertJsonPath('data.load.subjects.0.name', 'Advanced Database Systems');
        $this->assertDatabaseCount('subjects', 1);
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 2, 'subjects' => []]))
            ->assertOk()->assertJsonCount(0, 'data.load.subjects');
        $this->getJson('/api/subject-loads/current?program=ITE&year_level=3')->assertOk()->assertJsonCount(0, 'data.load.subjects');
    }

    public function test_catalog_edits_reject_unrelated_ids_and_advance_other_shared_load_revisions(): void
    {
        $term = Term::factory()->active()->create();
        $this->actingAs(User::factory()->admin()->create());
        $id = $this->putJson('/api/admin/subject-loads/current', $this->payload($term))->assertOk()->json('data.load.subjects.0.id');
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['program' => 'BSA']))->assertOk();
        $unrelated = Subject::create(['code' => 'OTHER', 'name' => 'Other Subject']);
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 1,
            'subjects' => [['id' => $unrelated->id, 'code' => 'OTHER', 'name' => 'Changed Name']]]))->assertUnprocessable();
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['expected_revision' => 1,
            'subjects' => [['id' => $id, 'code' => 'ITE301', 'name' => 'advanced database systems']]]))->assertOk();
        $this->getJson('/api/subject-loads/current?program=BSA&year_level=3')->assertOk()
            ->assertJsonPath('data.load.revision', 2)->assertJsonPath('data.load.subjects.0.name', 'Advanced Database Systems');
        $this->putJson('/api/admin/subject-loads/current', $this->payload($term, ['program' => 'BSA', 'expected_revision' => 1]))->assertConflict();
    }
}
