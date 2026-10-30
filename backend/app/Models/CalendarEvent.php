<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    protected $fillable = [
        'block_id',
        'created_by',
        'subject_id',
        'title',
        'starts_at',
        'ends_at',
        'google_event_id',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Events this user may see: their block's class events, plus their own personal events.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user) {
            $q->where(function (Builder $personal) use ($user) {
                $personal->whereNull('block_id')->where('created_by', $user->id);
            });

            if ($user->block_id) {
                $q->orWhere('block_id', $user->block_id);
            }
        });
    }

    /**
     * Events that overlap the window [$from, $to].
     */
    public function scopeOverlapping(Builder $query, CarbonInterface $from, CarbonInterface $to): Builder
    {
        return $query->where('starts_at', '<=', $to)->where('ends_at', '>=', $from);
    }
}
