<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolYearTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_term_resets_membership_and_preserves_history(): void
    {
        $old = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $block = Block::factory()->create(['term_id' => $old->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $student = User::factory()->student($block)->create();
        $block->update(['mayor_id' => $mayor->id]);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->putJson('/api/admin/terms/current', [
            'school_year' => '2027-2028', 'semester' => 1,
            'starts_on' => '2027-08-01', 'ends_on' => '2028-01-31',
            'previous_term_id' => $old->id,
        ])->assertOk()->assertJsonPath('data.school_year', '2027-2028');

        $this->assertFalse($old->fresh()->is_active);
        $this->assertNull($student->fresh()->block_id);
        $this->assertNull($mayor->fresh()->block_id);
        $this->assertSame('student', $mayor->fresh()->role->value);
        $this->assertDatabaseHas('blocks', ['id' => $block->id, 'term_id' => $old->id]);
        $this->getJson('/api/blocks')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/admin/terms/current')->assertJsonPath('data.school_year', '2027-2028');
    }

    public function test_only_admin_can_manage_current_term(): void
    {
        $this->getJson('/api/admin/terms/current')->assertUnauthorized();
        $this->actingAs(User::factory()->create())->putJson('/api/admin/terms/current', [])->assertForbidden();
    }

    public function test_invalid_year_or_dates_do_not_change_membership(): void
    {
        $old = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $block = Block::factory()->create(['term_id' => $old->id]);
        $student = User::factory()->student($block)->create();
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/terms/current', [
            'school_year' => '2027-2030', 'semester' => 1,
            'starts_on' => '2028-08-01', 'ends_on' => '2027-01-31',
            'previous_term_id' => $old->id,
        ])->assertUnprocessable();
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->assertTrue($old->fresh()->is_active);
    }

    public function test_stale_admin_form_cannot_replace_a_newer_term(): void
    {
        $old = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/terms/current', [
            'school_year' => '2027-2028', 'semester' => 1,
            'starts_on' => '2027-08-01', 'ends_on' => '2028-01-31',
            'previous_term_id' => $old->id + 100,
        ])->assertStatus(409);
        $this->assertTrue($old->fresh()->is_active);
    }

    public function test_editing_dates_in_same_term_keeps_memberships(): void
    {
        $term = Term::factory()->active()->create(['school_year' => '2026-2027']);
        $block = Block::factory()->create(['term_id' => $term->id]);
        $student = User::factory()->student($block)->create();
        $this->actingAs(User::factory()->admin()->create())->putJson('/api/admin/terms/current', [
            'school_year' => '2026-2027', 'semester' => 1,
            'starts_on' => '2026-08-03', 'ends_on' => '2027-01-30',
            'previous_term_id' => $term->id,
        ])->assertOk()->assertJsonPath('data.id', $term->id);
        $this->assertSame($block->id, $student->fresh()->block_id);
        $this->assertSame(1, Term::where('is_active', true)->count());
    }

    public function test_development_school_year_correction_preserves_block_ids(): void
    {
        $term = Term::factory()->active()->create(['school_year' => '2099-2100']);
        $block = Block::factory()->create(['term_id' => $term->id, 'program' => 'BSIT']);
        $this->app->instance('env', 'local');
        (new \Database\Seeders\CurrentSchoolYearSeeder)->run();
        $this->assertSame('2026-2027', $term->fresh()->school_year);
        $this->assertSame($term->id, $block->fresh()->term_id);
    }
}
