<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Block;
use App\Models\Concern;
use App\Models\MayorApplication;
use App\Models\Task;
use App\Models\Term;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ModelFactoryTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('modelsWithFactories')]
    public function test_factory_creates_a_model_with_required_relationships(string $model): void
    {
        $record = $model::factory()->create();

        $this->assertTrue($record->exists);
        $this->assertDatabaseHas($record->getTable(), ['id' => $record->id]);
    }

    public static function modelsWithFactories(): array
    {
        return [
            'term' => [Term::class],
            'block' => [Block::class],
            'task' => [Task::class],
            'concern' => [Concern::class],
            'mayor application' => [MayorApplication::class],
            'announcement' => [Announcement::class],
        ];
    }

    public function test_active_term_factory_state_is_persisted(): void
    {
        $term = Term::factory()->active()->create();

        $this->assertTrue($term->fresh()->is_active);
        $this->assertDatabaseHas('terms', ['id' => $term->id, 'is_active' => true]);
    }
}
