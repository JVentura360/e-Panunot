<?php

namespace Database\Factories;

use App\Models\MayorApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MayorApplication>
 */
class MayorApplicationFactory extends Factory
{
    protected $model = MayorApplication::class;

    public function definition(): array
    {
        return [
            'user_id' => UserFactory::new(),
            'program' => fake()->randomElement(['BSIT', 'BSCS', 'BSED', 'BSN']),
            'year_level' => fake()->numberBetween(1, 4),
            'block_number' => fake()->numberBetween(1, 6),
            'block_id' => null,
            'motivation' => fake()->optional(0.8)->paragraph(),
            'status' => 'pending',
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }

    public function approved(User $reviewer): static
    {
        return $this->state([
            'status' => 'approved',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(User $reviewer): static
    {
        return $this->state([
            'status' => 'rejected',
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);
    }
}
