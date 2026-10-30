<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'term_id',
    'user_id',
    'program',
    'year_level',
    'block_number',
    'block_id',
    'motivation',
    'status',
    'reviewed_by',
    'reviewed_at',
])]
class MayorApplication extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'year_level' => 'integer',
            'block_number' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class, 'term_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class, 'block_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
