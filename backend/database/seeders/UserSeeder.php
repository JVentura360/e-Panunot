<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // One known admin account
        User::factory()->admin()->create([
            'name'  => 'Admin Office',
            'email' => 'admin@udd.edu.ph',
        ]);

        // Seed each block with a mayor and several students
        Block::all()->each(function (Block $block) {
            // Create mayor as a student first, then promote
            $mayor = User::factory()->create([
                'role'     => 'student',
                'block_id' => $block->id,
            ]);

            // Point the block to its mayor
            $block->update(['mayor_id' => $mayor->id]);

            // 8 regular students per block
            User::factory(8)->student($block)->create();
        });
    }
}
