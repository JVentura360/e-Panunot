<?php

namespace App\Http\Controllers;

use App\Jobs\SyncBlockCalendarAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BlockMemberController extends Controller
{
    /**
     * GET /api/blocks/{blockId}/members
     * Admins and the block's mayor can view the member list.
     */
    public function index(int $blockId)
    {
        $user = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($user, $block);

        $members = DB::table('users')
            ->where('block_id', $blockId)
            ->select('id', 'name', 'email', 'picture_url', 'block_id', 'created_at')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $members,
            'count' => $members->count(),
        ]);
    }

    /**
     * POST /api/blocks/{blockId}/join-requests
     * A student requests to join a block.
     */
    public function store(Request $request, int $blockId)
    {
        $user = $this->requireUser();
        abort_if($user->role === 'admin', 403, 'Admins cannot submit student join requests.');

        $block = $this->findBlock($blockId);

        if ((int) $user->block_id === $blockId) {
            throw ValidationException::withMessages([
                'block_id' => 'You are already a member of this block.',
            ]);
        }

        $pendingOrApproved = DB::table('block_join_requests')
            ->where('user_id', $user->id)
            ->where('block_id', $blockId)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($pendingOrApproved) {
            throw ValidationException::withMessages([
                'request' => 'You already have a pending or approved request for this block.',
            ]);
        }

        $id = DB::table('block_join_requests')->insertGetId([
            'user_id' => $user->id,
            'block_id' => $blockId,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Join request submitted.',
            'data' => DB::table('block_join_requests')->where('id', $id)->first(),
        ], 201);
    }

    /**
     * GET /api/blocks/{blockId}/join-requests?status=pending
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

        return response()->json($query->orderByDesc('jr.created_at')->paginate(20));
    }

    /**
     * POST /api/blocks/{blockId}/join-requests/{requestId}/approve
     * Atomically changes request status and users.block_id.
     */
    public function approve(int $blockId, int $requestId)
    {
        $actor = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($actor, $block);

        $result = DB::transaction(function () use ($blockId, $requestId, $actor) {
            $joinRequest = DB::table('block_join_requests')
                ->where('id', $requestId)
                ->where('block_id', $blockId)
                ->lockForUpdate()
                ->first();

            abort_if(!$joinRequest, 404, 'Join request not found.');
            if ($joinRequest->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => 'Only pending join requests can be approved.',
                ]);
            }

            $student = DB::table('users')->where('id', $joinRequest->user_id)
                ->lockForUpdate()->first();
            abort_if(!$student, 404, 'Student not found.');

            if ($student->block_id && (int) $student->block_id !== $blockId) {
                throw ValidationException::withMessages([
                    'block_id' => 'This student already belongs to another block.',
                ]);
            }

            DB::table('users')->where('id', $student->id)->update([
                'block_id' => $blockId,
                'updated_at' => now(),
            ]);

            DB::table('block_join_requests')->where('id', $requestId)->update([
                'status' => 'approved',
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            // Close other pending requests for this student so they cannot be
            // approved into multiple blocks at the same time.
            DB::table('block_join_requests')
                ->where('user_id', $student->id)
                ->where('id', '!=', $requestId)
                ->where('status', 'pending')
                ->update([
                    'status' => 'rejected',
                    'reviewed_by' => $actor->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            SyncBlockCalendarAccess::dispatch($blockId, $student->email, true)->afterCommit();
            return [
                'request' => DB::table('block_join_requests')->where('id', $requestId)->first(),
                'member_count' => DB::table('users')->where('block_id', $blockId)->count(),
            ];
        });

        return response()->json([
            'message' => 'Join request approved and block membership updated.',
            'data' => $result,
        ]);
    }

    public function reject(int $blockId, int $requestId)
    {
        $actor = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($actor, $block);

        $joinRequest = DB::table('block_join_requests')
            ->where('id', $requestId)->where('block_id', $blockId)->first();

        abort_if(!$joinRequest, 404, 'Join request not found.');
        if ($joinRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending join requests can be rejected.',
            ]);
        }

        DB::table('block_join_requests')->where('id', $requestId)->update([
            'status' => 'rejected',
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Join request rejected.',
            'data' => DB::table('block_join_requests')->where('id', $requestId)->first(),
        ]);
    }

    public function destroyMember(int $blockId, int $memberId)
    {
        $actor = $this->requireUser();
        $block = $this->findBlock($blockId);
        $this->authorizeBlockManager($actor, $block);

        $member = DB::table('users')
            ->where('id', $memberId)->where('block_id', $blockId)->first();

        abort_if(!$member, 404, 'Member not found in this block.');

        DB::table('users')->where('id', $memberId)->update([
            'block_id' => null,
            'updated_at' => now(),
        ]);
        SyncBlockCalendarAccess::dispatch($blockId, $member->email, false);
        return response()->json(['message' => 'Member removed from block.']);
    }

    private function findBlock(int $blockId)
    {
        $block = DB::table('blocks')->where('id', $blockId)->first();
        abort_if(!$block, 404, 'Block not found.');
        return $block;
    }

    private function authorizeBlockManager($user, $block): void
    {
        abort_unless(
            $user->role === 'admin' || (int) $block->mayor_id === (int) $user->id,
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
