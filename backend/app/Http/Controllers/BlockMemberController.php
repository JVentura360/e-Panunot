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
            ->where('block_id', $blockId)
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
    public function store(Request $request, int $blockId)
    {
        $user = $this->requireUser();
        abort_if($user->role === \App\Enums\Role::Admin, 403, 'Admins cannot submit student join requests.');

        $block = $this->findBlock($blockId);

        // Only blocks of the running semester can be joined.
        $isOpen = DB::table('terms')
            ->where('id', $block->term_id)
            ->where('is_active', true)
            ->exists();

        if (! $isOpen) {
            throw ValidationException::withMessages([
                'block_id' => 'This block is not open for joining.',
            ]);
        }

        $joinRequest = DB::transaction(function () use ($user, $blockId) {
            // Lock the student's row so a double click cannot create two requests.
            $student = DB::table('users')->where('id', $user->id)->lockForUpdate()->first();

            if ($student->block_id) {
                throw ValidationException::withMessages([
                    'block_id' => (int) $student->block_id === $blockId
                        ? 'You are already a member of this block.'
                        : 'You already belong to a block.',
                ]);
            }

            $pending = DB::table('block_join_requests')
                ->where('user_id', $student->id)
                ->where('status', 'pending')
                ->first();

            if ($pending) {
                throw ValidationException::withMessages([
                    'request' => (int) $pending->block_id === $blockId
                        ? 'You already have a pending request for this block.'
                        : 'You already have a pending request for another block. Cancel it first.',
                ]);
            }

            $id = DB::table('block_join_requests')->insertGetId([
                'user_id' => $student->id,
                'block_id' => $blockId,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('block_join_requests')->where('id', $id)->first();
        });

        return response()->json([
            'message' => 'Join request submitted.',
            'data' => $joinRequest,
        ], 201);
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
            ->where('jr.user_id', $user->id)
            ->orderByDesc('jr.id')
            ->limit(20)
            ->get([
                'jr.id', 'jr.status', 'jr.block_id', 'jr.created_at', 'jr.reviewed_at',
                'b.program', 'b.year_level', 'b.block_number',
                't.semester',
                'mayor.name as mayor_name',
            ]);

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'status' => $row->status,
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
    public function cancel(int $requestId)
    {
        $user = $this->requireUser();

        $joinRequest = DB::table('block_join_requests')
            ->where('id', $requestId)
            ->where('user_id', $user->id)
            ->first();

        abort_if(! $joinRequest, 404, 'Join request not found.');

        if ($joinRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending requests can be cancelled.',
            ]);
        }

        DB::table('block_join_requests')->where('id', $requestId)->delete();

        return response()->json(['message' => 'Join request cancelled.']);
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

            abort_if(! $joinRequest, 404, 'Join request not found.');
            if ($joinRequest->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => 'Only pending join requests can be approved.',
                ]);
            }

            $student = DB::table('users')->where('id', $joinRequest->user_id)
                ->lockForUpdate()->first();
            abort_if(! $student, 404, 'Student not found.');

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

        abort_if(! $joinRequest, 404, 'Join request not found.');
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
            ->where('id', $memberId)->where('block_id', $blockId)->first();

        abort_if(! $member, 404, 'Member not found in this block.');

        if ((int) $block->mayor_id === (int) $memberId) {
            throw ValidationException::withMessages([
                'member' => 'The block mayor cannot be removed.',
            ]);
        }

        DB::transaction(function () use ($memberId, $blockId) {
            DB::table('users')->where('id', $memberId)->update([
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
