<?php

namespace Database\Seeders;

use App\Models\Block;
use Database\Factories\UserFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // One known admin account
        UserFactory::new()->admin()->create([
            'name' => 'Admin Office',
            'email' => 'admin@udd.edu.ph',
        ]);

        // Seed each block with a mayor and several students
        Block::all()->each(function (Block $block) {
            // Create mayor as a student first, then promote
            $mayor = UserFactory::new()->create([
                'role' => 'student',
                'block_id' => $block->id,
            ]);

            // Point the block to its mayor
            DB::table('blocks')->where('id', $block->id)->update([
                'mayor_id' => $mayor->id,
                'updated_at' => now(),
            ]);

            // 8 regular students per block
            UserFactory::new()->count(8)->student($block)->create();
        });
    }
}
