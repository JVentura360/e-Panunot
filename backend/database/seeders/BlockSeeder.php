<?php

namespace Database\Seeders;

use Database\Factories\BlockFactory;
use Illuminate\Database\Seeder;

class BlockSeeder extends Seeder
{
    public function run(): void
    {
        $blocks = [
            ['program' => 'BSIT', 'year_level' => 3, 'block_number' => 1],
            ['program' => 'BSIT', 'year_level' => 3, 'block_number' => 2],
            ['program' => 'BSCS', 'year_level' => 2, 'block_number' => 1],
            ['program' => 'BSED', 'year_level' => 1, 'block_number' => 1],
        ];

        foreach ($blocks as $data) {
            BlockFactory::new()->create([
                'program' => $data['program'],
                'year_level' => $data['year_level'],
                'block_number' => $data['block_number'],
                'mayor_id' => null, // assigned in UserSeeder after mayors exist
            ]);
        }
    }
}
