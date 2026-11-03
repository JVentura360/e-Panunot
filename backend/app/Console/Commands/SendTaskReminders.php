<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use App\Notifications\TaskReminderNotification;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'tasks:send-reminders';
    protected $description = 'Remind students about unfinished tasks that are due soon';

    public function handle(): int
    {
        $max = 3;            // reminders per task per student
        $sent = 0;

        TaskAssignment::query()
            ->whereNull('completed_at')
            ->where('reminders_sent', '<', $max)
            ->whereHas('task', fn ($q) => $q
                ->where('due_date', '>', now())
                ->where('due_date', '<=', now()->addDay()->endOfDay()))
            ->with('task')
            ->chunkById(200, function ($assignments) use (&$sent) {
                foreach ($assignments as $assignment) {
                    $task = $assignment->task;
                    $interval = max(1, (int) $task->reminder_interval_minutes);

                    if ($assignment->last_reminded_at
                        && $assignment->last_reminded_at->gt(now()->subMinutes($interval))) {
                        continue;
                    }

                    $user = User::find($assignment->user_id);
                    if (! $user) {
                        continue;
                    }

                    $user->notify(new TaskReminderNotification($task));
                    $assignment->update([
                        'last_reminded_at' => now(),
                        'reminders_sent' => $assignment->reminders_sent + 1,
                    ]);
                    $sent++;
                }
            });

        $this->info("Sent $sent reminder(s).");

        return self::SUCCESS;
    }
}