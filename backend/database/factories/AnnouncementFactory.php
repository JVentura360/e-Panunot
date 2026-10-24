<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\Block;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    private static array $announcementTitles = [
        'No classes on Friday',
        'Block meeting this Monday',
        'Reminder: Deadline tomorrow',
        'Updated class schedule',
        'New module uploaded to LMS',
        'Group activity rescheduled',
        'Attendance reminder',
    ];

    public function definition(): array
    {
        return [
            'block_id'    => Block::factory(),
            'title'       => fake()->randomElement(self::$announcementTitles),
            'description' => fake()->paragraph(),
            'created_by'  => User::factory(),
        ];
    }

    public function forBlock(Block $block, User $mayor): static
    {
        return $this->state([
            'block_id'   => $block->id,
            'created_by' => $mayor->id,
        ]);
    }
}
