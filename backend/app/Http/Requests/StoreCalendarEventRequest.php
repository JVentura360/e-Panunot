<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Used for creating an event (POST) and for editing one (PUT, send the full event).
 *
 * Send starts_at / ends_at as ISO 8601 with a timezone, e.g. the result of
 * JavaScript's date.toISOString() ("2026-11-03T01:00:00.000Z").
 */
class StoreCalendarEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // who may create class events is checked in the controller
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            // 'personal' (default) or 'block' (class event, mayor only). Ignored on update.
            'scope' => ['nullable', Rule::in(['personal', 'block'])],
            'subject_id' => [
                'nullable',
                Rule::exists('block_subjects', 'subject_id')
                    ->where('block_id', $this->user()->block_id),
            ],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ];
    }

    /**
     * Return the two times as Carbon instances converted to the app timezone (UTC),
     * so a "+08:00" time is stored correctly instead of being saved as if it were UTC.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();

        $timezone = config('app.timezone');
        $data['starts_at'] = Carbon::parse($data['starts_at'])->setTimezone($timezone);
        $data['ends_at'] = Carbon::parse($data['ends_at'])->setTimezone($timezone);

        return $key === null ? $data : data_get($data, $key, $default);
    }
}
