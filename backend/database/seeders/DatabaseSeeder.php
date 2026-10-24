<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Order matters: each seeder depends on the ones above it.
     *
     *  Terms → Blocks → Users → Tasks → Concerns
     */
    public function run(): void
    {
        $this->call([
            TermSeeder::class,    // 1. terms must exist first
            BlockSeeder::class,   // 2. blocks reference a term
            UserSeeder::class,    // 3. users reference a block; mayors are linked back
            TaskSeeder::class,    // 4. tasks reference block + creator (mayor)
            ConcernSeeder::class, // 5. concerns reference block + student
        ]);
    }
}
