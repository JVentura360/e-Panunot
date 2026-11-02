<?php

namespace App\Http\Controllers;

use App\Services\StudentEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EnrollmentProfileController extends Controller
{
    public function legacyJoin(): never
    {
        abort(422, 'Join through My ledger and choose Regular or Irregular. Enrollment is immediate.');
    }

    public function show(Request $request, StudentEnrollmentService $enrollment): JsonResponse
    {
        return response()->json(['data' => $enrollment->snapshot($request->user()->id)]);
    }

    public function update(Request $request, StudentEnrollmentService $enrollment): JsonResponse
    {
        $request->validate(['student_type' => ['required', Rule::in(['irregular'])]]);
        return response()->json(['data' => $enrollment->confirmIrregular($request->user()->id)]);
    }

    public function enroll(Request $request, int $blockId, StudentEnrollmentService $enrollment): JsonResponse
    {
        $data = $request->validate(['student_type' => ['required', Rule::in(['regular', 'irregular'])],
            'subject_ids' => ['sometimes', 'array'], 'subject_ids.*' => ['integer', 'distinct']]);
        return response()->json(['data' => $enrollment->enrollBlock($request->user()->id, $blockId, $data['student_type'], $data['subject_ids'] ?? [])]);
    }

    public function join(Request $request, int $blockId, StudentEnrollmentService $enrollment): JsonResponse
    {
        $data = $request->validate(['student_type' => ['required', Rule::in(['regular', 'irregular'])],
            'subject_ids' => ['prohibited']]);
        return response()->json(['data' => $enrollment->enrollBlock($request->user()->id, $blockId, $data['student_type'], [], true)]);
    }

    public function reconcile(Request $request, StudentEnrollmentService $enrollment): JsonResponse
    {
        $blockId = DB::table('blocks as b')->join('terms as t', 't.id', '=', 'b.term_id')->where('t.is_active', true)
            ->where('b.mayor_id', $request->user()->id)->value('b.id');
        abort_unless($blockId, 403, 'Only an appointed mayor can reconcile their regular enrollment.');
        $snapshot = $enrollment->snapshot($request->user()->id);
        if (! $snapshot['mayor_needs_reconciliation']) {
            return response()->json(['data' => $snapshot]);
        }
        return response()->json(['data' => $enrollment->enrollBlock($request->user()->id, $blockId, 'regular')]);
    }
}
