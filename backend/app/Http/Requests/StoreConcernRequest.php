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
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:2048', 'mimes:jpg,jpeg,png,pdf,doc,docx'],
        ];
    }
}
