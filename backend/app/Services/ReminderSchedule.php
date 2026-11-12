<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class ReminderSchedule
{
    public static function isDue(Carbon $deadline, ?Carbon $lastReminder, Carbon $now): bool
    {
        if ($deadline->lte($now)) {
            return false;
        }

        foreach ([30, 60, 180, 360, 720, 1440] as $minutes) {
            $scheduledAt = $deadline->copy()->subMinutes($minutes);
            if ($scheduledAt->lte($now)) {
                return $lastReminder === null || $lastReminder->lt($scheduledAt);
            }
        }

        return false;
    }
}
