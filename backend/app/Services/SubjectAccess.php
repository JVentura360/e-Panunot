<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

class SubjectAccess
{
    public static function blockIds(User $user): array
    {
        return DB::table('blocks as access_blocks')->join('terms as access_terms', 'access_terms.id', '=', 'access_blocks.term_id')
            ->where('access_terms.is_active', true)
            ->where(function (QueryBuilder $query) use ($user): void {
                $query->where('access_blocks.id', $user->block_id)->orWhere('access_blocks.mayor_id', $user->id)
                    ->orWhereIn('access_blocks.id', DB::table('subject_enrollments')->where('user_id', $user->id)->select('block_id'));
            })->pluck('access_blocks.id')->all();
    }

    /** Restrict class content to existing membership or a matching active subject enrollment. */
    public static function scope(Builder|QueryBuilder $query, User $user, string $table): Builder|QueryBuilder
    {
        $termId = DB::table('terms')->where('is_active', true)->value('id');
        $classified = $termId && app(StudentEnrollmentService::class)->profile($user->id, $termId);
        return $query->whereIn("$table.block_id", self::blockIds($user))
            ->where(function ($allowed) use ($user, $table, $classified): void {
                $allowed->whereRaw('1 = 0');
                if (! $classified) {
                    $allowed->orWhere("$table.block_id", $user->block_id);
                }
                $allowed->orWhereIn("$table.block_id", DB::table('blocks')->where('mayor_id', $user->id)->select('id'))
                    ->orWhereExists(function (QueryBuilder $enrollment) use ($user, $table): void {
                        $enrollment->selectRaw('1')->from('subject_enrollments as access_enrollments')
                            ->where('access_enrollments.user_id', $user->id)
                            ->whereColumn('access_enrollments.block_id', "$table.block_id")
                            ->where(function (QueryBuilder $subject) use ($table): void {
                                $subject->whereNull("$table.subject_id")->orWhereColumn('access_enrollments.subject_id', "$table.subject_id");
                            });
                    });
            });
    }

    public static function canAccess(User $user, int $blockId, ?int $subjectId = null): bool
    {
        if (! in_array($blockId, self::blockIds($user), true)) {
            return false;
        }
        $termId = DB::table('blocks')->where('id', $blockId)->value('term_id');
        $classified = app(StudentEnrollmentService::class)->profile($user->id, $termId);
        if ((! $classified && (int) $user->block_id === $blockId) || DB::table('blocks')->where('id', $blockId)->where('mayor_id', $user->id)->exists()) {
            return true;
        }

        return DB::table('subject_enrollments')->where('user_id', $user->id)->where('block_id', $blockId)
            ->when($subjectId !== null, fn (QueryBuilder $query) => $query->where('subject_id', $subjectId))->exists();
    }

    /** Correlated to the block alias used by BlockController. */
    public static function memberCountSql(): string
    {
        return '(SELECT COUNT(*) FROM users u WHERE u.block_id = b.id OR u.id = b.mayor_id OR EXISTS '
            .'(SELECT 1 FROM subject_enrollments e WHERE e.user_id = u.id AND e.block_id = b.id)) as member_count';
    }
}
