<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
{
    /**
     * Works with an Eloquent Subject and with DB::table('subjects') rows.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => data_get($this->resource, 'code'),
            'name' => data_get($this->resource, 'name'),
        ];
    }
}
