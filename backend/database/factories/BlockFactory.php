<?php

namespace Database\Factories;

use App\Models\Block;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Block>
 */
class BlockFactory extends Factory
{
    protected $model = Block::class;

    public function definition(): array
    {
        return [
            'program' => fake()->randomElement(['BSIT', 'BSCS', 'BSED', 'BSN', 'BSBA']),
            'year_level' => fake()->numberBetween(1, 4),
            'block_number' => fake()->numberBetween(1, 6),
            'mayor_id' => null,
        ];
    }
}
