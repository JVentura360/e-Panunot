<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Carbon;

class DeadlineValidation
{
    public static function futureTime(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || ! preg_match('/[T ]\d{2}:\d{2}/', $value)) {
                return;
            }
            try {
                $deadline = Carbon::parse($value);
            } catch (\Throwable) {
                $fail('Choose a valid deadline date and time.');
                return;
            }
            if ($deadline->lte(now())) {
                $fail('Choose a future deadline date and time.');
            }
        };
    }
}
