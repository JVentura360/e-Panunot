<?php

namespace App\Http\Controllers;

use App\Services\SubjectLoadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectLoadController extends Controller
{
    private function scopeRules(): array
    {
        return ['program' => ['required', 'string', 'max:20', 'regex:/^[a-zA-Z0-9]+$/'],
            'year_level' => ['required', 'integer', 'between:1,4']];
    }

    public function show(Request $request, SubjectLoadService $loads): JsonResponse
    {
        $scope = $request->validate($this->scopeRules());
        $termId = DB::table('terms')->where('is_active', true)->value('id');
        abort_unless($termId, 422, 'There is no active school term.');

        return response()->json(['data' => $loads->snapshot($termId, $scope['program'], $scope['year_level'])]);
    }

    public function update(Request $request, SubjectLoadService $loads): JsonResponse
    {
        $data = $request->validate($this->scopeRules() + [
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'expected_revision' => ['required', 'integer', 'min:0'], 'subjects' => ['required', 'array', 'min:1', 'max:60'],
        ]);
        $snapshot = DB::transaction(function () use ($data, $request, $loads): array {
            $loads->publish($data['term_id'], $data['program'], $data['year_level'], $data['expected_revision'], $data['subjects'], $request->user()->id);

            return $loads->snapshot($data['term_id'], $data['program'], $data['year_level']);
        }, 3);

        return response()->json(['message' => 'Shared subject load saved for all matching blocks.', 'data' => $snapshot]);
    }

    public function rejectBlockMutation(): never
    {
        abort(403, 'Subject loads are managed by the admin. Use shared subject-load management.');
    }
}
