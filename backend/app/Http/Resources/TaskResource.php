<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'platform' => $this->platform,
            'due_date' => $this->due_date,
            'reminder_interval_minutes' => $this->reminder_interval_minutes,
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject?->id,
                'code' => $this->subject?->code,
                'name' => $this->subject?->name,
            ]),
            'completed_at' => $this->whenLoaded(
                'assignments',
                fn () => $this->assignments->first()?->completed_at
            ),
            'created_at' => $this->created_at,
        ];
    }
}
