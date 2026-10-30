<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'concern_id',
    'sender_id',
    'type',
    'message_text',
])]
class ConversationMessage extends Model
{
    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class, 'concern_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}