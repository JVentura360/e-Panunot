<?php

namespace Database\Factories;

use App\Models\Block;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'google_id'   => fake()->unique()->numerify('####################'),
            'name'        => fake()->name(),
            'email'       => fake()->unique()->safeEmail(),
            'role'        => 'student',
            'picture_url' => fake()->imageUrl(100, 100, 'people'),
            'block_id'    => null,
        ];
    }

    /** Student belonging to a specific block. */
    public function student(Block $block): static
    {
        return $this->state([
            'role'     => 'student',
            'block_id' => $block->id,
        ]);
    }

    /** Admin account (no block assignment). */
    public function admin(): static
    {
        return $this->state([
            'role'     => 'admin',
            'block_id' => null,
        ]);
    }
}
