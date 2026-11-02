<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubjectOfferingTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_can_browse_active_block_offerings_before_enrolling(): void
    {
        $block = Block::factory()->create(['term_id' => Term::factory()->active()->create()->id]);
        $subject = Subject::create(['code' => 'ITE301', 'name' => 'Database Systems']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        $this->getJson('/api/subjects?block_id='.$block->id)->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/subjects?block_id='.$block->id)
            ->assertOk()->assertJsonPath('data.0.id', $subject->id);
        $block->term()->update(['is_active' => false]);
        $this->getJson('/api/subjects?block_id='.$block->id)->assertForbidden();
    }
}
