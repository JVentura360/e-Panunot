<?php

namespace App\Services;
use App\Jobs\SyncBlockCalendarAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentEnrollmentService
{
    public function profile(int $userId, int $termId): ?object
    {
        return DB::table('student_term_profiles')->where('user_id', $userId)->where('term_id', $termId)->first();
    }

    public function hasMembership(int $userId, int $termId): bool
    {
        $primary = DB::table('users')->where('id', $userId)->value('block_id');
        return DB::table('blocks')->where('term_id', $termId)->where(function ($query) use ($primary, $userId): void {
            $query->where('id', $primary)->orWhere('mayor_id', $userId);
        })->exists() || DB::table('subject_enrollments')->where('user_id', $userId)->where('term_id', $termId)->exists();
    }

    public function snapshot(int $userId): array
    {
        $term = DB::table('terms')->where('is_active', true)->first();
        $user = DB::table('users')->where('id', $userId)->first();
        $profile = $term ? $this->profile($userId, $term->id) : null;
        $pending = $term ? $this->pendingJoin($userId, $term->id) : null;
        $mayorBlock = $term ? DB::table('blocks')->where('term_id', $term->id)->where('mayor_id', $userId)->first() : null;
        $reason = ! $term ? 'There is no active school term.' : ($user->role === 'admin' ? 'Admins cannot apply as mayor.'
            : ($mayorBlock ? 'You are already an appointed mayor.' : ($pending ? 'Wait for your block join request to be approved, or cancel it first.' : ($this->hasMembership($userId, $term->id)
                ? 'You already belong to a block with an assigned mayor.' : ($profile?->student_type === 'irregular' ? 'Only regular students can apply as mayor.' : null)))));
        $primaryBlockId = $term ? DB::table('blocks')->where('id', $user->block_id)->where('term_id', $term->id)->value('id') : null;
        return ['term' => $term, 'profile' => $profile, 'primary_block_id' => $primaryBlockId, 'mayor_block_id' => $mayorBlock?->id,
            'pending_join_request' => $pending ? ['id' => $pending->id, 'block_id' => $pending->block_id,
                'block_code' => \App\Http\Resources\BlockResource::makeCode($pending->year_level, $term->semester, $pending->program, $pending->block_number),
                'status' => 'pending', 'student_type' => $pending->student_type, 'mayor_name' => $pending->mayor_name] : null,
            'mayor_needs_reconciliation' => (bool) $mayorBlock && ($profile?->student_type !== 'regular' || (int) $profile?->regular_block_id !== (int) $mayorBlock->id),
            'can_apply_as_mayor' => $reason === null, 'mayor_application_disabled_reason' => $reason];
    }

    public function pendingJoin(int $userId, int $termId): ?object
    {
        return DB::table('block_join_requests as r')->join('blocks as b', 'b.id', '=', 'r.block_id')
            ->leftJoin('users as m', 'm.id', '=', 'b.mayor_id')->where('r.user_id', $userId)->where('r.status', 'pending')
            ->where('b.term_id', $termId)->orderByDesc('r.id')->first(['r.*', 'b.program', 'b.year_level', 'b.block_number', 'm.name as mayor_name']);
    }

    public function confirmIrregular(int $userId): array
    {
        return DB::transaction(function () use ($userId): array {
            $term = DB::table('terms')->where('is_active', true)->lockForUpdate()->first();
            abort_unless($term, 422, 'There is no active school term.');
            $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_if($user->role === 'admin', 403, 'Admins cannot enroll.');
            abort_if($this->pendingJoin($userId, $term->id), 422, 'Cancel your pending join request before changing your status.');
            abort_if(DB::table('blocks')->where('term_id', $term->id)->where('mayor_id', $userId)->exists(), 422, 'An appointed mayor must be a regular student.');
            $profile = $this->profile($userId, $term->id);
            abort_if($profile && $profile->student_type !== 'irregular', 422, 'Your classification is already regular. Individual changes are unavailable.');
            $this->saveProfile($userId, $term->id, 'irregular', null);
            return $this->snapshot($userId);
        }, 3);
    }

    public function enrollBlock(int $userId, int $blockId, string $studentType, array $subjectIds = [], bool $joining = false): array
    {
        $candidate = DB::table('blocks')->where('id', $blockId)->first();
        abort_unless($candidate, 404, 'Block not found.');
        return DB::transaction(function () use ($userId, $blockId, $studentType, $subjectIds, $candidate, $joining): array {
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            abort_unless($term && $term->is_active, 422, 'This block is not open this term.');
            $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_if($user->role === 'admin', 403, 'Admins cannot enroll.');
            $primaryBlockId = DB::table('blocks')->where('id', $user->block_id)->where('term_id', $term->id)->value('id');
            abort_if($joining && $primaryBlockId && (int) $primaryBlockId !== $blockId, 422, 'You already belong to a block. Joining another block cannot replace your membership.');
            abort_if(! $joining && $studentType === 'irregular' && ! $primaryBlockId, 422, 'Join a block before enrolling in subjects.');
            $block = DB::table('blocks')->where('id', $blockId)->lockForUpdate()->first();
            abort_unless($block->mayor_id, 422, 'This block does not have an appointed mayor.');
            abort_unless(in_array($studentType, ['regular', 'irregular'], true), 422, 'Choose Regular or Irregular.');
            $mayorElsewhere = DB::table('blocks')->where('term_id', $term->id)->where('mayor_id', $userId)->first();
            abort_if(! $joining && ! $primaryBlockId && (! $mayorElsewhere || (int) $mayorElsewhere->id !== $blockId),
                422, 'Wait for the mayor to approve your block membership before enrolling.');
            abort_if($mayorElsewhere && ($studentType !== 'regular' || (int) $mayorElsewhere->id !== $blockId), 422, 'A mayor must be regular in their appointed block.');
            $profile = $this->profile($userId, $term->id);
            abort_if($profile && $profile->student_type !== $studentType, 422, 'Your classification is already set for this term.');
            abort_if($studentType === 'regular' && $profile?->regular_block_id && (int) $profile->regular_block_id !== $blockId, 422, 'Regular students can belong to only one regular block.');
            abort_if($studentType === 'regular' && $user->block_id && (int) $user->block_id !== $blockId
                && DB::table('blocks')->where('id', $user->block_id)->where('term_id', $term->id)->exists(), 422, 'You already belong to another block.');
            $offered = DB::table('block_subjects')->where('block_id', $blockId)->pluck('subject_id')->all();
            abort_unless($offered || $joining && $studentType === 'irregular', 422, 'The admin must assign this block a subject load before enrollment.');
            $selected = $studentType === 'regular' ? $offered : ($joining ? [] : array_values(array_unique(array_map('intval', $subjectIds))));
            abort_unless(($selected || $joining && $studentType === 'irregular') && ! array_diff($selected, $offered), 422, 'Choose applicable subjects offered in this block.');
            if (DB::table('subject_enrollments')->where('user_id', $userId)->where('term_id', $term->id)
                ->where(function ($query) use ($blockId, $selected, $studentType): void {
                    $query->where('block_id', '!=', $blockId);
                    if ($studentType === 'irregular') {
                        $query->whereIn('subject_id', $selected);
                    }
                })->exists()) {
                throw ValidationException::withMessages(['subject_ids' => 'You already have subjects in another block that conflict with this enrollment. Withdraw conflicting subjects before joining.']);
            }
            $this->saveProfile($userId, $term->id, $studentType, $studentType === 'regular' ? $blockId : null);
            foreach ($selected as $subjectId) {
                DB::table('subject_enrollments')->insertOrIgnore(['user_id' => $userId, 'term_id' => $term->id, 'block_id' => $blockId,
                    'subject_id' => $subjectId, 'created_at' => now(), 'updated_at' => now()]);
                $this->assignExistingTasks($userId, $blockId, (int) $subjectId);
            }
            if ($studentType === 'regular' || $joining) {
                DB::table('users')->where('id', $userId)->update(['block_id' => $blockId, 'updated_at' => now()]);
            }
            SyncBlockCalendarAccess::dispatch($blockId, $user->email, true)->afterCommit();
            return $this->snapshot($userId);
        }, 3);
    }

    public function syncRegularMembers(array $blockIds, array $previousSubjects): void
    {
        foreach ($blockIds as $blockId) {
            $block = DB::table('blocks')->where('id', $blockId)->first();
            $users = DB::table('student_term_profiles')->where('term_id', $block->term_id)->where('student_type', 'regular')
                ->where('regular_block_id', $blockId)->pluck('user_id')->all();
            if ($block->mayor_id) {
                $users[] = $block->mayor_id;
            }
            sort($users);
            $added = array_diff(DB::table('block_subjects')->where('block_id', $blockId)->pluck('subject_id')->all(), $previousSubjects[$blockId] ?? []);
            foreach (array_unique($users) as $userId) {
                if ((int) $block->mayor_id === (int) $userId && $this->snapshot((int) $userId)['mayor_needs_reconciliation']) {
                    $this->enrollBlock((int) $userId, (int) $blockId, 'regular');
                } else {
                    DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                    foreach ($added as $subjectId) {
                        DB::table('subject_enrollments')->insertOrIgnore(['user_id' => $userId, 'term_id' => $block->term_id,
                            'block_id' => $blockId, 'subject_id' => $subjectId, 'created_at' => now(), 'updated_at' => now()]);
                        $this->assignExistingTasks((int) $userId, (int) $blockId, (int) $subjectId);
                    }
                }
            }
        }
    }

    public function assignExistingTasks(int $userId, int $blockId, int $subjectId): void
    {
        foreach (DB::table('tasks')->where('block_id', $blockId)->where('subject_id', $subjectId)->pluck('id') as $taskId) {
            DB::table('task_assignments')->insertOrIgnore(['user_id' => $userId, 'task_id' => $taskId,
                'created_at' => now(), 'updated_at' => now()]);
        }
    }

    private function saveProfile(int $userId, int $termId, string $type, ?int $blockId): void
    {
        $key = ['user_id' => $userId, 'term_id' => $termId];
        $values = ['student_type' => $type, 'regular_block_id' => $blockId, 'updated_at' => now()];
        if ($this->profile($userId, $termId)) {
            DB::table('student_term_profiles')->where($key)->update($values);
        } else {
            DB::table('student_term_profiles')->insert($key + $values + ['created_at' => now()]);
        }
    }
}
