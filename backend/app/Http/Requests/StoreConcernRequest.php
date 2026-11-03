<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use App\Enums\ConcernCategory;
use Illuminate\Validation\Rule;

class StoreConcernRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && \App\Services\ConcernMembership::canUse($this->user());
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
            'category' => ['required', Rule::enum(ConcernCategory::class)],
            'description' => ['required', 'string'],
            'block_id' => ['sometimes', 'required', 'integer', 'exists:blocks,id'],
            'subject_id' => [
                'nullable',
                'integer',
                Rule::exists('block_subjects', 'subject_id')
                    ->where('block_id', $this->input('block_id', $this->user()->block_id)),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! \App\Services\SubjectAccess::canAccess($this->user(), (int) $this->input('block_id', $this->user()->block_id), (int) $value)) {
                        $fail('Choose a subject you are enrolled in for this block.');
                    }
                },
            ],
            'task_id' => [
                'nullable',
                'integer',
                'prohibited_unless:category,academic',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $task = \App\Models\Task::find($value);
                    if (! $task || ! \App\Services\SubjectAccess::canAccess($this->user(), (int) $task->block_id, (int) $task->subject_id)) {
                        $fail('Choose a task from one of your subjects.');
                        return;
                    }
                    if ($this->filled('subject_id') && (int) $this->input('subject_id') !== (int) $task->subject_id) {
                        $fail('That task does not belong to the chosen subject.');
                    }
                },
            ],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:5120', 'mimes:jpg,jpeg,png', 'extensions:jpg,jpeg,png'],
        ];
    }

    public function messages(): array
    {
        return [
            'attachments.max' => 'You can attach up to 5 files.',
            'attachments.*.max' => 'Each image must be 5 MB or smaller.',
            'attachments.*.mimes' => 'Only PNG, JPG and JPEG images are allowed.',
            'attachments.*.extensions' => 'Only PNG, JPG and JPEG images are allowed.',
            'attachments.*.uploaded' => 'A file failed to upload. It may be too large.',
        ];
    }
}
