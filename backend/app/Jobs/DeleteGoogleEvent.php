<?php

namespace App\Jobs;

use App\Services\GoogleCalendarService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Removes an event from a block's Google calendar. Used when a class event or a
 * task is deleted. Pass the ids you read BEFORE deleting the row, because the row
 * is already gone by the time this job runs:
 *
 *   DeleteGoogleEvent::dispatch($blockId, $googleEventId);
 */
class DeleteGoogleEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(public int $blockId, public string $googleEventId)
    {
    }

    public function backoff(): array
    {
        return [30, 120, 300, 900];
    }

    public function handle(GoogleCalendarService $google): void
    {
        if (! $google->enabled()) {
            return;
        }

        $calendarId = DB::table('blocks')->where('id', $this->blockId)->value('google_calendar_id');

        if (! $calendarId) {
            return; // the block never had a Google calendar (or the block is gone)
        }

        $google->deleteEvent($calendarId, $this->googleEventId);
    }
}
