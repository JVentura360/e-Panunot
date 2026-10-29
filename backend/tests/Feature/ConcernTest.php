<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Concern;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConcernTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeBlockWithMayorAndStudent(): array
    {
        $term    = Term::factory()->active()->create();
        $block   = Block::factory()->create(['term_id' => $term->id]);
        $mayor   = User::factory()->student($block)->create();
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->student($block)->create();

        return [$block, $mayor, $student];
    }

    // ── Student can submit a concern ─────────────────────────────────────────

    public function test_student_can_submit_concern(): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $payload = [
            'title'       => 'Issue with lab schedule',
            'category'    => 'schedule',
            'description' => 'The lab session overlaps with my other subject.',
        ];

        $response = $this->actingAs($student)
            ->postJson("/api/blocks/{$block->id}/concerns", $payload);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'title'    => 'Issue with lab schedule',
                'category' => 'schedule',
                'status'   => 'open',
            ]);

        $this->assertDatabaseHas('concerns', [
            'block_id'   => $block->id,
            'student_id' => $student->id,
            'status'     => 'open',
        ]);
    }

    // ── Validation: category must be a valid enum ─────────────────────────────

    public function test_concern_rejects_invalid_category(): void
    {
        [$block, , $student] = $this->makeBlockWithMayorAndStudent();

        $response = $this->actingAs($student)
            ->postJson("/api/blocks/{$block->id}/concerns", [
                'title'       => 'Test',
                'category'    => 'invalid_category',
                'description' => 'Some description.',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    // ── Validation: description is required ──────────────────────────────────

    public function test_concern_rejects_missing_description(): void
    {
        [$block, , $student] = $this->makeBlockWithMayorAndStudent();

        $response = $this->actingAs($student)
            ->postJson("/api/blocks/{$block->id}/concerns", [
                'title'    => 'Missing description',
                'category' => 'academic',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    // ── Mayor can update concern status ──────────────────────────────────────

    public function test_mayor_can_update_concern_status(): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $concern = Concern::factory()->create([
            'block_id'   => $block->id,
            'student_id' => $student->id,
            'status'     => 'open',
        ]);

        $response = $this->actingAs($mayor)
            ->patchJson("/api/concerns/{$concern->id}", [
                'status' => 'in_progress',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'in_progress']);

        $this->assertDatabaseHas('concerns', [
            'id'     => $concern->id,
            'status' => 'in_progress',
        ]);
    }

    // ── Student cannot update concern status ─────────────────────────────────

    public function test_student_cannot_update_concern_status(): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $concern = Concern::factory()->create([
            'block_id'   => $block->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($student)
            ->patchJson("/api/concerns/{$concern->id}", ['status' => 'resolved'])
            ->assertStatus(403);
    }

    // ── Student cannot view another block's concerns ──────────────────────────

    public function test_student_cannot_view_concerns_from_another_block(): void
    {
        [$block, , $student] = $this->makeBlockWithMayorAndStudent();

        $otherTerm  = Term::factory()->create();
        $otherBlock = Block::factory()->create(['term_id' => $otherTerm->id]);

        $concern = Concern::factory()->create([
            'block_id'   => $otherBlock->id,
            'student_id' => User::factory()->student($otherBlock)->create()->id,
        ]);

        $this->actingAs($student)
            ->getJson("/api/concerns/{$concern->id}")
            ->assertStatus(403);
    }

    // ── Valid status transitions ──────────────────────────────────────────────

    /**
     * @dataProvider validStatusProvider
     */
    public function test_mayor_can_set_all_valid_statuses(string $status): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $concern = Concern::factory()->create([
            'block_id'   => $block->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($mayor)
            ->patchJson("/api/concerns/{$concern->id}", ['status' => $status])
            ->assertStatus(200)
            ->assertJsonFragment(['status' => $status]);
    }

    public static function validStatusProvider(): array
    {
        return [
            'in_progress' => ['in_progress'],
            'resolved'    => ['resolved'],
            'closed'      => ['closed'],
        ];
    }
}
