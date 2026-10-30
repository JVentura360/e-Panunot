<?php

namespace App\Jobs;

use App\Services\GoogleCalendarService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Gives (or takes away) a person's access to their block's Google calendar.
 *
 *   SyncBlockCalendarAccess::dispatch($blockId, $email, true);   // new mayor / new member
 *   SyncBlockCalendarAccess::dispatch($blockId, $email, false);  // member removed
 *
 * Granting access also creates the block's calendar if it does not exist yet.
 */
class SyncBlockCalendarAccess implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public int $blockId,
        public string $email,
        public bool $grant = true
    ) {
    }

    public function backoff(): array
    {
        return [30, 120, 300, 900];
    }

    /** Handle one block's sharing changes one at a time. */
    public function middleware(): array
    {
        return [(new WithoutOverlapping("gcal-block-{$this->blockId}"))->releaseAfter(15)->expireAfter(120)];
    }

    public function handle(GoogleCalendarService $google): void
    {
        if (! $google->enabled()) {
            return;
        }

        if ($this->grant) {
            $calendarId = $google->ensureBlockCalendar($this->blockId);
            $google->share($calendarId, $this->email);

            return;
        }

        $calendarId = DB::table('blocks')->where('id', $this->blockId)->value('google_calendar_id');

        if ($calendarId) {
            $google->unshare($calendarId, $this->email);
        }
    }
}
