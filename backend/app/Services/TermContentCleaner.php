<?php

namespace App\Services;

use App\Jobs\DeleteGoogleEvent;
use Illuminate\Support\Facades\DB;

/**
 * Empties a block's class content: tasks (and their completion records),
 * announcements and class calendar events.
 *
 * The blocks themselves are kept on purpose. Mayor applications, enrollments and
 * the term history still point at them, so only what was posted inside them goes.
 */
class TermContentCleaner
{
    /**
     * Clear every block that belongs to a term that is no longer active.
     * Used by the artisan command to clean up data left over from earlier terms.
     */
    public function clearInactiveTerms(): array
    {
        $blockIds = DB::table('blocks')
            ->join('terms', 'terms.id', '=', 'blocks.term_id')
            ->where('terms.is_active', false)
            ->pluck('blocks.id')
            ->all();

        return $this->clearBlocks($blockIds);
    }

    /**
     * @param  array<int, int|string>  $blockIds
     * @return array{tasks:int, announcements:int, events:int}
     */
    public function clearBlocks(array $blockIds): array
    {
        $totals = ['tasks' => 0, 'announcements' => 0, 'events' => 0];
        $ids = array_values(array_unique(array_map('intval', $blockIds)));

        foreach (array_chunk($ids, 500) as $chunk) {
            DB::transaction(function () use ($chunk, &$totals): void {
                // Read the Google ids first: the rows are gone by the time the jobs run.
                $googleEvents = collect();
                foreach (['tasks', 'calendar_events'] as $table) {
                    $googleEvents = $googleEvents->concat(
                        DB::table($table)->whereIn('block_id', $chunk)->whereNotNull('google_event_id')
                            ->get(['block_id', 'google_event_id'])
                    );
                }

                DB::table('task_assignments')
                    ->whereIn('task_id', DB::table('tasks')->whereIn('block_id', $chunk)->select('id'))
                    ->delete();
                $totals['tasks'] += DB::table('tasks')->whereIn('block_id', $chunk)->delete();
                $totals['announcements'] += DB::table('announcements')->whereIn('block_id', $chunk)->delete();
                $totals['events'] += DB::table('calendar_events')->whereIn('block_id', $chunk)->delete();

                // Remove the matching events from each block's Google calendar once the delete commits.
                foreach ($googleEvents as $event) {
                    DeleteGoogleEvent::dispatch((int) $event->block_id, $event->google_event_id)->afterCommit();
                }
            });
        }

        return $totals;
    }
}
