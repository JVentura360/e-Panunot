<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => 'event',
            // class = shared with the whole block, personal = only the creator sees it
            'type' => $this->block_id === null ? 'personal' : 'class',
            'title' => $this->title,
            'subject' => $this->subject ? [
                'id' => $this->subject->id,
                'code' => $this->subject->code,
                'name' => $this->subject->name,
            ] : null,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            // set by the controller: may the current user edit / delete this event?
            'can_edit' => (bool) ($this->resource->can_edit ?? false),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
