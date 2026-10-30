<?php

namespace Database\Factories;

use App\Models\Term;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Term> */
class TermFactory extends Factory
{
    protected $model = Term::class;

    public function definition(): array
    {
        $year = fake()->unique()->numberBetween(2000, 2099);

        return [
            'school_year' => $year.'-'.($year + 1),
            'semester' => 1,
            'starts_on' => $year.'-08-01',
            'ends_on' => ($year + 1).'-01-31',
            'is_active' => false,
        ];
    }

    public function active(): static
    {
        return $this->state(['is_active' => true]);
    }
}
