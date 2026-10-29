<?php

namespace Database\Factories;

use App\Models\Concern;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Concern>
 */
class ConcernFactory extends Factory
{
    protected $model = Concern::class;

    public function definition(): array
    {
        return [
            'block_id' => BlockFactory::new(),
            'student_id' => UserFactory::new(),
            'subject_id' => null,
            'title' => fake()->sentence(6),
            'category' => fake()->randomElement(['academic', 'schedule', 'other']),
            'description' => fake()->paragraph(),
            'status' => 'open',
            'student_unread' => false,
            'mayor_unread' => true,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(['status' => 'in_progress']);
    }

    public function resolved(): static
    {
        return $this->state([
            'status' => 'resolved',
            'student_unread' => true,
            'mayor_unread' => false,
        ]);
    }

    public function closed(): static
    {
        return $this->state(['status' => 'closed']);
    }
}
