<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Resources\BlockResource;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubjectEnrollmentController extends Controller
{
    public function mine(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->ledger($request->user()->id)->get()->map($this->format(...))]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->role === Role::Admin, 403, 'Admins cannot enroll in subjects.');
        $data = $request->validate([
            'block_id' => ['required', 'integer', 'exists:blocks,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'student_type' => ['sometimes', 'in:irregular'],
        ]);

        $candidate = DB::table('blocks')->where('id', $data['block_id'])->first();
        abort_unless($candidate, 404, 'Block not found.');
        $enrollment = DB::transaction(function () use ($data, $user, $candidate): array {
            $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
            if (! $term || ! $term->is_active) {
                throw ValidationException::withMessages(['block_id' => 'This block is not open for enrollment.']);
            }
            $student = DB::table('users')->where('id', $user->id)->lockForUpdate()->first();
            abort_unless(DB::table('blocks')->where('id', $student->block_id)->where('term_id', $term->id)->exists(),
                422, 'Join a block before enrolling in subjects.');
            $block = DB::table('blocks')->where('id', $data['block_id'])->lockForUpdate()->first();
            abort_unless($block, 404, 'Block not found.');
            $enrollment = app(\App\Services\StudentEnrollmentService::class);
            $profile = $enrollment->profile($user->id, $term->id);
            abort_if($profile?->student_type === 'regular' || (int) $block->mayor_id === (int) $user->id, 422, 'Regular students and mayors use their complete block load.');
            abort_unless($profile || ($data['student_type'] ?? null) === 'irregular', 422, 'Choose Regular or Irregular before enrolling.');
            abort_unless($block->mayor_id, 422, 'This block does not have an appointed mayor.');
            if (! $profile) {
                $enrollment->confirmIrregular($user->id);
            }
            unset($data['student_type']);
            if (! DB::table('block_subjects')->where($data)->exists()) {
                throw ValidationException::withMessages(['subject_id' => 'This subject is not offered in the selected block.']);
            }
            if (DB::table('subject_enrollments')->where('user_id', $user->id)
                ->where('term_id', $term->id)->where('subject_id', $data['subject_id'])->exists()) {
                throw ValidationException::withMessages([
                    'subject_id' => 'You are already enrolled in this subject this term. Withdraw first to change blocks.',
                ]);
            }

            $id = DB::table('subject_enrollments')->insertGetId($data + [
                'user_id' => $user->id, 'term_id' => $term->id, 'created_at' => now(), 'updated_at' => now(),
            ]);

            return $this->format($this->ledger($user->id)->where('e.id', $id)->first());
        });

        return response()->json(['message' => 'Enrolled. Your ledger has been updated.',
            'data' => $enrollment,
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $existing = DB::table('subject_enrollments')->where('id', $id)->where('user_id', $request->user()->id)->first();
        abort_unless($existing, 404, 'Enrollment not found.');
        DB::transaction(function () use ($request, $id, $existing): void {
            $term = DB::table('terms')->where('id', $existing->term_id)->lockForUpdate()->first();
            abort_unless($term && $term->is_active, 422, 'Archived enrollment records cannot be changed.');
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $enrollment = DB::table('subject_enrollments')->where('id', $id)
                ->where('user_id', $request->user()->id)->first();
            abort_unless($enrollment, 404, 'Enrollment not found.');
            abort_unless(DB::table('terms')->where('id', $enrollment->term_id)->where('is_active', true)->exists(),
                422, 'Archived enrollment records cannot be changed.');
            DB::table('subject_enrollments')->where('id', $id)->delete();
        });

        return response()->json(['message' => 'Withdrawn from the subject.']);
    }

    private function ledger(int $userId): Builder
    {
        return DB::table('subject_enrollments as e')->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->join('blocks as b', 'b.id', '=', 'e.block_id')->join('terms as t', 't.id', '=', 'e.term_id')
            ->leftJoin('users as mayor', 'mayor.id', '=', 'b.mayor_id')
            ->where('e.user_id', $userId)->where('t.is_active', true)
            ->select('e.id', 'e.block_id', 'e.subject_id', 's.code', 's.name', 'b.program', 'b.year_level',
                'b.block_number', 't.school_year', 't.semester', 'mayor.name as mayor_name')
            ->orderBy('s.code');
    }

    private function format(object $row): array
    {
        return ['id' => $row->id, 'subject_id' => $row->subject_id, 'code' => $row->code, 'name' => $row->name,
            'block_id' => $row->block_id,
            'block_code' => BlockResource::makeCode($row->year_level, $row->semester, $row->program, $row->block_number),
            'school_year' => $row->school_year, 'semester' => $row->semester, 'mayor_name' => $row->mayor_name];
    }
}
