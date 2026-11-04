<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class BlockJoinService
{
    public function __construct(private StudentEnrollmentService $enrollment) {}

    public function submit(int $userId, int $blockId, string $studentType): array
    {
        $candidate = DB::table('blocks')->where('id', $blockId)->first();
        abort_unless($candidate, 404, 'Block not found.');
        return DB::transaction(function () use ($candidate, $userId, $blockId, $studentType): array {
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            abort_unless($term?->is_active, 422, 'This block is not open this term.');
            $student = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_if($student->role === 'admin', 403, 'Admins cannot join blocks.');
            abort_if($this->enrollment->hasMembership($userId, $term->id), 422, 'You already belong to a block.');
            abort_if(DB::table('mayor_applications')->where('user_id', $userId)->where('term_id', $term->id)->where('status', 'pending')->exists(),
                422, 'You already have a pending mayor application.');
            $profile = $this->enrollment->profile($userId, $term->id);
            abort_if($profile && $profile->student_type !== $studentType, 422, 'Your classification is already set for this term.');
            $block = DB::table('blocks')->where('id', $blockId)->lockForUpdate()->first();
            abort_unless($block?->mayor_id, 422, 'This block does not have an appointed mayor.');
            abort_if($studentType === 'regular' && ! DB::table('block_subjects')->where('block_id', $blockId)->exists(),
                422, 'The admin must assign this block a subject load first.');
            $pending = $this->enrollment->pendingJoin($userId, $term->id);
            if ($pending) {
                abort_unless((int) $pending->block_id === $blockId && $pending->student_type === $studentType,
                    422, 'Cancel your pending join request before choosing another block or status.');
                return $this->enrollment->snapshot($userId);
            }
            DB::table('block_join_requests')->insert(['user_id' => $userId, 'block_id' => $blockId,
                'student_type' => $studentType, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
            return $this->enrollment->snapshot($userId);
        }, 3);
    }

    public function review(int $actorId, int $blockId, int $requestId, string $action): array
    {
        abort_unless(in_array($action, ['approve', 'reject', 'cancel'], true), 422);
        $candidate = DB::table('block_join_requests as r')->join('blocks as b', 'b.id', '=', 'r.block_id')
            ->where('r.id', $requestId)->where('r.block_id', $blockId)->first(['r.user_id', 'b.term_id']);
        abort_unless($candidate, 404, 'Join request not found.');
        return DB::transaction(function () use ($candidate, $actorId, $blockId, $requestId, $action): array {
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            abort_unless($term?->is_active, 422, 'This request belongs to an inactive term.');
            DB::table('users')->where('id', $candidate->user_id)->lockForUpdate()->firstOrFail();
            $block = DB::table('blocks')->where('id', $blockId)->lockForUpdate()->first();
            $actor = DB::table('users')->where('id', $actorId)->first();
            abort_unless($action === 'cancel' ? $actorId === (int) $candidate->user_id
                : $actor?->role === 'admin' || (int) $block?->mayor_id === $actorId,
                403, 'Only this block’s mayor or an admin can review this request.');
            $request = DB::table('block_join_requests')->where('id', $requestId)->lockForUpdate()->first();
            abort_unless($request && $request->status === 'pending', 422, 'Only pending join requests can be changed.');
            if ($action === 'cancel') {
                DB::table('block_join_requests')->where('id', $requestId)->delete();
            } else {
                if ($action === 'approve') {
                    abort_unless(in_array($request->student_type, ['regular', 'irregular'], true), 422,
                        'Ask the student to cancel and resubmit this older request with their Regular or Irregular status.');
                    abort_if($this->enrollment->hasMembership($request->user_id, $term->id), 422, 'This student already belongs to a block.');
                }
                DB::table('block_join_requests')->where('id', $requestId)->update(['status' => $action === 'approve' ? 'approved' : 'rejected',
                    'reviewed_by' => $actorId, 'reviewed_at' => now(), 'updated_at' => now()]);
                if ($action === 'approve') {
                    return $this->enrollment->enrollBlock($request->user_id, $blockId, $request->student_type, [], true);
                }
            }
            return $this->enrollment->snapshot($candidate->user_id);
        }, 3);
    }
}
