<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\Term;
use Illuminate\Database\Seeder;

class BlockSeeder extends Seeder
{
    public function run(): void
    {
        $activeTerm = Term::where('is_active', true)->firstOrFail();

        $blocks = [
            ['program' => 'BSIT', 'year_level' => 3, 'block_number' => 1],
            ['program' => 'BSIT', 'year_level' => 3, 'block_number' => 2],
            ['program' => 'BSCS', 'year_level' => 2, 'block_number' => 1],
            ['program' => 'BSED', 'year_level' => 1, 'block_number' => 1],
        ];

        foreach ($blocks as $data) {
            Block::factory()->create([
                'term_id'      => $activeTerm->id,
                'program'      => $data['program'],
                'year_level'   => $data['year_level'],
                'block_number' => $data['block_number'],
                'mayor_id'     => null, // assigned in UserSeeder after mayors exist
            ]);
        }
    }
}
