<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\MayorApplication;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MayorRegularEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    private function application(Term $term, User $student, array $extra = []): MayorApplication
    {
        return MayorApplication::factory()->create(array_replace(['term_id' => $term->id, 'user_id' => $student->id,
            'program' => 'ITE', 'year_level' => 3, 'block_number' => 4, 'is_regular_student' => true,
            'proposed_subjects' => [['code' => 'ITE301', 'name' => 'Database Systems']]], $extra));
    }

    public function test_application_requires_regular_declaration_and_unjoined_student(): void
    {
        $term = Term::factory()->active()->create();
        $data = ['program' => 'ITE', 'year_level' => 3, 'block_number' => 4,
            'proposed_subjects' => [['code' => 'ITE301', 'name' => 'Database Systems']]];
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/mayor-applications', $data)->assertUnprocessable();
        $this->postJson('/api/mayor-applications', $data + ['is_regular_student' => false])->assertUnprocessable();
        $this->putJson('/api/enrollment-profile', ['student_type' => 'irregular'])->assertOk();
        $this->postJson('/api/mayor-applications', $data + ['is_regular_student' => true])->assertForbidden();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $this->actingAs(User::factory()->student($block)->create())->postJson('/api/mayor-applications', $data + ['is_regular_student' => true])->assertForbidden();
    }

    public function test_approval_makes_mayor_regular_and_enrolls_the_full_load(): void
    {
        $term = Term::factory()->active()->create();
        $student = User::factory()->create();
        $application = $this->application($term, $student);
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0])->assertOk();
        $this->assertDatabaseHas('student_term_profiles', ['user_id' => $student->id, 'student_type' => 'regular', 'regular_block_id' => $student->fresh()->block_id]);
        $this->assertDatabaseHas('subject_enrollments', ['user_id' => $student->id, 'block_id' => $student->fresh()->block_id]);
        $this->actingAs($student->fresh())->getJson('/api/me')->assertJsonPath('data.student_type', 'regular')->assertJsonPath('data.mayor_needs_reconciliation', false);
    }

    public function test_existing_membership_blocks_stale_application_approval_without_side_effects(): void
    {
        $term = Term::factory()->active()->create();
        $student = User::factory()->create();
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $subject = Subject::create(['code' => 'ITE301', 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        $this->actingAs($student)->joinApprovedBlock($block->id, 'regular');
        $application = $this->application($term, $student);
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0])->assertUnprocessable();
        $this->assertDatabaseCount('blocks', 1);
        $this->assertDatabaseCount('subject_loads', 0);
        $this->assertSame('student', $student->fresh()->role->value);
        $this->assertDatabaseHas('mayor_applications', ['id' => $application->id, 'status' => 'pending']);
    }

    public function test_new_load_subjects_enroll_regular_members_and_mayors_but_not_irregular_students(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $admin = User::factory()->admin()->create();
        $base = ['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'expected_revision' => 0,
            'subjects' => [['code' => 'ITE301', 'name' => 'Database Systems']]];
        $this->actingAs($admin)->putJson('/api/admin/subject-loads/current', $base)->assertOk();
        $regular = User::factory()->create();
        $irregular = User::factory()->create();
        $this->actingAs($regular)->joinApprovedBlock($block->id, 'regular');
        $subjectId = Subject::where('code', 'ITE301')->value('id');
        $this->actingAs($irregular)->joinApprovedBlock($block->id, 'irregular');
        $this->actingAs($irregular)->postJson('/api/blocks/'.$block->id.'/enrollment', ['student_type' => 'irregular', 'subject_ids' => [$subjectId]])->assertOk();
        DB::table('subject_enrollments')->where('user_id', $regular->id)->where('subject_id', $subjectId)->delete();
        $base['expected_revision'] = 1;
        $base['subjects'][] = ['code' => 'ITE302', 'name' => 'Systems Integration'];
        $this->actingAs($admin)->putJson('/api/admin/subject-loads/current', $base)->assertOk();
        $newId = Subject::where('code', 'ITE302')->value('id');
        foreach ([$regular, $mayor] as $member) {
            $this->assertDatabaseHas('subject_enrollments', ['user_id' => $member->id, 'subject_id' => $newId]);
        }
        $this->assertDatabaseMissing('subject_enrollments', ['user_id' => $irregular->id, 'subject_id' => $newId]);
        $this->assertDatabaseMissing('subject_enrollments', ['user_id' => $regular->id, 'subject_id' => $subjectId]);
        $mayorEnrollment = DB::table('subject_enrollments')->where('user_id', $mayor->id)->value('id');
        $this->actingAs($mayor)->deleteJson('/api/subject-enrollments/'.$mayorEnrollment)->assertOk();
        $this->getJson('/api/me')->assertJsonPath('data.role', 'mayor')->assertJsonPath('data.block_id', $block->id)
            ->assertJsonPath('data.mayor_needs_reconciliation', false);
        $this->postJson('/api/enrollment-profile/reconcile-mayor')->assertOk();
        $this->assertDatabaseMissing('subject_enrollments', ['id' => $mayorEnrollment]);
        $base['expected_revision'] = 2;
        $this->actingAs($admin)->putJson('/api/admin/subject-loads/current', $base)->assertOk();
        $this->assertSame(1, DB::table('subject_enrollments')->where('user_id', $mayor->id)->count());
        $this->actingAs($mayor)->postJson('/api/tasks', ['title' => 'Class report', 'all_subjects' => true,
            'due_date' => now()->addDay()->toDateTimeString()])->assertCreated();
    }

    public function test_legacy_mayor_reconciliation_and_legacy_application_confirmation_are_explicit(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'ITE', 'year_level' => 3, 'block_number' => 9]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $subject = Subject::create(['code' => 'ITE301', 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        $this->actingAs($mayor)->getJson('/api/enrollment-profile')->assertJsonPath('data.mayor_needs_reconciliation', true);
        $this->postJson('/api/enrollment-profile/reconcile-mayor')->assertOk();
        $this->getJson('/api/enrollment-profile')->assertJsonPath('data.mayor_needs_reconciliation', false);
        $candidate = User::factory()->create();
        $application = $this->application($term, $candidate, ['is_regular_student' => null]);
        $this->actingAs(User::factory()->admin()->create())->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0])->assertUnprocessable();
        $this->postJson('/api/admin/mayor-applications/'.$application->id.'/approve', ['expected_revision' => 0, 'confirm_regular_student' => true])->assertOk();
    }
}
