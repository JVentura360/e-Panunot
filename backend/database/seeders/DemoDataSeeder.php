<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $this->call([SubjectSeeder::class, BlockSeeder::class, UserSeeder::class, TaskSeeder::class, ConcernSeeder::class]);
    }
}
