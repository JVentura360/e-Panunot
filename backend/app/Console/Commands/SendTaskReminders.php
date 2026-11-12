<?php

namespace App\Console\Commands;

use App\Models\PersonalTodo;
use App\Models\TaskAssignment;
use App\Notifications\TaskReminderNotification;
use App\Services\ReminderSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'tasks:send-reminders';

    protected $description = 'Remind users about unfinished tasks and personal to-dos due within 24 hours';

    public function handle(): int
    {
        $now = now();
        $windowEnd = $now->copy()->addHours(24);
        $sent = 0;

        TaskAssignment::query()
            ->whereNull('completed_at')
            ->whereHas('task', fn ($query) => $query
                ->where('due_date', '>', $now)
                ->where('due_date', '<=', $windowEnd))
            ->with(['task', 'user'])
            ->chunkById(200, function ($assignments) use (&$sent, $now): void {
                foreach ($assignments as $assignment) {
                    $assignment = TaskAssignment::with(['task', 'user'])->find($assignment->id);
                    if (! $assignment || $assignment->completed_at || ! $assignment->task) {
                        continue;
                    }
                    $task = $assignment->task;
                    if (! ReminderSchedule::isDue($task->due_date, $assignment->last_reminded_at, $now)) {
                        continue;
                    }

                    if (! $assignment->user) {
                        continue;
                    }
                    if ($task->subject_id !== null && ! \Illuminate\Support\Facades\DB::table('subject_enrollments')
                        ->join('blocks', 'blocks.id', '=', 'subject_enrollments.block_id')
                        ->join('terms', 'terms.id', '=', 'blocks.term_id')
                        ->where('terms.is_active', true)->whereColumn('subject_enrollments.term_id', 'blocks.term_id')
                        ->where('user_id', $assignment->user_id)->where('subject_enrollments.block_id', $task->block_id)
                        ->where('subject_id', $task->subject_id)->exists()) {
                        continue;
                    }

                    $assignment->user->notify(new TaskReminderNotification($task));
                    $assignment->update([
                        'last_reminded_at' => $now,
                        'reminders_sent' => $assignment->reminders_sent + 1,
                    ]);
                    $sent++;
                }
            });

        PersonalTodo::query()
            ->where('is_done', false)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $now->toDateString())
            ->whereDate('due_date', '<=', $windowEnd->toDateString())
            ->with('user')
            ->chunkById(200, function ($todos) use (&$sent, $now): void {
                foreach ($todos as $todo) {
                    $todo = PersonalTodo::with('user')->find($todo->id);
                    if (! $todo || $todo->is_done || ! $todo->due_date) {
                        continue;
                    }
                    if (! ReminderSchedule::isDue(Carbon::parse($todo->due_date)->endOfDay(), $todo->last_reminded_at, $now)) {
                        continue;
                    }

                    if (! $todo->user) {
                        continue;
                    }

                    $todo->user->notify(new TaskReminderNotification($todo));
                    $todo->update([
                        'last_reminded_at' => $now,
                        'reminders_sent' => $todo->reminders_sent + 1,
                    ]);
                    $sent++;
                }
            });

        $this->info("Sent $sent reminder(s).");

        return self::SUCCESS;
    }
}
