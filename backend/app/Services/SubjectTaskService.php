<?php

namespace App\Services;

use App\Jobs\SyncTaskToGoogle;
use App\Models\Task;
use App\Models\User;
use App\Notifications\NewTaskNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SubjectTaskService
{
    public function create(User $mayor, array $values): Collection
    {
        $candidate = DB::table('blocks')->where('id', $mayor->block_id)->first();
        abort_unless($candidate, 403, 'You are not assigned to a block.');

        $notifyQueue = [];                                                        // NEW

        $result = DB::transaction(function () use ($mayor, $values, $candidate, &$notifyQueue): Collection {   // CHANGED
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            abort_unless($term && $term->is_active, 422, 'This term is no longer active.');
            $block = DB::table('blocks')->where('id', $candidate->id)->lockForUpdate()->first();
            abort_unless((int) $block->mayor_id === (int) $mayor->id, 403, 'Only the appointed mayor can assign class tasks.');
            $enrollment = app(StudentEnrollmentService::class)->snapshot($mayor->id);
            abort_if($enrollment['mayor_needs_reconciliation'], 422, 'Confirm your regular enrollment in Block Management before assigning tasks.');
            $offered = DB::table('block_subjects')->where('block_id', $block->id)->orderBy('subject_id')->pluck('subject_id')->all();
            abort_unless($offered, 422, 'The admin must assign subjects before you can create class tasks.');
            $selected = ! empty($values['all_subjects']) ? $offered : [(int) ($values['subject_id'] ?? 0)];
            abort_if(array_diff($selected, $offered), 422, 'Choose a subject offered in your block.');
            unset($values['all_subjects'], $values['subject_id']);
            $tasks = collect();
            foreach ($selected as $subjectId) {
                $task = Task::create($values + ['block_id' => $block->id, 'created_by' => $mayor->id, 'subject_id' => $subjectId]);
                $recipients = DB::table('subject_enrollments')->where('block_id', $block->id)
                    ->where('term_id', $term->id)->where('subject_id', $subjectId)->distinct()->pluck('user_id');
                foreach ($recipients as $userId) {
                    DB::table('task_assignments')->insert(['task_id' => $task->id, 'user_id' => $userId, 'created_at' => now(), 'updated_at' => now()]);
                }
                SyncTaskToGoogle::dispatch($task->id)->afterCommit();
                $task->load('subject');
                $tasks->push($task);
                $notifyQueue[] = [$task, $recipients->all()];
            }
            return $tasks;
        }, 3);

        // after the transaction has committed                                    // NEW
        foreach ($notifyQueue as [$task, $userIds]) {
            Notification::send(
                User::whereIn('id', $userIds)->where('id', '!=', $mayor->id)->get(),
                new NewTaskNotification($task)
            );
        }

        return $result;                                                           // CHANGED
    }
}
