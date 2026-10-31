<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Order matters: each seeder depends on the ones above it.
     *
     *  Blocks → Users → Tasks → Concerns
     */
    public function run(): void
    {
        $this->call([
            SubjectSeeder::class,
            BlockSeeder::class,
            UserSeeder::class,
            TaskSeeder::class,
            ConcernSeeder::class,
        ]);
    }
}
