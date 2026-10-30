<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConcernResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isStudent = $request->user()->id === $this->student_id;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'description' => $this->description,
            'status' => $this->status,
            'is_unread' => $isStudent ? (bool) $this->student_unread : (bool) $this->mayor_unread,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'picture_url' => $this->student->picture_url,
            ]),
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject?->id,
                'code' => $this->subject?->code,
                'name' => $this->subject?->name,
            ]),
            'attachments' => $this->whenLoaded('attachments', fn () =>
                $this->attachments->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->original_name,
                    'mime_type' => $a->mime_type,
                    'size_bytes' => $a->size_bytes,
                ])
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
