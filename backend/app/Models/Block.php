<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'term_id',
    'program',
    'year_level',
    'block_number',
    'mayor_id',
])]
class Block extends Model
{
    protected function casts(): array
    {
        return [
            'year_level' => 'integer',
            'block_number' => 'integer',
        ];
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class, 'term_id');
    }

    public function mayor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mayor_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(User::class, 'block_id');
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(
            Subject::class,
            'block_subjects',
            'block_id',
            'subject_id'
        );
    }

    public function joinRequests(): HasMany
    {
        return $this->hasMany(BlockJoinRequest::class, 'block_id');
    }

    public function mayorApplications(): HasMany
    {
        return $this->hasMany(MayorApplication::class, 'block_id');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'block_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'block_id');
    }

    public function concerns(): HasMany
    {
        return $this->hasMany(Concern::class, 'block_id');
    }
}