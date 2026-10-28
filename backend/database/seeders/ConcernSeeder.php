<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\User;
use Database\Factories\ConcernFactory;
use Illuminate\Database\Seeder;

class ConcernSeeder extends Seeder
{
    public function run(): void
    {
        Block::all()->each(function (Block $block) {
            $students = User::where('block_id', $block->id)
                ->where('id', '!=', $block->mayor_id)
                ->get();

            if ($students->isEmpty()) {
                return;
            }

            // 2 open concerns
            ConcernFactory::new()->count(2)->create([
                'block_id' => $block->id,
                'student_id' => $students->random()->id,
            ]);

            // 1 in-progress
            ConcernFactory::new()->inProgress()->create([
                'block_id' => $block->id,
                'student_id' => $students->random()->id,
            ]);

            // 1 resolved
            ConcernFactory::new()->resolved()->create([
                'block_id' => $block->id,
                'student_id' => $students->random()->id,
            ]);
        });
    }
}
