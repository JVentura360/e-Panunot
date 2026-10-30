<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'block_id',
    'student_id',
    'subject_id',
    'title',
    'category',
    'description',
    'status',
    'student_unread',
    'mayor_unread',
])]
class Concern extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'student_unread' => 'boolean',
            'mayor_unread' => 'boolean',
        ];
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class, 'block_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ConversationMessage::class, 'concern_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ConcernAttachment::class, 'concern_id');
    }
}
