<?php

namespace Database\Factories;

use App\Models\Block;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    private static array $taskTitles = [
        'Submit Lab Report',
        'Complete Module Quiz',
        'Peer Review Assignment',
        'Upload Capstone Proposal',
        'Attend Online Synchronous Session',
        'Answer Activity Worksheet',
        'Group Project Presentation',
        'Final Exam Review',
        'Read Chapter and Write Reflection',
        'Submit Coding Exercise',
    ];

    public function definition(): array
    {
        return [
            'block_id' => BlockFactory::new(),
            'created_by' => UserFactory::new(),
            'subject_id' => null,
            'title' => fake()->randomElement(self::$taskTitles).' '.fake()->numberBetween(1, 10),
            'description' => fake()->optional(0.7)->paragraph(),
            'platform' => fake()->randomElement(['StepS', 'GradeVision', 'Face-To-Face', 'NetAcad', null]),
            'due_date' => fake()->dateTimeBetween('now', '+30 days'),
            'reminder_interval_minutes' => fake()->randomElement([60, 360, 720, 1440]),
            'google_event_id' => null,
        ];
    }

    /** Task attached to a known block and creator. */
    public function forBlock(Block $block, User $creator): static
    {
        return $this->state([
            'block_id' => $block->id,
            'created_by' => $creator->id,
        ]);
    }

    /** Task that is already past its due date. */
    public function overdue(): static
    {
        return $this->state([
            'due_date' => fake()->dateTimeBetween('-30 days', '-1 day'),
        ]);
    }
}
