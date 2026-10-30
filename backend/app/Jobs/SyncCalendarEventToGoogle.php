<?php

namespace App\Jobs;

use App\Models\CalendarEvent;
use App\Services\GoogleCalendarService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;

/**
 * Copies one class event (block event) to the block's Google calendar.
 * Creates it the first time and updates it afterwards.
 *
 *   SyncCalendarEventToGoogle::dispatch($event->id);
 */
class SyncCalendarEventToGoogle implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(public int $eventId)
    {
    }

    /** Wait 30s, 2min, 5min, 15min between retries. */
    public function backoff(): array
    {
        return [30, 120, 300, 900];
    }

    /** Never run two syncs of the same event at the same time. */
    public function middleware(): array
    {
        return [(new WithoutOverlapping("gcal-event-{$this->eventId}"))->releaseAfter(15)->expireAfter(120)];
    }

    public function handle(GoogleCalendarService $google): void
    {
        if (! $google->enabled()) {
            return;
        }

        $event = CalendarEvent::with('subject')->find($this->eventId);

        // Deleted in the meantime, or a personal event (personal events are never copied).
        if (! $event || $event->block_id === null) {
            return;
        }

        $calendarId = $google->ensureBlockCalendar((int) $event->block_id);

        $description = $event->subject
            ? 'Subject: '.$event->subject->code.' - '.$event->subject->name
            : null;

        $googleEventId = $google->upsertEvent(
            $calendarId,
            $event->google_event_id,
            $event->title,
            $event->starts_at,
            $event->ends_at,
            $description
        );

        if ($googleEventId !== $event->google_event_id) {
            $event->forceFill(['google_event_id' => $googleEventId])->saveQuietly();
        }
    }
}
