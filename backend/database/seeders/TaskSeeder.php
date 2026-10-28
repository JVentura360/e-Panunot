<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\User;
use Database\Factories\TaskFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        Block::query()->get()->each(function (Block $block) {
            $mayor = User::find($block->mayor_id);

            if (! $mayor) {
                return;
            }

            // 4 upcoming tasks per block created by the mayor
            $tasks = TaskFactory::new()->count(4)->forBlock($block, $mayor)->create();

            // 1 overdue task to test deadline handling
            $tasks->push(TaskFactory::new()->forBlock($block, $mayor)->overdue()->create());

            // Assign every task to every student in the block
            $students = User::query()
                ->where('block_id', $block->id)
                ->where('id', '!=', $mayor->id)
                ->get();

            foreach ($tasks as $task) {
                foreach ($students as $student) {
                    DB::table('task_assignments')->insert([
                        'task_id' => $task->id,
                        'user_id' => $student->id,
                        'completed_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }
}
