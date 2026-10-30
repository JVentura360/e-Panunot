<?php

namespace App\Jobs;

use App\Services\GoogleCalendarService;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Copies a block task's deadline to the block's Google calendar as a
 * 30-minute event that starts at the due time.
 *
 *   SyncTaskToGoogle::dispatch($task->id);
 *
 * Reads the task with the query builder, so it works even while the Task
 * model is still empty.
 */
class SyncTaskToGoogle implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(public int $taskId)
    {
    }

    public function backoff(): array
    {
        return [30, 120, 300, 900];
    }

    public function middleware(): array
    {
        return [(new WithoutOverlapping("gcal-task-{$this->taskId}"))->releaseAfter(15)->expireAfter(120)];
    }

    public function handle(GoogleCalendarService $google): void
    {
        if (! $google->enabled()) {
            return;
        }

        $task = DB::table('tasks')->where('id', $this->taskId)->first();

        // Deleted in the meantime, or a personal task (only block tasks are copied).
        if (! $task || $task->block_id === null) {
            return;
        }

        $calendarId = $google->ensureBlockCalendar((int) $task->block_id);

        $due = CarbonImmutable::parse($task->due_date, 'UTC');

        $description = collect([
            $task->description,
            $task->platform ? 'Platform: '.$task->platform : null,
        ])->filter()->implode("\n");

        $googleEventId = $google->upsertEvent(
            $calendarId,
            $task->google_event_id,
            'Due: '.$task->title,
            $due,
            $due->addMinutes(30),
            $description !== '' ? $description : null
        );

        if ($googleEventId !== $task->google_event_id) {
            DB::table('tasks')->where('id', $task->id)->update(['google_event_id' => $googleEventId]);
        }
    }
}
