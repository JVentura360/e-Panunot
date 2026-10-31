<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\BlockResource;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BlockController extends Controller
{
    /**
     * GET /api/blocks
     * Optional filters: term_id, program, year_level.
     */
    public function index(Request $request)
    {
        $this->requireUser();

        $request->validate([
            'term_id' => 'sometimes|integer|exists:terms,id',
            'program' => 'sometimes|string|max:20',
            'year_level' => 'sometimes|integer|min:1|max:255',
        ]);

        $query = DB::table('blocks as b')
            ->join('terms as t', 't.id', '=', 'b.term_id')
            ->leftJoin('users as mayor', 'mayor.id', '=', 'b.mayor_id')
            ->select(
                'b.*',
                't.school_year',
                't.semester',
                't.is_active as term_is_active',
                'mayor.name as mayor_name',
                'mayor.email as mayor_email',
                DB::raw('(SELECT COUNT(*) FROM users u WHERE u.block_id = b.id) as member_count')
            );

        foreach (['term_id', 'program', 'year_level'] as $filter) {
            if ($request->filled($filter)) {
                $query->where("b.$filter", $request->input($filter));
            }
        }

        return response()->json($query->orderBy('b.program')
            ->orderBy('b.year_level')->orderBy('b.block_number')->paginate(min((int) $request->input('per_page', 20), 100)));
    }

    /**
     * GET /api/blocks/lookup?code=31-ITE-04
     *
     * Lets a student find a block of the CURRENT semester by its display code:
     *   31-ITE-04 = year level 3, semester 1, program ITE, block number 04.
     * Returns only public block info (never the member list).
     */
    public function lookup(Request $request)
    {
        $user = $this->requireUser();

        $request->validate(['code' => 'required|string|max:30']);

        $code = strtoupper(trim($request->input('code')));

        if (! preg_match('/^(\d)([12])-([A-Z0-9]+)-(\d{1,2})$/', $code, $parts)) {
            throw ValidationException::withMessages([
                'code' => 'Enter a block code like 31-ITE-04.',
            ]);
        }

        [, $year, $semester, $program, $number] = $parts;

        $block = DB::table('blocks as b')
            ->join('terms as t', 't.id', '=', 'b.term_id')
            ->leftJoin('users as mayor', 'mayor.id', '=', 'b.mayor_id')
            ->where('t.is_active', true)
            ->where('t.semester', (int) $semester)
            ->where('b.year_level', (int) $year)
            ->where('b.program', $program)
            ->where('b.block_number', (int) $number)
            ->select(
                'b.id', 'b.program', 'b.year_level', 'b.block_number',
                't.school_year', 't.semester',
                'mayor.name as mayor_name',
                DB::raw('(SELECT COUNT(*) FROM users u WHERE u.block_id = b.id) as member_count')
            )
            ->first();

        abort_if(! $block, 404, 'No block with that code is open this semester.');

        $myRequest = DB::table('block_join_requests')
            ->where('user_id', $user->id)
            ->where('block_id', $block->id)
            ->orderByDesc('id')
            ->first(['id', 'status']);

        return response()->json([
            'data' => [
                'id' => $block->id,
                'code' => BlockResource::makeCode($block->year_level, $block->semester, $block->program, $block->block_number),
                'mayor_name' => $block->mayor_name,
                'member_count' => (int) $block->member_count,
                'school_year' => $block->school_year,
                'semester' => (int) $block->semester,
                'already_member' => (int) $user->block_id === (int) $block->id,
                'my_request' => $myRequest ? ['id' => $myRequest->id, 'status' => $myRequest->status] : null,
            ],
        ]);
    }

    public function show(int $id)
    {
        $user = $this->requireUser();

        $block = DB::table('blocks as b')
            ->join('terms as t', 't.id', '=', 'b.term_id')
            ->leftJoin('users as mayor', 'mayor.id', '=', 'b.mayor_id')
            ->where('b.id', $id)
            ->select('b.*', 't.school_year', 't.semester', 'mayor.name as mayor_name',
                DB::raw('(SELECT COUNT(*) FROM users u WHERE u.block_id = b.id) as member_count'))
            ->first();

        abort_if(!$block, 404, 'Block not found.');

        // Students may view a block to request to join it; no private user data is returned.
        return response()->json(['data' => $block]);
    }

    public function store(Request $request)
    {
        $this->requireAdmin();

        $validated = $request->validate([
            'term_id' => 'required|integer|exists:terms,id',
            'program' => 'required|string|max:20',
            'year_level' => 'required|integer|min:1|max:255',
            'block_number' => [
                'required', 'integer', 'min:1', 'max:255',
                Rule::unique('blocks')->where(fn ($q) => $q
                    ->where('term_id', $request->input('term_id'))
                    ->where('program', $request->input('program'))
                    ->where('year_level', $request->input('year_level'))),
            ],
        ]);

        $id = DB::table('blocks')->insertGetId($validated + [
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Block created.',
            'data' => DB::table('blocks')->where('id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $this->requireAdmin();
        $block = DB::table('blocks')->where('id', $id)->first();
        abort_if(!$block, 404, 'Block not found.');

        $validated = $request->validate([
            'term_id' => 'sometimes|required|integer|exists:terms,id',
            'program' => 'sometimes|required|string|max:20',
            'year_level' => 'sometimes|required|integer|min:1|max:255',
            'block_number' => 'sometimes|required|integer|min:1|max:255',
        ]);

        $candidate = array_merge((array) $block, $validated);
        $duplicate = DB::table('blocks')
            ->where('term_id', $candidate['term_id'])
            ->where('program', $candidate['program'])
            ->where('year_level', $candidate['year_level'])
            ->where('block_number', $candidate['block_number'])
            ->where('id', '!=', $id)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'A block with these details already exists.'], 422);
        }

        if ($validated) {
            $validated['updated_at'] = now();
            DB::table('blocks')->where('id', $id)->update($validated);
        }

        return response()->json([
            'message' => 'Block updated.',
            'data' => DB::table('blocks')->where('id', $id)->first(),
        ]);
    }

    public function destroy(int $id)
    {
        $this->requireAdmin();
        $block = DB::table('blocks')->where('id', $id)->first();
        abort_if(!$block, 404, 'Block not found.');

        DB::table('blocks')->where('id', $id)->delete();

        return response()->json(['message' => 'Block deleted.']);
    }

    private function requireUser()
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Unauthenticated.');
        return $user;
    }

    private function requireAdmin()
    {
        $user = $this->requireUser();
        abort_unless($user->role === \App\Enums\Role::Admin, 403, 'Admin access required.');
        return $user;
    }
}
