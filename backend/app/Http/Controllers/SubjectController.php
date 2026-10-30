<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SubjectController extends Controller
{
    /**
     * GET /api/subjects?block_id=1
     * Without block_id, returns the subject catalogue.
     */
    public function index(Request $request)
    {
        $user = $this->requireUser();

        $request->validate(['block_id' => 'sometimes|integer|exists:blocks,id']);

        if ($request->filled('block_id')) {
            $blockId = (int) $request->input('block_id');
            $block = DB::table('blocks')->where('id', $blockId)->first();
            abort_if(!$block, 404, 'Block not found.');

            // Subjects for a block are visible to admins, its mayor, and its members.
            abort_unless(
                $user->role === 'admin' ||
                (int) $block->mayor_id === (int) $user->id ||
                (int) $user->block_id === $blockId,
                403,
                'You cannot view subjects for this block.'
            );

            $subjects = DB::table('subjects as s')
                ->join('block_subjects as bs', 'bs.subject_id', '=', 's.id')
                ->where('bs.block_id', $blockId)
                ->select('s.*')
                ->orderBy('s.code')
                ->get();

            return response()->json(['data' => $subjects]);
        }

        return response()->json([
            'data' => DB::table('subjects')->orderBy('code')->paginate(30),
        ]);
    }

    public function show(int $id)
    {
        $this->requireUser();
        $subject = DB::table('subjects')->where('id', $id)->first();
        abort_if(!$subject, 404, 'Subject not found.');

        return response()->json(['data' => $subject]);
    }

    public function store(Request $request)
    {
        $this->requireAdmin();

        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:subjects,code',
            'name' => 'required|string|max:255',
        ]);

        $id = DB::table('subjects')->insertGetId($validated + [
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Subject created.',
            'data' => DB::table('subjects')->where('id', $id)->first(),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $this->requireAdmin();
        abort_unless(DB::table('subjects')->where('id', $id)->exists(), 404, 'Subject not found.');

        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('subjects', 'code')->ignore($id)],
            'name' => 'sometimes|required|string|max:255',
        ]);

        if ($validated) {
            $validated['updated_at'] = now();
            DB::table('subjects')->where('id', $id)->update($validated);
        }

        return response()->json([
            'message' => 'Subject updated.',
            'data' => DB::table('subjects')->where('id', $id)->first(),
        ]);
    }

    public function destroy(int $id)
    {
        $this->requireAdmin();
        abort_unless(DB::table('subjects')->where('id', $id)->exists(), 404, 'Subject not found.');

        DB::table('subjects')->where('id', $id)->delete();

        return response()->json(['message' => 'Subject deleted.']);
    }

    /**
     * PUT /api/blocks/{blockId}/subjects
     * Body: {"subject_ids":[1,2,3]}
     * Admins and the block's mayor may replace the block's subject list.
     */
    public function syncBlockSubjects(Request $request, int $blockId)
    {
        $user = $this->requireUser();
        $block = DB::table('blocks')->where('id', $blockId)->first();
        abort_if(!$block, 404, 'Block not found.');
        abort_unless(
            $user->role === 'admin' || (int) $block->mayor_id === (int) $user->id,
            403,
            'Only an admin or this block’s mayor can assign subjects.'
        );

        $validated = $request->validate([
            'subject_ids' => 'required|array',
            'subject_ids.*' => 'integer|distinct|exists:subjects,id',
        ]);

        DB::transaction(function () use ($blockId, $validated) {
            DB::table('block_subjects')->where('block_id', $blockId)->delete();

            $rows = [];
            foreach ($validated['subject_ids'] as $subjectId) {
                $rows[] = ['block_id' => $blockId, 'subject_id' => $subjectId];
            }

            if ($rows) {
                DB::table('block_subjects')->insert($rows);
            }
        });

        return response()->json([
            'message' => 'Block subjects updated.',
            'data' => DB::table('subjects as s')
                ->join('block_subjects as bs', 'bs.subject_id', '=', 's.id')
                ->where('bs.block_id', $blockId)
                ->select('s.*')
                ->orderBy('s.code')
                ->get(),
        ]);
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
