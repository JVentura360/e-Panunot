<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'concern_id',
    'file_path',
    'original_name',
    'mime_type',
    'size_bytes',
])]
class ConcernAttachment extends Model
{
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class, 'concern_id');
    }
}