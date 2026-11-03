<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalTodo extends Model
{
    protected $fillable = ['user_id', 'title', 'is_done', 'due_date', 'google_task_id', 'client_id', 'revision'];

    protected function casts(): array
    {
        return [
            'is_done' => 'boolean',
            'revision' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
