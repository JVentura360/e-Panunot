<?php

namespace App\Services;

use App\Http\Resources\BlockResource;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Google\Client as GoogleClient;
use Google\Service\Calendar as CalendarService;
use Google\Service\Calendar\AclRule;
use Google\Service\Calendar\AclRuleScope;
use Google\Service\Calendar\Calendar as GoogleCalendar;
use Google\Service\Calendar\Event as GoogleEvent;
use Google\Service\Exception as GoogleServiceException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Every call to Google Calendar lives in this one class.
 *
 * ePanunot signs in to Google as a SERVICE ACCOUNT (a robot account with its own
 * key file), so there are no per-user tokens to store. The service account owns
 * one calendar per block and shares it with the block's members by email.
 *
 * Your database stays the source of truth; Google only holds a copy.
 */
class GoogleCalendarService
{
    private ?CalendarService $service = null;

    /** Master switch (GOOGLE_CALENDAR_ENABLED in .env). Jobs do nothing when it is off. */
    public function enabled(): bool
    {
        return (bool) config('services.google.enabled');
    }

    // ------------------------------------------------------------------
    // Calendars
    // ------------------------------------------------------------------

    /**
     * Returns the Google calendar id of a block, creating the calendar the first time.
     * The block row is locked so two jobs can never create two calendars.
     */
    public function ensureBlockCalendar(int $blockId): string
    {
        return DB::transaction(function () use ($blockId) {
            $block = DB::table('blocks')->where('id', $blockId)->lockForUpdate()->first();

            if (! $block) {
                throw new RuntimeException("Block {$blockId} does not exist.");
            }

            if ($block->google_calendar_id) {
                return $block->google_calendar_id;
            }

            $term = DB::table('terms')->where('id', $block->term_id)->first();
            $code = BlockResource::makeCode($block->year_level, $term->semester, $block->program, $block->block_number);
            $label = BlockResource::termLabel($term->semester, $term->school_year);

            $calendarId = $this->createCalendar("ePanunot {$code} - {$label}");

            DB::table('blocks')->where('id', $blockId)->update([
                'google_calendar_id' => $calendarId,
                'updated_at' => now(),
            ]);

            return $calendarId;
        });
    }

    /** Creates a calendar owned by the service account. Returns its id. */
    public function createCalendar(string $summary): string
    {
        $calendar = new GoogleCalendar();
        $calendar->setSummary($summary);
        $calendar->setTimeZone($this->timezone());

        $calendarId = $this->service()->calendars->insert($calendar)->getId();

        // Optional: let the team owner see and manage it in their own Google Calendar.
        if ($owner = config('services.google.owner_email')) {
            $this->share($calendarId, $owner, 'owner');
        }

        return $calendarId;
    }

    /** Deletes a whole calendar (for the end-of-semester cleanup). Safe if it is already gone. */
    public function deleteCalendar(string $calendarId): void
    {
        try {
            $this->service()->calendars->delete($calendarId);
        } catch (GoogleServiceException $e) {
            if (! $this->isGone($e)) {
                throw $e;
            }
        }
    }

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    /**
     * Creates the event, or updates it when $googleEventId is given.
     * If the event was deleted in Google meanwhile, it is created again.
     *
     * @return string the Google event id (save it in your database)
     */
    public function upsertEvent(
        string $calendarId,
        ?string $googleEventId,
        string $title,
        CarbonInterface $start,
        CarbonInterface $end,
        ?string $description = null
    ): string {
        $event = $this->buildEvent($title, $start, $end, $description);

        if ($googleEventId) {
            try {
                return $this->service()->events->update($calendarId, $googleEventId, $event)->getId();
            } catch (GoogleServiceException $e) {
                if (! $this->isGone($e)) {
                    throw $e;
                }
                // fall through and create it again
            }
        }

        return $this->service()->events->insert($calendarId, $event)->getId();
    }

    /** Deletes an event. Safe if it is already gone. */
    public function deleteEvent(string $calendarId, string $googleEventId): void
    {
        try {
            $this->service()->events->delete($calendarId, $googleEventId);
        } catch (GoogleServiceException $e) {
            if (! $this->isGone($e)) {
                throw $e;
            }
        }
    }

    // ------------------------------------------------------------------
    // Sharing
    // ------------------------------------------------------------------

    /** Gives an email address access to a calendar ('reader' = view only). No email is sent. */
    public function share(string $calendarId, string $email, string $role = 'reader'): void
    {
        $scope = new AclRuleScope();
        $scope->setType('user');
        $scope->setValue(strtolower($email));

        $rule = new AclRule();
        $rule->setRole($role);
        $rule->setScope($scope);

        try {
            $this->service()->acl->insert($calendarId, $rule, ['sendNotifications' => false]);
        } catch (GoogleServiceException $e) {
            if ($e->getCode() !== 409) { // 409 = already shared
                throw $e;
            }
        }
    }

    /** Removes an email address's access. Safe if they never had it. */
    public function unshare(string $calendarId, string $email): void
    {
        try {
            $this->service()->acl->delete($calendarId, 'user:'.strtolower($email));
        } catch (GoogleServiceException $e) {
            if (! $this->isGone($e)) {
                throw $e;
            }
        }
    }

    /**
     * The link that opens Google Calendar's "Add calendar" prompt. Because no
     * email is sent when we share, show this link as a button in the app.
     */
    public function addToCalendarUrl(string $calendarId): string
    {
        return 'https://calendar.google.com/calendar/r?cid='.rtrim(base64_encode($calendarId), '=');
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function buildEvent(string $title, CarbonInterface $start, CarbonInterface $end, ?string $description): GoogleEvent
    {
        $timezone = $this->timezone();

        return new GoogleEvent([
            'summary' => $title,
            'description' => $description,
            'start' => [
                'dateTime' => CarbonImmutable::instance($start)->setTimezone($timezone)->toRfc3339String(),
                'timeZone' => $timezone,
            ],
            'end' => [
                'dateTime' => CarbonImmutable::instance($end)->setTimezone($timezone)->toRfc3339String(),
                'timeZone' => $timezone,
            ],
        ]);
    }

    private function timezone(): string
    {
        return (string) config('services.google.timezone', 'Asia/Manila');
    }

    /** 404 / 410 = the thing we wanted to delete or update no longer exists in Google. */
    private function isGone(GoogleServiceException $e): bool
    {
        return in_array($e->getCode(), [404, 410], true);
    }

    private function service(): CalendarService
    {
        if ($this->service) {
            return $this->service;
        }

        $path = (string) config('services.google.credentials');

        if (! is_file($path)) {
            throw new RuntimeException(
                "Google service account key not found at [{$path}]. Check GOOGLE_CREDENTIALS_PATH in .env."
            );
        }

        $client = new GoogleClient();
        $client->setApplicationName((string) config('app.name', 'ePanunot'));
        $client->setAuthConfig($path);
        $client->setScopes([CalendarService::CALENDAR]);

        return $this->service = new CalendarService($client);
    }
}
