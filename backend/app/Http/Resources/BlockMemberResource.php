<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * One person in a block's member list.
 *
 * Use BlockMemberResource::forBlock($members, $block) so each member gets an
 * `is_mayor` flag and the mayor is listed first:
 *
 *   return BlockMemberResource::forBlock($members, $block)
 *       ->additional(['count' => $members->count()]);
 */
class BlockMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => data_get($this->resource, 'name'),
            'email' => data_get($this->resource, 'email'),
            'picture_url' => data_get($this->resource, 'picture_url'),
            'block_id' => data_get($this->resource, 'block_id'),
            'is_mayor' => (bool) data_get($this->resource, 'is_mayor', false),
            'created_at' => data_get($this->resource, 'created_at'),
        ];
    }

    /**
     * @param  iterable<object>  $members  rows from users (stdClass or Eloquent)
     * @param  object  $block  the block row/model (needs mayor_id)
     */
    public static function forBlock(iterable $members, object $block): AnonymousResourceCollection
    {
        $mayorId = (int) data_get($block, 'mayor_id');

        $members = collect($members)
            ->each(function ($member) use ($mayorId) {
                $member->is_mayor = $mayorId !== 0 && (int) $member->id === $mayorId;
            })
            ->sortByDesc(fn ($member) => $member->is_mayor)
            ->values();

        return static::collection($members);
    }
}
