<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\MayorApplication;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;

class MayorSubjectLoadTest extends TestCase
{
    use RefreshDatabase;

    private function subjects(): array
    {
        return [['code' => 'ITE301', 'name' => 'fundamentals of database systems']];
    }

    private function apply(User $student, int $number = 4): int
    {
        return $this->actingAs($student)->postJson('/api/mayor-applications', [
            'program' => 'ite', 'year_level' => 3, 'block_number' => $number, 'proposed_subjects' => $this->subjects(), 'is_regular_student' => true,
        ])->assertCreated()->json('data.id');
    }

    public function test_initial_proposal_is_stored_without_publishing_and_rejection_keeps_it_unpublished(): void
    {
        Term::factory()->active()->create();
        $id = $this->apply(User::factory()->create());
        $this->assertDatabaseCount('subjects', 0);
        $this->assertDatabaseCount('subject_loads', 0);
        $this->assertDatabaseCount('blocks', 0);
        $this->actingAs(User::factory()->admin()->create())->getJson('/api/admin/mayor-applications/'.$id)
            ->assertOk()->assertJsonPath('data.proposed_subjects.0.name', 'Fundamentals of Database Systems');
        $this->postJson('/api/admin/mayor-applications/'.$id.'/reject')->assertOk();
        $this->assertDatabaseCount('subject_loads', 0);
    }

    public function test_first_approval_publishes_reviewed_load_and_assigns_it_to_matching_blocks(): void
    {
        $term = Term::factory()->active()->create();
        $existing = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9]);
        $student = User::factory()->create();
        $id = $this->apply($student);
        $reviewed = [['code' => 'ITE302', 'name' => 'systems integration and architecture']];
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$id.'/approve', [
            'expected_revision' => 0, 'subjects' => $reviewed,
        ])->assertOk();
        $this->assertSame('mayor', $student->fresh()->role->value);
        $this->assertDatabaseCount('subject_loads', 1);
        $this->assertDatabaseCount('block_subjects', 2);
        $this->assertDatabaseHas('block_subjects', ['block_id' => $existing->id]);
        $this->assertDatabaseHas('subjects', ['code' => 'ITE302', 'name' => 'Systems Integration and Architecture']);
        $this->assertDatabaseMissing('subjects', ['code' => 'ITE301']);
    }

    public function test_existing_load_is_inherited_and_forged_proposals_are_rejected(): void
    {
        $term = Term::factory()->active()->create();
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->putJson('/api/admin/subject-loads/current', ['term_id' => $term->id, 'program' => 'ITE',
            'year_level' => 3, 'expected_revision' => 0, 'subjects' => $this->subjects()])->assertOk();
        $student = User::factory()->create();
        $data = ['program' => 'ITE', 'year_level' => 3, 'block_number' => 4, 'is_regular_student' => true];
        $this->actingAs($student)->postJson('/api/mayor-applications', $data + ['proposed_subjects' => $this->subjects()])->assertUnprocessable();
        $id = $this->postJson('/api/mayor-applications', $data)->assertCreated()->json('data.id');
        $this->actingAs($admin)->postJson('/api/admin/mayor-applications/'.$id.'/approve', ['expected_revision' => 1])->assertOk();
        $this->assertDatabaseCount('subjects', 1);
        $this->assertDatabaseCount('block_subjects', 1);
    }

    public function test_stale_first_proposal_cannot_replace_an_already_published_load(): void
    {
        Term::factory()->active()->create();
        $first = $this->apply(User::factory()->create(), 4);
        $second = $this->apply(User::factory()->create(), 9);
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->postJson('/api/admin/mayor-applications/'.$first.'/approve', ['expected_revision' => 0])->assertOk();
        $this->postJson('/api/admin/mayor-applications/'.$second.'/approve', ['expected_revision' => 0])->assertConflict();
        $this->postJson('/api/admin/mayor-applications/'.$second.'/approve', ['expected_revision' => 1,
            'subjects' => [['code' => 'WRONG', 'name' => 'Wrong Subject']]])->assertUnprocessable();
        $this->postJson('/api/admin/mayor-applications/'.$second.'/approve', ['expected_revision' => 1])->assertOk();
        $this->assertDatabaseCount('subjects', 1);
        $this->assertDatabaseCount('block_subjects', 2);
    }

    public function test_legacy_application_needs_a_published_load_and_archived_approval_cannot_change_data(): void
    {
        $term = Term::factory()->active()->create();
        $student = User::factory()->create();
        $application = MayorApplication::factory()->create(['term_id' => $term->id, 'user_id' => $student->id,
            'program' => 'ITE', 'year_level' => 3, 'proposed_subjects' => null]);
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0])->assertUnprocessable();
        $this->assertDatabaseCount('blocks', 0);
        $this->assertSame('student', $student->fresh()->role->value);
        $term->forceFill(['is_active' => false])->save();
        $this->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0, 'subjects' => $this->subjects()])->assertUnprocessable();
        $this->assertDatabaseHas('mayor_applications', ['id' => $application->id, 'status' => 'pending']);
    }

    public function test_a_first_load_is_required_and_invalid_proposal_does_not_create_application(): void
    {
        Term::factory()->active()->create();
        $this->actingAs(User::factory()->create())->postJson('/api/mayor-applications', [
            'program' => 'ITE', 'year_level' => 3, 'block_number' => 4, 'is_regular_student' => true,
        ])->assertUnprocessable();
        $this->assertDatabaseCount('mayor_applications', 0);
    }

    public function test_application_lookup_from_a_previous_term_or_load_revision_cannot_be_submitted(): void
    {
        $old = Term::factory()->create();
        $term = Term::factory()->active()->create();
        $student = User::factory()->create();
        $data = ['program' => 'ITE', 'year_level' => 3, 'block_number' => 4, 'proposed_subjects' => $this->subjects(), 'is_regular_student' => true];
        $this->actingAs($student)->postJson('/api/mayor-applications', $data + ['expected_term_id' => $old->id])->assertConflict();
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/subject-loads/current', ['term_id' => $term->id,
            'program' => 'ITE', 'year_level' => 3, 'expected_revision' => 0, 'subjects' => $this->subjects()])->assertOk();
        $this->actingAs($student)->postJson('/api/mayor-applications', $data + ['expected_term_id' => $term->id, 'expected_load_revision' => 0])->assertConflict();
        $this->assertDatabaseCount('mayor_applications', 0);
    }

    public function test_failed_publication_rolls_back_approval_role_and_block_creation(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9]);
        $old = Subject::create(['code' => 'OLD301', 'name' => 'Existing Subject']);
        $block->update(['mayor_id' => User::factory()->create(['role' => 'mayor'])->id]);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $old->id]);
        $this->actingAs(User::factory()->create())->joinApprovedBlock($block->id, 'irregular');
        $this->postJson('/api/subject-enrollments', ['block_id' => $block->id, 'subject_id' => $old->id, 'student_type' => 'irregular'])->assertCreated();
        $student = User::factory()->create();
        $id = $this->apply($student);
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$id.'/approve', ['expected_revision' => 0])->assertUnprocessable();
        $this->assertDatabaseCount('subject_loads', 0);
        $this->assertDatabaseMissing('subjects', ['code' => 'ITE301']);
        $this->assertDatabaseCount('blocks', 1);
        $this->assertSame('student', $student->fresh()->role->value);
        $this->assertDatabaseHas('mayor_applications', ['id' => $id, 'status' => 'pending', 'block_id' => null]);
    }

    public function test_mutations_lock_the_term_before_establishing_a_transaction_snapshot(): void
    {
        $term = Term::factory()->active()->create();
        $id = $this->apply(User::factory()->create());
        $admin = User::factory()->admin()->create();
        $reads = [];
        DB::listen(function (\Illuminate\Database\Events\QueryExecuted $query) use (&$reads): void {
            if ($query->connection->transactionLevel() > 1 && str_starts_with(strtolower($query->sql), 'select')) {
                $reads[] = $query->sql;
            }
        });
        $this->actingAs($admin)->putJson('/api/admin/subject-loads/current', ['term_id' => $term->id, 'program' => 'ITE',
            'year_level' => 3, 'expected_revision' => 0, 'subjects' => $this->subjects()])->assertOk();
        $this->assertStringContainsString('terms', $reads[0]);
        $reads = [];
        $this->postJson('/api/admin/mayor-applications/'.$id.'/approve', ['expected_revision' => 1])->assertOk();
        $this->assertStringContainsString('terms', $reads[0]);
    }
}
