<?php

namespace App\Http\Controllers\Mayor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Services\SubjectLoadService;

class ApplicationController extends Controller
{
    /**
     * GET /api/mayor-applications/mine
     */
    public function mine()
    {
        $user = $this->requireUser();

        $applications = DB::table('mayor_applications as ma')
            ->join('terms as t', 't.id', '=', 'ma.term_id')
            ->leftJoin('blocks as b', 'b.id', '=', 'ma.block_id')
            ->where('ma.user_id', $user->id)
            ->select('ma.*', 't.school_year', 't.semester', 'b.mayor_id')
            ->orderByDesc('ma.created_at')
            ->get();

        return response()->json(['data' => $applications]);
    }

    /**
     * POST /api/mayor-applications
     * Expected: program, year_level, block_number, motivation (optional).
     * Uses the currently active term from the terms table.
     */
    public function store(Request $request, SubjectLoadService $loads)
    {
        $user = $this->requireUser();

        $validated = $request->validate([
            'program' => 'required|string|max:20|regex:/^[a-zA-Z0-9]+$/',
            'year_level' => 'required|integer|between:1,4',
            'block_number' => 'required|integer|min:1|max:255',
            'motivation' => 'nullable|string|max:10000',
            'proposed_subjects' => 'sometimes|nullable|array|max:60',
            'expected_term_id' => 'sometimes|required|integer',
            'expected_load_revision' => 'sometimes|required|integer|min:0',
            'is_regular_student' => ['required', 'accepted'],
        ]);
        $validated['program'] = mb_strtoupper(trim($validated['program']));

        $application = DB::transaction(function () use ($validated, $user, $loads) {
            $term = DB::table('terms')->where('is_active', 1)->lockForUpdate()->first();
            if (!$term) {
                throw ValidationException::withMessages([
                    'term' => 'There is no active school term for applications.',
                ]);
            }
            $eligibility = app(\App\Services\StudentEnrollmentService::class)->snapshot($user->id);
            abort_unless($eligibility['can_apply_as_mayor'], 403, $eligibility['mayor_application_disabled_reason']);

            $load = $loads->find($term->id, $validated['program'], $validated['year_level']);
            abort_if(isset($validated['expected_term_id']) && (int) $validated['expected_term_id'] !== (int) $term->id,
                409, 'The active term changed. Reload the application before submitting.');
            abort_if(isset($validated['expected_load_revision']) && (int) $validated['expected_load_revision'] !== ($load?->revision ?? 0),
                409, 'The approved load changed. Reload and review it before submitting.');
            if ($load && ! empty($validated['proposed_subjects'])) {
                throw ValidationException::withMessages(['proposed_subjects' => 'An approved load already exists. Only the admin can change it. Reload the application.']);
            }
            $proposal = $load ? null : $loads->normalizeSubjects($validated['proposed_subjects'] ?? []);

            $existing = DB::table('mayor_applications')
                ->where('term_id', $term->id)
                ->where('user_id', $user->id)
                ->whereIn('status', ['pending', 'approved'])
                ->exists();

            if ($existing) {
                throw ValidationException::withMessages([
                    'application' => 'You already have a pending or approved mayor application for this term.',
                ]);
            }

            $block = DB::table('blocks')
                ->where('term_id', $term->id)
                ->where('program', $validated['program'])
                ->where('year_level', $validated['year_level'])
                ->where('block_number', $validated['block_number'])
                ->first();

            if ($block && $block->mayor_id) {
                throw ValidationException::withMessages([
                    'block_number' => 'This block already has a mayor.',
                ]);
            }

            $id = DB::table('mayor_applications')->insertGetId([
                'term_id' => $term->id,
                'user_id' => $user->id,
                'program' => $validated['program'],
                'year_level' => $validated['year_level'],
                'block_number' => $validated['block_number'],
                'motivation' => $validated['motivation'] ?? null,
                'proposed_subjects' => $proposal ? json_encode($proposal, JSON_THROW_ON_ERROR) : null,
                'subject_load_revision' => $load?->revision,
                'is_regular_student' => true,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return DB::table('mayor_applications')->where('id', $id)->first();
        });

        return response()->json([
            'message' => 'Mayor application submitted for review.',
            'data' => $application,
        ], 201);
    }

    public function showMine(int $id)
    {
        $user = $this->requireUser();
        $application = DB::table('mayor_applications')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        abort_if(!$application, 404, 'Application not found.');

        return response()->json(['data' => $application]);
    }

    private function requireUser()
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Unauthenticated.');
        return $user;
    }
}
