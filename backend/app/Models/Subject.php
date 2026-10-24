<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'code',
    'name',
])]
class Subject extends Model
{
    public function blocks(): BelongsToMany
    {
        return $this->belongsToMany(
            Block::class,
            'block_subjects',
            'subject_id',
            'block_id'
        );
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'subject_id');
    }

    public function concerns(): HasMany
    {
        return $this->hasMany(Concern::class, 'subject_id');
    }
}