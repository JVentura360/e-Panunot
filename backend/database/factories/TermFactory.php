<?php

namespace Database\Factories;

use App\Models\Term;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Term>
 */
class TermFactory extends Factory
{
    protected $model = Term::class;

    public function definition(): array
    {
        $startYear = fake()->numberBetween(2023, 2026);
        $semester  = fake()->randomElement([1, 2]);

        // Semester 1: June–October  |  Semester 2: November–March
        [$startsOn, $endsOn] = $semester === 1
            ? ["{$startYear}-06-01", "{$startYear}-10-31"]
            : ["{$startYear}-11-01", ($startYear + 1) . '-03-31'];

        return [
            'school_year' => "{$startYear}-" . ($startYear + 1),
            'semester'    => $semester,
            'starts_on'   => $startsOn,
            'ends_on'     => $endsOn,
            'is_active'   => false,
        ];
    }

    public function active(): static
    {
        return $this->state(['is_active' => true]);
    }
}
