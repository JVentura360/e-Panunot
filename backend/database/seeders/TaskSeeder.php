<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        Block::with('users')->get()->each(function (Block $block) {
            $mayor = User::find($block->mayor_id);

            if (! $mayor) {
                return;
            }

            // 4 upcoming tasks per block created by the mayor
            $tasks = Task::factory(4)->forBlock($block, $mayor)->create();

            // 1 overdue task to test deadline handling
            $tasks->push(Task::factory()->overBlock($block, $mayor)->overdue()->create());

            // Assign every task to every student in the block
            $students = $block->users()->where('id', '!=', $mayor->id)->get();

            foreach ($tasks as $task) {
                foreach ($students as $student) {
                    TaskAssignment::create([
                        'task_id'      => $task->id,
                        'user_id'      => $student->id,
                        'completed_at' => null,
                    ]);
                }
            }
        });
    }
}
