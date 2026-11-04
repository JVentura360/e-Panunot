<?php

namespace Tests\Feature;

use App\Models\{Block, Subject, Term, User};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BlockJoinApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function block(): Block
    {
        Queue::fake();
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $subject = Subject::create(['code' => 'ITE301', 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        return $block;
    }

    public function test_join_waits_for_approval_without_membership_enrollment_or_class_access(): void
    {
        $block = $this->block();
        $student = User::factory()->create();
        \App\Models\Task::factory()->forBlock($block, User::findOrFail($block->mayor_id))->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])
            ->assertOk()->assertJsonPath('data.pending_join_request.status', 'pending');
        $this->assertNull($student->fresh()->block_id);
        $this->assertDatabaseCount('subject_enrollments', 0);
        $this->assertDatabaseCount('student_term_profiles', 0);
        $this->getJson('/api/tasks')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/subject-enrollments/mine')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/me')->assertJsonPath('data.block_id', null)->assertJsonPath('data.pending_join_request.block_id', $block->id)
            ->assertJsonPath('data.can_apply_as_mayor', false);
        $this->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'regular'])->assertUnprocessable();
        $this->putJson('/api/enrollment-profile', ['student_type' => 'irregular'])->assertUnprocessable();
        $this->postJson('/api/subject-enrollments', ['block_id' => $block->id, 'subject_id' => Subject::first()->id, 'student_type' => 'irregular'])->assertUnprocessable();
        $this->actingAs(User::findOrFail($block->mayor_id))->getJson('/api/blocks/'.$block->id.'/members')->assertJsonCount(1, 'data');
        $this->getJson('/api/blocks/'.$block->id.'/join-requests?status=pending')->assertJsonCount(1, 'data')->assertJsonPath('data.0.student_type', 'regular');
    }

    public function test_mayor_approval_initializes_regular_membership_and_is_not_repeatable(): void
    {
        $block = $this->block();
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])->assertOk();
        $id = DB::table('block_join_requests')->value('id');
        $this->actingAs(User::factory()->create())->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertForbidden();
        $this->actingAs(User::findOrFail($block->mayor_id))->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertOk();
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->assertDatabaseHas('student_term_profiles', ['user_id' => $student->id, 'student_type' => 'regular']);
        $this->assertDatabaseCount('subject_enrollments', 1);
        $this->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertUnprocessable();
        $this->assertDatabaseCount('subject_enrollments', 1);
        $this->actingAs($student->fresh())->getJson('/api/me')->assertJsonPath('data.pending_join_request', null);
    }

    public function test_irregular_approval_sets_primary_block_before_subject_selection(): void
    {
        $block = $this->block();
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'irregular'])->assertOk();
        $id = DB::table('block_join_requests')->value('id');
        $this->actingAs(User::findOrFail($block->mayor_id))->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertOk();
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->assertDatabaseCount('subject_enrollments', 0);
        $this->actingAs($student->fresh())->postJson('/api/subject-enrollments', ['block_id' => $block->id, 'subject_id' => Subject::first()->id, 'student_type' => 'irregular'])->assertCreated();
    }

    public function test_pending_requests_are_unique_cancelable_and_rejection_does_not_enroll(): void
    {
        $block = $this->block();
        $student = User::factory()->create();
        $this->actingAs($student);
        $this->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])->assertOk();
        $this->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])->assertOk();
        $this->assertDatabaseCount('block_join_requests', 1);
        $id = DB::table('block_join_requests')->value('id');
        $this->deleteJson('/api/join-requests/'.$id)->assertOk();
        $this->getJson('/api/enrollment-profile')->assertJsonPath('data.pending_join_request', null);
        $this->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'irregular'])->assertOk();
        $id = DB::table('block_join_requests')->value('id');
        $this->actingAs(User::findOrFail($block->mayor_id))->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/reject')->assertOk();
        $this->assertNull($student->fresh()->block_id);
        $this->assertDatabaseCount('subject_enrollments', 0);
    }

    public function test_pending_status_cannot_change_and_archived_requests_cannot_be_approved(): void
    {
        $block = $this->block();
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])->assertOk();
        $id = DB::table('block_join_requests')->value('id');
        $this->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'irregular'])->assertUnprocessable();
        Term::whereKey($block->term_id)->update(['is_active' => false]);
        $this->actingAs(User::findOrFail($block->mayor_id))->postJson('/api/blocks/'.$block->id.'/join-requests/'.$id.'/approve')->assertUnprocessable();
        $this->assertDatabaseHas('block_join_requests', ['id' => $id, 'status' => 'pending', 'student_type' => 'regular']);
        $this->assertNull($student->fresh()->block_id);
        $this->assertDatabaseCount('subject_enrollments', 0);
    }
}
