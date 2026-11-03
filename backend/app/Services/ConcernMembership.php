<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Closure;

class ConcernMembership
{
    public static function canUse(User $user): bool
    {
        return $user->role === Role::Admin || DB::table('blocks as b')->join('terms as t', 't.id', '=', 'b.term_id')
            ->where('b.id', DB::table('users')->where('id', $user->id)->value('block_id'))->where('t.is_active', true)->exists();
    }

    public static function write(int $blockId, User $actor, Closure $action): mixed
    {
        $termId = DB::table('blocks')->where('id', $blockId)->value('term_id');
        abort_unless($termId, 404, 'Block not found.');
        return DB::transaction(function () use ($termId, $actor, $action): mixed {
            $term = DB::table('terms')->where('id', $termId)->lockForUpdate()->first();
            abort_unless($term && $term->is_active, 422, 'Archived conversations are read-only.');
            $current = User::query()->lockForUpdate()->findOrFail($actor->id);
            abort_unless(self::canUse($current), 403, 'Join a block or become a mayor before using Concerns.');
            return $action($current);
        }, 3);
    }

    public static function closeForRemoval(int $blockId, int $studentId): void
    {
        $concerns = DB::table('concerns')->where('block_id', $blockId)->where('student_id', $studentId)->whereNull('student_removed_at');
        (clone $concerns)->whereIn('status', ['open', 'in_progress'])->update(['status' => 'resolved']);
        $concerns->update(['student_removed_at' => now(), 'student_unread' => false,
                'mayor_unread' => true, 'updated_at' => now()]);
    }
}
