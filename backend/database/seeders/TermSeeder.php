<?php

namespace Database\Seeders;

use App\Models\Term;
use Illuminate\Database\Seeder;

class TermSeeder extends Seeder
{
    public function run(): void
    {
        // One active term used by the rest of the seeders
        Term::factory()->active()->create([
            'school_year' => '2024-2025',
            'semester'    => 1,
            'starts_on'   => '2024-06-01',
            'ends_on'     => '2024-10-31',
        ]);

        // A past term for historical data
        Term::factory()->create([
            'school_year' => '2023-2024',
            'semester'    => 2,
            'starts_on'   => '2024-01-01',
            'ends_on'     => '2024-05-31',
            'is_active'   => false,
        ]);
    }
}
