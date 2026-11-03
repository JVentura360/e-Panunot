<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminBlockMembersTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_roster_includes_primary_members_and_cross_block_subject_students_only(): void
    {
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $other = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $primary = User::factory()->student($block)->create();
        $irregular = User::factory()->student($other)->create();
        $unrelated = User::factory()->student($other)->create();
        $subject = Subject::create(['code' => 'ITE301', 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        DB::table('subject_enrollments')->insert(['user_id' => $irregular->id, 'term_id' => $term->id,
            'block_id' => $block->id, 'subject_id' => $subject->id, 'created_at' => now(), 'updated_at' => now()]);
        $response = $this->actingAs(User::factory()->admin()->create())->getJson('/api/blocks/'.$block->id.'/members')
            ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('data.0.id', $mayor->id)->assertJsonPath('data.0.is_mayor', true);
        $this->assertEqualsCanonicalizing([$mayor->id, $primary->id, $irregular->id], array_column($response->json('data'), 'id'));
        $this->actingAs($unrelated)->getJson('/api/blocks/'.$block->id.'/members')->assertForbidden();
    }
}
