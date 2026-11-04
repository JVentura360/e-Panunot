<?php

namespace App\Http\Controllers;

use App\Http\Resources\BlockMemberResource;
use App\Http\Resources\BlockResource;
use App\Jobs\SyncBlockCalendarAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BlockMemberController extends Controller
{
    /**
     * GET /api/blocks/{blockId}/members
     * Admins and the block's mayor can view the member list.
     * Each member has `is_mayor`, and the mayor is listed first.
     */
    public function index(int $blockId)
    {
        $user = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($user, $block);

        $members = DB::table('users')
            ->where(function ($query) use ($blockId, $block): void {
                $query->where('block_id', $blockId)->orWhere('id', $block->mayor_id)
                    ->orWhereIn('id', DB::table('subject_enrollments')->where('block_id', $blockId)->select('user_id'));
            })
            ->select('id', 'name', 'email', 'picture_url', 'block_id', 'created_at')
            ->orderBy('name')
            ->get();

        return BlockMemberResource::forBlock($members, $block)
            ->additional(['count' => $members->count()]);
    }

    /**
     * POST /api/blocks/{blockId}/join-requests
     * A student asks to join a block. This only creates a PENDING request;
     * nobody becomes a member until the mayor approves it.
     */
    public function store(Request $request, int $blockId): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate(['student_type' => ['required', 'in:regular,irregular'], 'subject_ids' => ['prohibited']]);
        return response()->json(['message' => 'Join request submitted. Please wait for mayor approval.',
            'data' => app(\App\Services\BlockJoinService::class)->submit($this->requireUser()->id, $blockId, $data['student_type'])]);
    }

    /**
     * GET /api/join-requests/mine
     * The signed-in student's own join requests (newest first).
     */
    public function mine()
    {
        $user = $this->requireUser();

        $rows = DB::table('block_join_requests as jr')
            ->join('blocks as b', 'b.id', '=', 'jr.block_id')
            ->join('terms as t', 't.id', '=', 'b.term_id')
            ->leftJoin('users as mayor', 'mayor.id', '=', 'b.mayor_id')
            ->where('jr.user_id', $user->id)->where('t.is_active', true)
            ->orderByDesc('jr.id')
            ->limit(20)
            ->get([
                'jr.id', 'jr.status', 'jr.student_type', 'jr.block_id', 'jr.created_at', 'jr.reviewed_at',
                'b.program', 'b.year_level', 'b.block_number',
                't.semester',
                'mayor.name as mayor_name',
            ]);

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'status' => $row->status,
                'student_type' => $row->student_type,
                'block_id' => $row->block_id,
                'block_code' => BlockResource::makeCode($row->year_level, $row->semester, $row->program, $row->block_number),
                'mayor_name' => $row->mayor_name,
                'created_at' => $row->created_at,
                'reviewed_at' => $row->reviewed_at,
            ])->values(),
        ]);
    }

    /**
     * DELETE /api/join-requests/{requestId}
     * A student cancels their own PENDING request.
     */
    public function cancel(int $requestId): \Illuminate\Http\JsonResponse
    {
        $user = $this->requireUser();
        $joinRequest = DB::table('block_join_requests')->where('id', $requestId)->where('user_id', $user->id)->first();
        abort_unless($joinRequest, 404, 'Join request not found.');
        return response()->json(['message' => 'Join request cancelled.',
            'data' => app(\App\Services\BlockJoinService::class)->review($user->id, $joinRequest->block_id, $requestId, 'cancel')]);
    }

    /**
     * GET /api/blocks/{blockId}/join-requests?status=pending&per_page=100
     */
    public function requests(Request $request, int $blockId)
    {
        $user = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($user, $block);

        $request->validate(['status' => 'sometimes|in:pending,approved,rejected']);

        $query = DB::table('block_join_requests as jr')
            ->join('users as u', 'u.id', '=', 'jr.user_id')
            ->where('jr.block_id', $blockId)
            ->select('jr.*', 'u.name as student_name', 'u.email as student_email',
                'u.picture_url as student_picture');

        if ($request->filled('status')) {
            $query->where('jr.status', $request->input('status'));
        }

        return response()->json(
            $query->orderByDesc('jr.created_at')->paginate(min((int) $request->input('per_page', 20), 100))
        );
    }

    /**
     * POST /api/blocks/{blockId}/join-requests/{requestId}/approve
     * Atomically changes request status and users.block_id.
     */
    public function approve(int $blockId, int $requestId): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Join request approved. The student is now a block member.',
            'data' => app(\App\Services\BlockJoinService::class)->review($this->requireUser()->id, $blockId, $requestId, 'approve')]);
    }

    public function reject(int $blockId, int $requestId): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Join request rejected.',
            'data' => app(\App\Services\BlockJoinService::class)->review($this->requireUser()->id, $blockId, $requestId, 'reject')]);
    }

    /**
     * DELETE /api/blocks/{blockId}/members/{memberId}
     * The mayor (or an admin) removes a member. The mayor cannot be removed.
     */
    public function destroyMember(int $blockId, int $memberId)
    {
        $actor = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($actor, $block);

        $member = DB::table('users')
            ->where('id', $memberId)->where(function ($query) use ($blockId): void {
                $query->where('block_id', $blockId)
                    ->orWhereIn('id', DB::table('subject_enrollments')->where('block_id', $blockId)->select('user_id'));
            })->first();

        abort_if(! $member, 404, 'Member not found in this block.');

        if ((int) $block->mayor_id === (int) $memberId) {
            throw ValidationException::withMessages([
                'member' => 'The block mayor cannot be removed.',
            ]);
        }

        DB::transaction(function () use ($memberId, $blockId) {
            $block = DB::table('blocks')->where('id', $blockId)->first();
            $term = DB::table('terms')->where('id', $block->term_id)->lockForUpdate()->first();
            abort_unless($term->is_active, 422, 'Archived block memberships cannot be changed.');
            DB::table('users')->where('id', $memberId)->lockForUpdate()->first();
            \App\Services\ConcernMembership::closeForRemoval($blockId, $memberId);
            DB::table('subject_enrollments')->where('user_id', $memberId)->where('block_id', $blockId)->delete();
            DB::table('student_term_profiles')->where('user_id', $memberId)->where('term_id', $block->term_id)->where('regular_block_id', $blockId)->delete();
            DB::table('users')->where('id', $memberId)->where('block_id', $blockId)->update([
                'block_id' => null,
                'updated_at' => now(),
            ]);

            // Stop tracking this block's tasks for the removed member.
            DB::table('task_assignments')
                ->where('user_id', $memberId)
                ->whereIn('task_id', DB::table('tasks')->where('block_id', $blockId)->select('id'))
                ->delete();
        });

        SyncBlockCalendarAccess::dispatch($blockId, $member->email, false);

        return response()->json(['message' => 'Member removed from block.']);
    }

    private function findBlock(int $blockId)
    {
        $block = DB::table('blocks')->where('id', $blockId)->first();
        abort_if(! $block, 404, 'Block not found.');

        return $block;
    }

    private function authorizeBlockManager($user, $block): void
    {
        abort_unless(
            $user->role === \App\Enums\Role::Admin || (int) $block->mayor_id === (int) $user->id,
            403,
            'Only an admin or this block’s mayor can manage its members.'
        );
    }

    private function requireUser()
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Unauthenticated.');

        return $user;
    }
}
