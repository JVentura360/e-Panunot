<?php

namespace Database\Seeders;

use App\Models\Term;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrentSchoolYearSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        DB::transaction(function (): void {
            $current = Term::where('is_active', true)->lockForUpdate()->first();
            if ($current && $current->school_year !== '2099-2100') {
                return;
            }
            if ($current && Term::where('school_year', '2026-2027')->where('semester', $current->semester)->exists()) {
                return;
            }
            $term = $current ?? Term::firstOrNew(['school_year' => '2026-2027', 'semester' => 1]);
            $term->fill(['school_year' => '2026-2027', 'starts_on' => '2026-08-01', 'ends_on' => '2027-01-31']);
            $term->forceFill(['is_active' => true])->save();
        });
    }
}
