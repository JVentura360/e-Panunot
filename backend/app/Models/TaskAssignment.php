<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'task_id',
    'user_id',
    'completed_at',
    'last_reminded_at',
    'reminders_sent',
])]
class TaskAssignment extends Model
{
    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'last_reminded_at' => 'datetime',
            'reminders_sent' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}