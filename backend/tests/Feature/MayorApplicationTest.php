<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\MayorApplication;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MayorApplicationTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeActiveTerm(): Term
    {
        return Term::factory()->active()->create();
    }

    private function makeStudentWithBlock(Term $term): array
    {
        $block   = Block::factory()->create(['term_id' => $term->id]);
        $student = User::factory()->student($block)->create();

        return [$block, $student];
    }

    // ── Student can apply as mayor ────────────────────────────────────────────

    public function test_student_can_apply_as_mayor(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);

        $payload = [
            'term_id'      => $term->id,
            'program'      => $block->program,
            'year_level'   => $block->year_level,
            'block_number' => $block->block_number,
            'motivation'   => 'I want to help my block succeed this semester.',
        ];

        $response = $this->actingAs($student)
            ->postJson('/api/mayor-applications', $payload);

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'pending']);

        $this->assertDatabaseHas('mayor_applications', [
            'user_id' => $student->id,
            'term_id' => $term->id,
            'status'  => 'pending',
        ]);
    }

    // ── Duplicate application is rejected ────────────────────────────────────

    public function test_student_cannot_apply_twice_for_same_term(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);

        $payload = [
            'term_id'      => $term->id,
            'program'      => $block->program,
            'year_level'   => $block->year_level,
            'block_number' => $block->block_number,
            'motivation'   => 'First application.',
        ];

        $this->actingAs($student)->postJson('/api/mayor-applications', $payload);

        // Second attempt for the same term
        $this->actingAs($student)
            ->postJson('/api/mayor-applications', array_merge($payload, [
                'motivation' => 'Second application.',
            ]))
            ->assertStatus(422);
    }

    // ── Admin can approve an application ─────────────────────────────────────

    public function test_admin_can_approve_mayor_application(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);
        $admin = User::factory()->admin()->create();

        $application = MayorApplication::factory()->create([
            'term_id'      => $term->id,
            'user_id'      => $student->id,
            'program'      => $block->program,
            'year_level'   => $block->year_level,
            'block_number' => $block->block_number,
            'status'       => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/mayor-applications/{$application->id}/approve", [
                'status' => 'approved',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'approved']);

        $this->assertDatabaseHas('mayor_applications', [
            'id'          => $application->id,
            'status'      => 'approved',
            'reviewed_by' => $admin->id,
        ]);
    }

    // ── Admin can reject an application ──────────────────────────────────────

    public function test_admin_can_reject_mayor_application(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);
        $admin = User::factory()->admin()->create();

        $application = MayorApplication::factory()->create([
            'term_id'      => $term->id,
            'user_id'      => $student->id,
            'program'      => $block->program,
            'year_level'   => $block->year_level,
            'block_number' => $block->block_number,
            'status'       => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/mayor-applications/{$application->id}/reject", [
                'status' => 'rejected',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'rejected']);
    }

    // ── Student cannot review applications ───────────────────────────────────

    public function test_student_cannot_review_applications(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);

        $application = MayorApplication::factory()->create([
            'term_id'      => $term->id,
            'user_id'      => $student->id,
            'program'      => $block->program,
            'year_level'   => $block->year_level,
            'block_number' => $block->block_number,
            'status'       => 'pending',
        ]);

        $this->actingAs($student)
            ->postJson("/api/admin/mayor-applications/{$application->id}/approve", [
                'status' => 'approved',
            ])
            ->assertStatus(403);
    }

    // ── Motivation field is optional ─────────────────────────────────────────

    public function test_application_succeeds_without_motivation(): void
    {
        $term = $this->makeActiveTerm();
        [$block, $student] = $this->makeStudentWithBlock($term);

        $response = $this->actingAs($student)
            ->postJson('/api/mayor-applications', [
                'term_id'      => $term->id,
                'program'      => $block->program,
                'year_level'   => $block->year_level,
                'block_number' => $block->block_number,
            ]);

        $response->assertStatus(201);
    }

    // ── Unauthenticated request is rejected ───────────────────────────────────

    public function test_unauthenticated_user_cannot_apply(): void
    {
        $term = $this->makeActiveTerm();

        $this->postJson('/api/mayor-applications', [
            'term_id'      => $term->id,
            'program'      => 'BSIT',
            'year_level'   => 2,
            'block_number' => 1,
        ])->assertStatus(401);
    }
}
