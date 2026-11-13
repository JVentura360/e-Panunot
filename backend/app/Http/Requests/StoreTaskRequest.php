<?php

namespace App\Http\Requests;

use App\Enums\TaskPlatform;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject_id' => [
                'required_unless:all_subjects,true',
                'prohibited_if:all_subjects,true',
                'integer',
                Rule::exists('block_subjects', 'subject_id')
                    ->where('block_id', $this->user()->block_id),
            ],
            'all_subjects' => ['sometimes', 'boolean'],
            'platform' => ['nullable', Rule::enum(TaskPlatform::class)],
            'due_date' => ['required', 'date', 'after_or_equal:today', \App\Services\DeadlineValidation::futureTime()],
            'reminder_interval_minutes' => ['nullable', 'integer', 'min:1']
        ];
    }
}
