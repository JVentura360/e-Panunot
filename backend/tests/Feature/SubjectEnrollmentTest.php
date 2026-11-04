<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Models\Task;
use App\Models\Announcement;
use App\Models\CalendarEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubjectEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    private function offering(Term $term, ?Subject $subject = null): array
    {
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3,
            'block_number' => ((int) DB::table('blocks')->where('term_id', $term->id)->max('block_number')) + 1]);
        $block->update(['mayor_id' => User::factory()->create(['role' => 'mayor'])->id]);
        $subject ??= Subject::create(['code' => 'ITE'.fake()->unique()->numberBetween(100, 999), 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);

        return ['block_id' => $block->id, 'subject_id' => $subject->id, 'student_type' => 'irregular'];
    }

    public function test_immediate_enrollment_in_different_blocks_and_duplicate_protection(): void
    {
        $term = Term::factory()->active()->create();
        $first = $this->offering($term);
        $second = $this->offering($term);
        $sameSubject = $this->offering($term, Subject::findOrFail($first['subject_id']));
        $student = User::factory()->create();
        $this->actingAs($student)->joinApprovedBlock($first['block_id'], 'irregular');
        $this->actingAs($student)->postJson('/api/subject-enrollments', $first)->assertCreated();
        $this->postJson('/api/subject-enrollments', $second)->assertCreated();
        $this->postJson('/api/subject-enrollments', $first)->assertUnprocessable()->assertJsonValidationErrors('subject_id');
        $this->postJson('/api/subject-enrollments', $sameSubject)->assertUnprocessable();
        $this->getJson('/api/subject-enrollments/mine')->assertOk()->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('subject_enrollments', 2);
        $this->assertSame($first['block_id'], $student->fresh()->block_id);
        $this->assertDatabaseCount('block_join_requests', 1);
        $this->assertDatabaseHas('block_join_requests', ['user_id' => $student->id, 'status' => 'approved']);
    }

    public function test_only_owner_can_withdraw_then_switch_blocks(): void
    {
        $term = Term::factory()->active()->create();
        $first = $this->offering($term);
        $other = $this->offering($term, Subject::findOrFail($first['subject_id']));
        $student = User::factory()->create();
        $this->actingAs($student)->joinApprovedBlock($first['block_id'], 'irregular');
        $id = $this->actingAs($student)->postJson('/api/subject-enrollments', $first)->assertCreated()->json('data.id');
        $this->actingAs(User::factory()->create())->deleteJson('/api/subject-enrollments/'.$id)->assertNotFound();
        $this->actingAs($student)->deleteJson('/api/subject-enrollments/'.$id)->assertOk();
        $this->postJson('/api/subject-enrollments', $other)->assertCreated();
    }

    public function test_invalid_offering_archived_term_and_admin_enrollment_are_rejected(): void
    {
        $archived = $this->offering(Term::factory()->create());
        $active = $this->offering(Term::factory()->active()->create());
        $this->postJson('/api/subject-enrollments', $active)->assertUnauthorized();
        $this->actingAs(User::factory()->create())->postJson('/api/subject-enrollments', $archived)->assertUnprocessable();
        $this->postJson('/api/subject-enrollments', ['block_id' => $active['block_id'], 'subject_id' => $archived['subject_id']])->assertUnprocessable();
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/subject-enrollments', $active)->assertForbidden();
    }

    public function test_rollover_preserves_history_but_empties_current_ledger(): void
    {
        $term = Term::factory()->active()->create();
        $offering = $this->offering($term);
        $this->actingAs(User::factory()->create())->joinApprovedBlock($offering['block_id'], 'irregular');
        $this->postJson('/api/subject-enrollments', $offering)->assertCreated();
        $term->forceFill(['is_active' => false])->save();
        $this->getJson('/api/subject-enrollments/mine')->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseCount('subject_enrollments', 1);
        $next = $this->offering(Term::factory()->active()->create(), Subject::findOrFail($offering['subject_id']));
        $this->joinApprovedBlock($next['block_id'], 'irregular');
        $this->postJson('/api/subject-enrollments', $next)->assertCreated();
    }

    public function test_enrollment_grants_only_matching_subject_access_and_withdrawal_revokes_it(): void
    {
        $term = Term::factory()->active()->create();
        $offering = $this->offering($term);
        $block = Block::findOrFail($offering['block_id']);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $other = Subject::create(['code' => 'OTHER', 'name' => 'Other Subject']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $other->id]);
        $task = Task::create(['block_id' => $block->id, 'subject_id' => $offering['subject_id'],
            'title' => 'Enrolled task', 'due_date' => now()->addDay(), 'created_by' => $mayor->id]);
        $hidden = Task::create(['block_id' => $block->id, 'subject_id' => $other->id,
            'title' => 'Unrelated task', 'due_date' => now()->addDay(), 'created_by' => $mayor->id]);
        Announcement::create(['block_id' => $block->id, 'title' => 'Block notice', 'description' => 'Welcome', 'created_by' => $mayor->id]);
        foreach ([$offering['subject_id'], $other->id] as $subjectId) {
            CalendarEvent::create(['block_id' => $block->id, 'subject_id' => $subjectId,
                'title' => 'Class event', 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour(), 'created_by' => $mayor->id]);
        }
        $student = User::factory()->create();
        $this->actingAs($student)->joinApprovedBlock($block->id, 'irregular');
        $id = $this->actingAs($student)->postJson('/api/subject-enrollments', $offering)->assertCreated()->json('data.id');
        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $task->id);
        $this->postJson('/api/tasks/'.$task->id.'/complete')->assertOk();
        $this->postJson('/api/tasks/'.$hidden->id.'/complete')->assertForbidden();
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/calendar?'.http_build_query(['from' => now()->toIso8601String(), 'to' => now()->addDays(2)->toIso8601String()]))
            ->assertOk()->assertJsonCount(2, 'data');
        $this->postJson('/api/concerns', ['block_id' => $block->id, 'subject_id' => $offering['subject_id'],
            'title' => 'Question', 'description' => 'Help', 'category' => 'schedule'])->assertCreated();
        $this->postJson('/api/concerns', ['block_id' => $block->id, 'subject_id' => $other->id,
            'title' => 'Question', 'description' => 'Help', 'category' => 'schedule'])->assertUnprocessable();
        $this->getJson('/api/me')->assertJsonPath('data.enrollment_count', 1);
        $this->deleteJson('/api/subject-enrollments/'.$id)->assertOk();
        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/tasks/'.$task->id.'/complete')->assertForbidden();
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_enrolled_members_are_counted_once_and_subject_removal_is_guarded(): void
    {
        $term = Term::factory()->active()->create();
        $offering = $this->offering($term);
        $block = Block::findOrFail($offering['block_id']);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->student($block)->create();
        $irregular = User::factory()->create();
        $this->actingAs($irregular)->joinApprovedBlock($block->id, 'irregular');
        $this->actingAs($student)->postJson('/api/subject-enrollments', $offering)->assertCreated();
        $this->actingAs($irregular)->postJson('/api/subject-enrollments', $offering)->assertCreated();
        $this->actingAs($mayor)->getJson('/api/blocks/'.$block->id.'/members')->assertOk()->assertJsonCount(3, 'data');
        $this->getJson('/api/blocks/'.$block->id)->assertJsonPath('data.member_count', 3);
        $this->putJson('/api/blocks/'.$block->id.'/subjects', ['subject_ids' => []])->assertForbidden();
        $this->deleteJson('/api/blocks/'.$block->id.'/members/'.$irregular->id)->assertOk();
        $this->assertDatabaseMissing('subject_enrollments', ['user_id' => $irregular->id, 'block_id' => $block->id]);
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->assertSame($mayor->id, $block->fresh()->mayor_id);
    }

    public function test_new_tasks_assign_enrolled_students_only_for_the_matching_subject(): void
    {
        $term = Term::factory()->active()->create();
        $offering = $this->offering($term);
        $block = Block::findOrFail($offering['block_id']);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->create();
        $this->actingAs($student)->joinApprovedBlock($block->id, 'irregular');
        $this->actingAs($student)->postJson('/api/subject-enrollments', $offering)->assertCreated();
        $other = Subject::create(['code' => 'OTHER', 'name' => 'Other Subject']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $other->id]);
        $this->actingAs($mayor)->postJson('/api/enrollment-profile/reconcile-mayor')->assertOk();
        $id = $this->postJson('/api/tasks', ['title' => 'For enrolled student',
            'subject_id' => $offering['subject_id'], 'due_date' => now()->addDay()->toDateTimeString()])->assertCreated()->json('data.id');
        $this->assertDatabaseHas('task_assignments', ['task_id' => $id, 'user_id' => $student->id]);
        $otherId = $this->postJson('/api/tasks', ['title' => 'For other subject',
            'subject_id' => $other->id, 'due_date' => now()->addDay()->toDateTimeString()])->assertCreated()->json('data.id');
        $this->assertDatabaseMissing('task_assignments', ['task_id' => $otherId, 'user_id' => $student->id]);
    }

    public function test_former_mayor_cannot_remove_archived_enrollments(): void
    {
        $term = Term::factory()->active()->create();
        $offering = $this->offering($term);
        $block = Block::findOrFail($offering['block_id']);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->create();
        $this->actingAs($student)->joinApprovedBlock($block->id, 'irregular');
        $id = $this->actingAs($student)->postJson('/api/subject-enrollments', $offering)->assertCreated()->json('data.id');
        $term->forceFill(['is_active' => false])->save();
        $this->actingAs($mayor)->deleteJson('/api/blocks/'.$block->id.'/members/'.$student->id)->assertUnprocessable();
        $this->assertDatabaseHas('subject_enrollments', ['id' => $id]);
        $this->actingAs($student)->deleteJson('/api/subject-enrollments/'.$id)->assertUnprocessable();
    }
}
