<?php

namespace App\Console\Commands;

use App\Models\PersonalTodo;
use App\Models\TaskAssignment;
use App\Notifications\TaskReminderNotification;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'tasks:send-reminders';

    protected $description = 'Remind users about unfinished tasks and personal to-dos due within 24 hours';

    public function handle(): int
    {
        $now = now();
        $windowEnd = $now->copy()->addHours(24);
        $max = 3;
        $sent = 0;

        TaskAssignment::query()
            ->whereNull('completed_at')
            ->where('reminders_sent', '<', $max)
            ->whereHas('task', fn ($query) => $query
                ->where('due_date', '>', $now)
                ->where('due_date', '<=', $windowEnd))
            ->with(['task', 'user'])
            ->chunkById(200, function ($assignments) use (&$sent, $now): void {
                foreach ($assignments as $assignment) {
                    $task = $assignment->task;
                    $interval = max(1, (int) $task->reminder_interval_minutes);

                    if ($assignment->last_reminded_at?->gt($now->copy()->subMinutes($interval))) {
                        continue;
                    }

                    if (! $assignment->user) {
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
            ->where('reminders_sent', '<', $max)
            ->with('user')
            ->chunkById(200, function ($todos) use (&$sent, $now): void {
                foreach ($todos as $todo) {
                    if ($todo->last_reminded_at?->gt($now->copy()->subDay())) {
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
