<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Concern;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ConcernTest extends TestCase
{
    use RefreshDatabase;

    public function test_concern_images_allow_five_mb_and_protect_downloads(): void
    {
        Storage::fake('local');
        [, $mayor, $student] = $this->makeBlockWithMayorAndStudent();
        $files = array_map(fn (string $extension) => UploadedFile::fake()->create('evidence.'.$extension, 5120, $extension === 'png' ? 'image/png' : 'image/jpeg'), ['png', 'jpg', 'jpeg']);
        $response = $this->actingAs($student)->postJson('/api/concerns', [
            'title' => 'Schedule evidence', 'category' => 'schedule', 'description' => 'Attached screenshots.', 'attachments' => $files,
        ])->assertCreated()->assertJsonCount(3, 'data.attachments');
        $attachment = \App\Models\ConcernAttachment::firstOrFail();
        Storage::disk('local')->assertExists($attachment->file_path);
        $this->get('/api/attachments/'.$attachment->id)->assertOk();
        $this->actingAs($mayor)->get('/api/attachments/'.$attachment->id)->assertOk();
        $this->actingAs(User::factory()->create())->get('/api/attachments/'.$attachment->id)->assertForbidden();
    }

    public function test_concern_rejects_oversized_non_image_and_excess_attachments(): void
    {
        Storage::fake('local');
        [, , $student] = $this->makeBlockWithMayorAndStudent();
        $payload = ['title' => 'Evidence', 'category' => 'schedule', 'description' => 'Details.'];
        foreach ([UploadedFile::fake()->create('large.png', 5121, 'image/png'),
            UploadedFile::fake()->create('document.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->create('pretend.jpg', 10, 'application/pdf')] as $file) {
            $this->actingAs($student)->postJson('/api/concerns', $payload + ['attachments' => [$file]])
                ->assertUnprocessable()->assertJsonValidationErrors('attachments.0');
        }
        $files = array_map(fn (int $id) => UploadedFile::fake()->create('image'.$id.'.png', 10, 'image/png'), range(1, 6));
        $this->postJson('/api/concerns', $payload + ['attachments' => $files])->assertUnprocessable()->assertJsonValidationErrors('attachments');
        $this->assertDatabaseCount('concerns', 0);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeBlockWithMayorAndStudent(): array
    {
        $term    = Term::factory()->active()->create();
        $block   = Block::factory()->create(['term_id' => $term->id]);
        $mayor   = User::factory()->student($block)->create(['role' => 'mayor']);
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
            ->postJson('/api/concerns', $payload);

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
            ->postJson('/api/concerns', [
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
            ->postJson('/api/concerns', [
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
            ->patchJson("/api/concerns/{$concern->id}/status", [
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

    public function test_only_the_student_owner_can_resolve_the_concern(): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $concern = Concern::factory()->create([
            'block_id'   => $block->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($mayor)->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'resolved'])->assertForbidden();
        $this->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'closed'])->assertForbidden();
        $this->actingAs(User::factory()->student($block)->create())->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'resolved'])->assertForbidden();
        $this->actingAs($student)->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'resolved'])->assertOk()->assertJsonPath('data.status', 'resolved');
        $this->actingAs($mayor)->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'in_progress'])->assertForbidden();
        $this->actingAs($student)->patchJson("/api/concerns/{$concern->id}/status", ['status' => 'in_progress'])->assertOk();
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
            ->getJson("/api/concerns/{$concern->id}/messages")
            ->assertStatus(403);
    }

    // ── Valid status transitions ──────────────────────────────────────────────

    #[\PHPUnit\Framework\Attributes\DataProvider('validStatusProvider')]
    public function test_student_owner_can_set_completion_statuses(string $status): void
    {
        [$block, $mayor, $student] = $this->makeBlockWithMayorAndStudent();

        $concern = Concern::factory()->create([
            'block_id'   => $block->id,
            'student_id' => $student->id,
        ]);

        $this->actingAs($student)
            ->patchJson("/api/concerns/{$concern->id}/status", ['status' => $status])
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
