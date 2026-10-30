<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'school_year',
    'semester',
    'starts_on',
    'ends_on',
])]

class Term extends Model
{
    use HasFactory;

    protected function casts():array{
        return[
            'semester'=>'integer',
            'starts_on'=>'date',
            'ends_on'=>'date',
            'is_active'=>'boolean'
        ];
    }

    //para makuha lahat ng block na naka linked sa term na 'to
    public function blocks(): HasMany{
        return $this->hasMany(Block::class,'term_id');
    }

    //ganun din pero para sa mayor
    public function mayorApplication(): HasMany{
        return $this->hasMany(MayorApplication::class, 'term_id');
    }
}
