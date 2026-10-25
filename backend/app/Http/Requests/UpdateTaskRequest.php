<?php

namespace App\Http\Requests;

use App\Enums\TaskPlatform;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject_id' => [
                'nullable',
                Rule::exists('block_subjects', 'subject_id')
                    ->where('block_id', $this->user()->block_id),
            ],
            'platform' => ['nullable', Rule::enum(TaskPlatform::class)],
            'due_date' => ['sometimes', 'required', 'date'],
            'reminder_interval_minutes' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
