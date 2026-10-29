<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePersonalTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership is checked in the controller
    }

    /**
     * Send only what changed: {"title": "..."} and/or {"is_done": true}.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'is_done' => ['sometimes', 'boolean'],
        ];
    }
}
