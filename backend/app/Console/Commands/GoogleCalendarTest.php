<?php

namespace App\Console\Commands;

use App\Services\GoogleCalendarService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Throwable;

class GoogleCalendarTest extends Command
{
    protected $signature = 'google:test
                            {--share= : Email address to share the test calendar with}
                            {--keep : Keep the test calendar instead of deleting it}
                            {--delete= : Delete a calendar by its id and stop}';

    protected $description = 'Check the Google Calendar connection by creating a test calendar and event';

    public function handle(GoogleCalendarService $google): int
    {
        if (! $google->enabled()) {
            $this->error('GOOGLE_CALENDAR_ENABLED is not true in your .env (then run php artisan config:clear).');

            return self::FAILURE;
        }

        try {
            if ($id = $this->option('delete')) {
                $google->deleteCalendar($id);
                $this->info("Calendar {$id} deleted.");

                return self::SUCCESS;
            }

            $this->info('Creating a test calendar...');
            $calendarId = $google->createCalendar('ePanunot connection test');
            $this->line("  calendar id: {$calendarId}");

            $start = CarbonImmutable::now('UTC')->addHour();
            $eventId = $google->upsertEvent($calendarId, null, 'Test event from ePanunot', $start, $start->addHour());
            $this->line("  event id:    {$eventId}");

            if ($email = $this->option('share')) {
                $google->share($calendarId, $email);
                $this->line("  shared with: {$email}");
            }

            $this->line('  add link:    '.$google->addToCalendarUrl($calendarId));

            if ($this->option('keep')) {
                $this->warn("Test calendar kept. Delete it later with: php artisan google:test --delete={$calendarId}");
            } else {
                $google->deleteCalendar($calendarId);
                $this->line('Test calendar deleted.');
            }

            $this->info('Google Calendar is connected.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Google Calendar test failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
