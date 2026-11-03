<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Concern;
use App\Models\ConcernAttachment;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConcernMembershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_unjoined_students_cannot_list_create_or_open_conversations(): void
    {
        $student = User::factory()->create();
        $concern = Concern::factory()->create(['student_id' => $student->id]);
        $this->actingAs($student)->getJson('/api/concerns')->assertForbidden();
        $this->postJson('/api/concerns', ['title' => 'Question', 'description' => 'Details', 'category' => 'other', 'block_id' => $concern->block_id])->assertForbidden();
        $this->getJson('/api/concerns/'.$concern->id.'/messages')->assertForbidden();
    }

    public function test_removed_students_lose_conversations_but_mayor_keeps_a_resolved_record(): void
    {
        Queue::fake();
        Storage::fake('local');
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->student($block)->create();
        $concern = Concern::factory()->create(['student_id' => $student->id, 'block_id' => $block->id, 'status' => 'in_progress']);
        $other = Block::factory()->create(['term_id' => $term->id]);
        $unrelated = Concern::factory()->create(['student_id' => $student->id, 'block_id' => $other->id, 'status' => 'open']);
        Storage::disk('local')->put('concerns/evidence.png', 'image');
        $attachment = ConcernAttachment::create(['concern_id' => $concern->id, 'file_path' => 'concerns/evidence.png',
            'original_name' => 'evidence.png', 'mime_type' => 'image/png', 'size_bytes' => 5]);
        $student->notifications()->create(['id' => (string) \Illuminate\Support\Str::uuid(), 'type' => 'concern_reply',
            'data' => ['concern_id' => $concern->id, 'title' => 'Reply', 'link' => '/concerns/'.$concern->id]]);
        $this->actingAs($mayor)->deleteJson('/api/blocks/'.$block->id.'/members/'.$student->id)->assertOk();
        $this->getJson('/api/concerns')->assertJsonPath('data.0.status', 'resolved')->assertJsonPath('data.0.closed_due_to_removal', true);
        $this->getJson('/api/concerns/'.$concern->id.'/messages')->assertOk();
        $this->get('/api/attachments/'.$attachment->id)->assertOk();
        $this->patchJson('/api/concerns/'.$concern->id.'/status', ['status' => 'in_progress'])->assertUnprocessable();
        $this->assertSame('open', $unrelated->fresh()->status->value);
        $this->actingAs($student->fresh())->getJson('/api/concerns')->assertForbidden();
        $this->actingAs($student)->postJson('/api/concerns', ['title' => 'Stale membership', 'description' => 'Details',
            'category' => 'other', 'block_id' => $block->id])->assertForbidden();
        $student->update(['block_id' => $other->id]);
        $this->actingAs($student->fresh())->getJson('/api/concerns')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $unrelated->id);
        $this->postJson('/api/concerns', ['title' => 'Old block', 'description' => 'Cannot file here.', 'category' => 'other', 'block_id' => $block->id])->assertForbidden();
        $this->getJson('/api/concerns/'.$concern->id.'/messages')->assertForbidden();
        $this->postJson('/api/concerns/'.$concern->id.'/messages', ['message_text' => 'Reply'])->assertForbidden();
        $this->get('/api/attachments/'.$attachment->id)->assertForbidden();
        $this->getJson('/api/notifications')->assertJsonCount(0, 'data')->assertJsonPath('unread_count', 0);
    }

    public function test_status_write_reloads_a_concern_bound_before_removal(): void
    {
        Queue::fake();
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->student($block)->create();
        $staleConcern = Concern::factory()->create(['student_id' => $student->id, 'block_id' => $block->id]);
        $this->actingAs($mayor)->deleteJson('/api/blocks/'.$block->id.'/members/'.$student->id)->assertOk();
        $request = \Illuminate\Http\Request::create('/api/concerns/'.$staleConcern->id.'/status', 'PATCH', ['status' => 'in_progress']);
        $request->setUserResolver(fn () => $mayor);
        try {
            app(\App\Http\Controllers\ConcernController::class)->updateStatus($request, $staleConcern);
            $this->fail('A stale concern must not reopen after removal.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $error) {
            $this->assertSame(422, $error->getStatusCode());
        }
        $this->assertSame('resolved', $staleConcern->fresh()->status->value);
    }

    public function test_resolved_concerns_reject_replies_from_both_student_and_mayor(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $student = User::factory()->student($block)->create();
        $concern = Concern::factory()->create(['student_id' => $student->id, 'block_id' => $block->id, 'status' => 'resolved']);
        foreach ([$student, $mayor] as $user) {
            $this->actingAs($user)->postJson('/api/concerns/'.$concern->id.'/messages', ['message_text' => 'Should not send'])->assertUnprocessable();
        }
        $this->assertDatabaseCount('conversation_messages', 0);
    }

    public function test_existing_removal_records_are_relabelled_without_changing_ordinary_closed_concerns(): void
    {
        $removed = Concern::factory()->closed()->create();
        $ordinary = Concern::factory()->closed()->create();
        \Illuminate\Support\Facades\DB::table('concerns')->where('id', $removed->id)->update(['student_removed_at' => now()]);
        $migration = require database_path('migrations/2026_11_03_090437_resolve_previously_removed_concerns.php');
        $migration->up();
        $this->assertSame('resolved', $removed->fresh()->status->value);
        $this->assertSame('closed', $ordinary->fresh()->status->value);
    }
}
