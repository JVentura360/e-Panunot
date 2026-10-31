<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subjects = [
            ['code' => 'ITP08', 'name' => 'Fundamentals of Database Systems'],
            ['code' => 'ITP09', 'name' => 'Systems Integration and Architecture'],
            ['code' => 'ITP10', 'name' => 'Event-Driven Programming'],
            ['code' => 'ITP11', 'name' => 'Routing and Switching Essential'],
            ['code' => 'ITE01', 'name' => 'Installation of Computer System'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(['code' => $subject['code']], $subject);
        }
    }
}
