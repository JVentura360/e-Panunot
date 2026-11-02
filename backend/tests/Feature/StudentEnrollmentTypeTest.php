<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentEnrollmentTypeTest extends TestCase
{
    use RefreshDatabase;

    private function block(Term $term, int $number, array $subjects): Block
    {
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => $number]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        foreach ($subjects as $subject) {
            DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        }
        return $block;
    }

    private function subjects(): array
    {
        return array_map(fn (int $number) => Subject::create(['code' => 'ITE'.$number, 'name' => 'Subject '.$number]), [301, 302, 303]);
    }

    public function test_irregular_join_sets_primary_membership_before_subject_selection(): void
    {
        $term = Term::factory()->active()->create();
        $subjects = $this->subjects();
        $home = $this->block($term, 4, $subjects);
        $other = $this->block($term, 9, $subjects);
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/subject-enrollments', ['block_id' => $other->id,
            'subject_id' => $subjects[0]->id, 'student_type' => 'irregular'])->assertUnprocessable();
        $this->postJson('/api/blocks/'.$home->id.'/join', ['student_type' => 'irregular'])->assertOk();
        $this->assertDatabaseCount('subject_enrollments', 0);
        $this->getJson('/api/me')->assertJsonPath('data.block_id', $home->id)->assertJsonPath('data.block', '31-ITE-04');
        $id = $this->postJson('/api/subject-enrollments', ['block_id' => $other->id,
            'subject_id' => $subjects[0]->id])->assertCreated()->json('data.id');
        $this->getJson('/api/me')->assertJsonPath('data.block_id', $home->id);
        $this->deleteJson('/api/subject-enrollments/'.$id)->assertOk();
        $this->getJson('/api/me')->assertJsonPath('data.block_id', $home->id)->assertJsonPath('data.enrollment_count', 0);
        $this->postJson('/api/blocks/'.$other->id.'/join', ['student_type' => 'irregular'])->assertUnprocessable();
    }

    public function test_regular_join_automatically_enrolls_and_removal_clears_only_that_blocks_access(): void
    {
        $term = Term::factory()->active()->create();
        $subjects = $this->subjects();
        $home = $this->block($term, 4, $subjects);
        $other = $this->block($term, 9, $subjects);
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$home->id.'/join', ['student_type' => 'regular'])->assertOk();
        $this->assertDatabaseCount('subject_enrollments', 3);
        $this->actingAs(User::findOrFail($home->mayor_id))->deleteJson('/api/blocks/'.$home->id.'/members/'.$student->id)->assertOk();
        $this->assertNull($student->fresh()->block_id);
        $this->assertDatabaseCount('subject_enrollments', 0);
        $this->actingAs($student->fresh())->postJson('/api/blocks/'.$home->id.'/join', ['student_type' => 'irregular'])->assertOk();
        foreach ([$home, $other] as $index => $block) {
            $this->postJson('/api/subject-enrollments', ['block_id' => $block->id, 'subject_id' => $subjects[$index]->id])->assertCreated();
            $task = Task::create(['block_id' => $block->id, 'subject_id' => $subjects[$index]->id,
                'created_by' => $block->mayor_id, 'title' => 'Class task', 'due_date' => now()->addDay()]);
            DB::table('task_assignments')->insert(['task_id' => $task->id, 'user_id' => $student->id, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->actingAs(User::findOrFail($home->mayor_id))->deleteJson('/api/blocks/'.$home->id.'/members/'.$student->id)->assertOk();
        $this->assertNull($student->fresh()->block_id);
        $this->actingAs($student->fresh())->getJson('/api/tasks')->assertOk()->assertJsonCount(1, 'data');
        $this->assertDatabaseHas('subject_enrollments', ['user_id' => $student->id, 'block_id' => $other->id]);
        $this->assertDatabaseMissing('subject_enrollments', ['user_id' => $student->id, 'block_id' => $home->id]);
        $this->assertDatabaseCount('tasks', 2);
        $this->assertDatabaseCount('task_assignments', 1);
    }

    public function test_regular_join_enrolls_the_entire_load_and_is_idempotent(): void
    {
        $term = Term::factory()->active()->create();
        $block = $this->block($term, 4, $this->subjects());
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertOk();
        $this->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertOk();
        $this->assertDatabaseCount('subject_enrollments', 3);
        $this->assertDatabaseCount('student_term_profiles', 1);
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->getJson('/api/me')->assertJsonPath('data.student_type', 'regular')->assertJsonPath('data.can_apply_as_mayor', false);
        $id = DB::table('subject_enrollments')->where('user_id', $student->id)->value('id');
        $this->deleteJson('/api/subject-enrollments/'.$id)->assertOk();
        $this->assertDatabaseCount('subject_enrollments', 2);
        $this->assertDatabaseHas('student_term_profiles', ['user_id' => $student->id, 'student_type' => 'regular']);
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->putJson('/api/enrollment-profile', ['student_type' => 'irregular'])->assertUnprocessable();
    }

    public function test_irregular_students_select_subjects_across_blocks_without_primary_block_leakage(): void
    {
        $term = Term::factory()->active()->create();
        $subjects = $this->subjects();
        $first = $this->block($term, 4, $subjects);
        $second = $this->block($term, 9, $subjects);
        $student = User::factory()->student($first)->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$first->id.'/enrollment', ['student_type' => 'irregular', 'subject_ids' => [$subjects[0]->id]])->assertOk();
        $this->postJson('/api/blocks/'.$second->id.'/enrollment', ['student_type' => 'irregular', 'subject_ids' => [$subjects[1]->id]])->assertOk();
        foreach ([$subjects[0], $subjects[2]] as $subject) {
            Task::create(['block_id' => $first->id, 'subject_id' => $subject->id, 'created_by' => $first->mayor_id, 'title' => 'Task '.$subject->code, 'due_date' => now()->addDay()]);
        }
        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/blocks/'.$second->id.'/enrollment', ['student_type' => 'irregular', 'subject_ids' => [$subjects[0]->id]])->assertUnprocessable();
        $this->assertDatabaseCount('subject_enrollments', 2);
        $this->getJson('/api/me')->assertJsonPath('data.student_type', 'irregular')->assertJsonPath('data.can_apply_as_mayor', false);
    }

    public function test_regular_conflict_rolls_back_profile_and_membership(): void
    {
        $term = Term::factory()->active()->create();
        $subjects = $this->subjects();
        $first = $this->block($term, 4, $subjects);
        $second = $this->block($term, 9, $subjects);
        $student = User::factory()->create();
        DB::table('subject_enrollments')->insert(['user_id' => $student->id, 'term_id' => $term->id,
            'block_id' => $first->id, 'subject_id' => $subjects[1]->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($student)->postJson('/api/blocks/'.$second->id.'/enrollment', ['student_type' => 'regular'])->assertUnprocessable();
        $this->assertDatabaseCount('student_term_profiles', 0);
        $this->assertDatabaseCount('subject_enrollments', 1);
        $this->assertNull($student->fresh()->block_id);
    }

    public function test_empty_unappointed_and_archived_blocks_cannot_be_joined(): void
    {
        $term = Term::factory()->active()->create();
        $block = $this->block($term, 4, []);
        $this->actingAs(User::factory()->create())->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertUnprocessable();
        $subject = $this->subjects()[0];
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        $block->update(['mayor_id' => null]);
        $this->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertUnprocessable();
        $term->forceFill(['is_active' => false])->save();
        $this->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertUnprocessable();
    }

    public function test_legacy_students_confirm_classification_and_rollover_preserves_history(): void
    {
        $term = Term::factory()->active()->create();
        $student = User::factory()->create();
        $this->actingAs($student)->getJson('/api/enrollment-profile')->assertOk()->assertJsonPath('data.profile', null);
        $this->putJson('/api/enrollment-profile', ['student_type' => 'irregular'])->assertOk();
        $term->forceFill(['is_active' => false])->save();
        Term::factory()->active()->create();
        $this->getJson('/api/enrollment-profile')->assertOk()->assertJsonPath('data.profile', null);
        $this->assertDatabaseCount('student_term_profiles', 1);
    }

    public function test_individual_enrollment_and_withdrawal_lock_term_before_transaction_snapshot(): void
    {
        $term = Term::factory()->active()->create();
        $subject = $this->subjects()[0];
        $block = $this->block($term, 4, [$subject]);
        $student = User::factory()->create();
        $reads = [];
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'irregular'])->assertOk();
        DB::listen(function (\Illuminate\Database\Events\QueryExecuted $query) use (&$reads): void {
            if ($query->connection->transactionLevel() > 1 && str_starts_with(strtolower($query->sql), 'select')) {
                $reads[] = $query->sql;
            }
        });
        $id = $this->actingAs($student)->postJson('/api/subject-enrollments', ['block_id' => $block->id,
            'subject_id' => $subject->id, 'student_type' => 'irregular'])->assertCreated()->json('data.id');
        $this->assertStringContainsString('terms', $reads[0]);
        $reads = [];
        $this->deleteJson('/api/subject-enrollments/'.$id)->assertOk();
        $this->assertStringContainsString('terms', $reads[0]);
    }

    public function test_legacy_join_requests_cannot_bypass_classification_and_enrollment(): void
    {
        $term = Term::factory()->active()->create();
        $block = $this->block($term, 4, $this->subjects());
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join-requests')->assertUnprocessable();
        $id = DB::table('block_join_requests')->insertGetId(['user_id' => $student->id, 'block_id' => $block->id,
            'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs(User::findOrFail($block->mayor_id))->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertUnprocessable();
        $this->assertNull($student->fresh()->block_id);
        $this->assertDatabaseCount('student_term_profiles', 0);
        $this->assertDatabaseCount('subject_enrollments', 0);
        $this->assertDatabaseHas('block_join_requests', ['id' => $id, 'status' => 'pending']);
    }
}
