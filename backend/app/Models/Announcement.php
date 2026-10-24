<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable([
    'block_id',
    'title',
    'description',
    'created_by',
])]

class Announcement extends Model
{
    public function block():BelongsTo{
        return $this->belongsTo(Block::class,'block_id');
    }
    public function creator():BelongsTo{
        return $this->belongsTo(User::class,'created_by');
    }
}
