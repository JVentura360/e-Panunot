<?php

namespace App\Console\Commands;

use App\Services\TermContentCleaner;
use Illuminate\Console\Command;

class ClearOldTermContent extends Command
{
    protected $signature = 'terms:clear-old-content {--force : Skip the confirmation question}';

    protected $description = 'Delete class tasks, announcements and class events left in blocks of terms that are no longer active';

    public function handle(TermContentCleaner $cleaner): int
    {
        if (! $this->option('force') && ! $this->confirm('Delete all tasks, announcements and class events from blocks of past terms? This cannot be undone.')) {
            $this->info('Nothing was deleted.');

            return self::SUCCESS;
        }

        $result = $cleaner->clearInactiveTerms();

        $this->info("Deleted {$result['tasks']} task(s), {$result['announcements']} announcement(s) and {$result['events']} class event(s).");

        return self::SUCCESS;
    }
}
