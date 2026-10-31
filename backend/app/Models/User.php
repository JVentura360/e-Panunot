<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Enums\Role;

#[Fillable([
    'google_id',
    'name',
    'email',
    'picture_url',
    'block_id',
])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'role' => Role::class,
        ];
    }

    /** role is cast to the Role enum, so never compare it to a plain string. */
    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class, 'block_id');
    }

    public function mayorBlocks(): HasMany
    {
        return $this->hasMany(Block::class, 'mayor_id');
    }

    public function blockJoinRequests(): HasMany
    {
        return $this->hasMany(BlockJoinRequest::class, 'user_id');
    }

    public function reviewedBlockJoinRequests(): HasMany
    {
        return $this->hasMany(BlockJoinRequest::class, 'reviewed_by');
    }

    public function mayorApplications(): HasMany
    {
        return $this->hasMany(MayorApplication::class, 'user_id');
    }

    public function reviewedMayorApplications(): HasMany
    {
        return $this->hasMany(MayorApplication::class, 'reviewed_by');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'created_by');
    }

    public function createdTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'created_by');
    }

    public function taskAssignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class, 'user_id');
    }

    public function concerns(): HasMany
    {
        return $this->hasMany(Concern::class, 'student_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ConversationMessage::class, 'sender_id');
    }
}