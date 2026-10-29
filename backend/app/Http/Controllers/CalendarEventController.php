<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCalendarEventRequest;
use App\Http\Resources\CalendarEventResource;
use App\Models\CalendarEvent;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CalendarEventController extends Controller
{
    /** The most days one calendar request may cover. */
    private const MAX_RANGE_DAYS = 93;

    /**
     * GET /api/calendar?from=...&to=...
     *
     * One list for the calendar screen: class events + the user's personal events
     * + the block's tasks (by due date), sorted by time. Each item has a `kind`
     * ('event' or 'task') so React can style them differently.
     *
     * Send `from` / `to` as ISO strings, e.g. date.toISOString(). Without them
     * the current month is returned.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = $request->filled('from')
            ? CarbonImmutable::parse($request->input('from'))->setTimezone('UTC')
            : CarbonImmutable::now('UTC')->startOfMonth();

        $to = $request->filled('to')
            ? CarbonImmutable::parse($request->input('to'))->setTimezone('UTC')
            : $from->endOfMonth();

        if ($from->diffInDays($to) > self::MAX_RANGE_DAYS) {
            throw ValidationException::withMessages([
                'to' => ['Please ask for '.self::MAX_RANGE_DAYS.' days or less at a time.'],
            ]);
        }

        // 1) events
        $isMayor = $this->isBlockMayor($user);

        $events = CalendarEvent::query()
            ->visibleTo($user)
            ->overlapping($from, $to)
            ->with('subject')
            ->orderBy('starts_at')
            ->get();

        $events->each(fn (CalendarEvent $event) => $event->setAttribute(
            'can_edit',
            $this->canManage($user, $event, $isMayor)
        ));

        $eventItems = CalendarEventResource::collection($events)->resolve($request);

        // 2) the block's tasks, with this user's own "done" state
        $taskItems = $this->taskItems($user, $from, $to);

        $items = collect($eventItems)
            ->concat($taskItems)
            ->sortBy('starts_at')
            ->values();

        return response()->json([
            'data' => $items,
            'range' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
        ]);
    }

    /**
     * POST /api/calendar-events
     *
     * Everyone can create a personal event. A mayor can send "scope": "block"
     * to create a class event for the whole block.
     */
    public function store(StoreCalendarEventRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        $isBlockEvent = ($data['scope'] ?? 'personal') === 'block';

        if ($isBlockEvent) {
            abort_unless($this->isBlockMayor($user), 403, 'Only the block mayor can create class events.');
        }

        $event = CalendarEvent::create([
            'block_id' => $isBlockEvent ? $user->block_id : null,
            'created_by' => $user->id,
            'subject_id' => $data['subject_id'] ?? null,
            'title' => $data['title'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
        ]);

        // GOOGLE SYNC HOOK: for class events (block_id set), dispatch the job that
        // creates the event in the block's Google calendar, e.g.
        //   SyncCalendarEventToGoogle::dispatch($event->id)->afterCommit();

        return $this->respond($event, 201);
    }

    /**
     * PUT /api/calendar-events/{calendarEvent}   (send the full event again)
     */
    public function update(StoreCalendarEventRequest $request, CalendarEvent $calendarEvent)
    {
        $user = $request->user();
        abort_unless($this->canManage($user, $calendarEvent), 403, 'You cannot edit this event.');

        $data = $request->validated();

        $calendarEvent->update([
            'subject_id' => $data['subject_id'] ?? null,
            'title' => $data['title'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
        ]);

        // GOOGLE SYNC HOOK: re-sync this event to Google if it is a class event.

        return $this->respond($calendarEvent);
    }

    /**
     * DELETE /api/calendar-events/{calendarEvent}
     */
    public function destroy(Request $request, CalendarEvent $calendarEvent)
    {
        abort_unless($this->canManage($request->user(), $calendarEvent), 403, 'You cannot delete this event.');

        // GOOGLE SYNC HOOK: read $calendarEvent->google_event_id and
        // $calendarEvent->block_id BEFORE deleting, and pass them to the job that
        // removes the event from Google (the row will be gone by the time it runs).

        $calendarEvent->delete();

        return response()->noContent();
    }

    // ---------------------------------------------------------------------

    /**
     * The block's tasks due inside the window, as plain arrays shaped like events.
     * Read with the query builder so it works whether or not the Task model is filled in.
     */
    private function taskItems(User $user, CarbonImmutable $from, CarbonImmutable $to)
    {
        if (! $user->block_id) {
            return collect();
        }

        return DB::table('tasks as t')
            ->leftJoin('subjects as s', 's.id', '=', 't.subject_id')
            ->leftJoin('task_assignments as ta', function ($join) use ($user) {
                $join->on('ta.task_id', '=', 't.id')->where('ta.user_id', '=', $user->id);
            })
            ->where('t.block_id', $user->block_id)
            ->whereBetween('t.due_date', [$from, $to])
            ->orderBy('t.due_date')
            ->get([
                't.id', 't.title', 't.platform', 't.due_date', 't.subject_id',
                's.code as subject_code', 's.name as subject_name',
                'ta.completed_at',
            ])
            ->map(function ($task) {
                $due = CarbonImmutable::parse($task->due_date, 'UTC')->toIso8601String();

                return [
                    'id' => $task->id,
                    'kind' => 'task',
                    'type' => 'task',
                    'title' => $task->title,
                    'platform' => $task->platform,
                    'subject' => $task->subject_id ? [
                        'id' => (int) $task->subject_id,
                        'code' => $task->subject_code,
                        'name' => $task->subject_name,
                    ] : null,
                    'starts_at' => $due,
                    'ends_at' => $due,
                    'due_date' => $due,
                    'completed_at' => $task->completed_at
                        ? CarbonImmutable::parse($task->completed_at, 'UTC')->toIso8601String()
                        : null,
                    'can_edit' => false, // tasks are edited on the Tasks screen
                ];
            });
    }

    /**
     * A mayor is the person in blocks.mayor_id (not just anyone with the 'mayor' role,
     * which can be left over from a previous semester).
     */
    private function isBlockMayor(User $user): bool
    {
        if (! $user->block_id) {
            return false;
        }

        $mayorId = DB::table('blocks')->where('id', $user->block_id)->value('mayor_id');

        return $mayorId !== null && (int) $mayorId === (int) $user->id;
    }

    /**
     * Personal events: only their creator. Class events: only the mayor of that block.
     */
    private function canManage(User $user, CalendarEvent $event, ?bool $isMayor = null): bool
    {
        if ($event->block_id === null) {
            return (int) $event->created_by === (int) $user->id;
        }

        return (int) $event->block_id === (int) $user->block_id
            && ($isMayor ?? $this->isBlockMayor($user));
    }

    private function respond(CalendarEvent $event, int $status = 200)
    {
        $event->load('subject')->setAttribute('can_edit', true);

        return (new CalendarEventResource($event))->response()->setStatusCode($status);
    }
}
