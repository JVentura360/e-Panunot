<?php

namespace App\Http\Controllers;

use App\Http\Resources\BlockResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MeController extends Controller
{
    public function update(Request $request, \App\Services\StudentEnrollmentService $enrollment): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);
        $request->user()->update(['name' => preg_replace('/\s+/u', ' ', trim($data['name']))]);
        return $this->show($request, $enrollment);
    }

    /**
     * GET /api/me
     *
     * The signed-in user in the shape the React app expects:
     *   role  = 'student' | 'mayor' | 'admin'
     *   block = the display code, e.g. "31-ITE-04" (null when they have no block)
     *
     * The mayor role is derived from blocks.mayor_id, so a stale 'mayor' value
     * left over from a previous semester never shows up in the UI.
     */
    public function show(Request $request, \App\Services\StudentEnrollmentService $enrollment)
    {
        $user = $request->user();
        $profile = $enrollment->snapshot($user->id);

        $block = $profile['primary_block_id']
            ? DB::table('blocks as b')
                ->join('terms as t', 't.id', '=', 'b.term_id')
                ->where('b.id', $profile['primary_block_id'])
                ->where('t.is_active', true)
                ->first(['b.id', 'b.program', 'b.year_level', 'b.block_number', 'b.mayor_id', 't.semester'])
            : null;

        $storedRole = $user->role instanceof \BackedEnum ? $user->role->value : $user->role;
        $isMayor = $block && (int) $block->mayor_id === (int) $user->id;

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'picture_url' => $user->picture_url,
                'student_type' => $profile['profile']?->student_type,
                'regular_block_id' => $profile['profile']?->regular_block_id,
                'mayor_needs_reconciliation' => $profile['mayor_needs_reconciliation'],
                'can_apply_as_mayor' => $profile['can_apply_as_mayor'],
                'mayor_application_disabled_reason' => $profile['mayor_application_disabled_reason'],
                'role' => $storedRole === 'admin' ? 'admin' : ($isMayor ? 'mayor' : 'student'),
                'block_id' => $block?->id,
                'block' => $block
                    ? BlockResource::makeCode($block->year_level, $block->semester, $block->program, $block->block_number)
                    : null,
                'enrollment_count' => DB::table('subject_enrollments as e')->join('terms as t', 't.id', '=', 'e.term_id')
                    ->where('e.user_id', $user->id)->where('t.is_active', true)->count(),
                'enrolled_block_ids' => DB::table('subject_enrollments as e')->join('terms as t', 't.id', '=', 'e.term_id')
                    ->where('e.user_id', $user->id)->where('t.is_active', true)->distinct()->pluck('e.block_id'),
            ],
        ]);
    }
}
