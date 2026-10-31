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
            'subject_id' => [
                'nullable',
                Rule::exists('block_subjects', 'subject_id')
                    ->where('block_id', $this->user()->block_id),
            ],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:2048', 'mimes:jpg,jpeg,png,pdf,doc,docx'],
        ];
    }

    public function messages(): array
    {
        return [
            'attachments.max' => 'You can attach up to 5 files.',
            'attachments.*.max' => 'Each file must be 2 MB or smaller.',
            'attachments.*.mimes' => 'Only JPG, PNG, PDF, DOC and DOCX files are allowed.',
            'attachments.*.uploaded' => 'A file failed to upload. It may be too large.',
        ];
    }
}
