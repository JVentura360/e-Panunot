<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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
                DB::raw('(SELECT COUNT(*) FROM users u WHERE u.block_id = b.id) as member_count')
            );

        foreach (['term_id', 'program', 'year_level'] as $filter) {
            if ($request->filled($filter)) {
                $query->where("b.$filter", $request->input($filter));
            }
        }

        return response()->json($query->orderBy('b.program')
            ->orderBy('b.year_level')->orderBy('b.block_number')->paginate(20));
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
        abort_unless($user->role === 'admin', 403, 'Admin access required.');
        return $user;
    }
}
