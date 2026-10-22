<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MayorApplicationController extends Controller
{
    /**
     * GET /api/admin/mayor-applications?status=pending
     */
    public function index(Request $request)
    {
        $this->requireAdmin();

        $query = DB::table('mayor_applications as ma')
            ->join('users as u', 'u.id', '=', 'ma.user_id')
            ->join('terms as t', 't.id', '=', 'ma.term_id')
            ->leftJoin('blocks as b', 'b.id', '=', 'ma.block_id')
            ->select(
                'ma.*',
                'u.name as applicant_name',
                'u.email as applicant_email',
                'u.picture_url as applicant_picture',
                't.school_year',
                't.semester',
                'b.id as assigned_block_id'
            );

        if ($request->filled('status')) {
            $request->validate([
                'status' => 'in:pending,approved,rejected',
            ]);
            $query->where('ma.status', $request->input('status'));
        }

        return response()->json($query->orderByDesc('ma.created_at')->paginate(15));
    }

    public function show(int $id)
    {
        $this->requireAdmin();

        $application = DB::table('mayor_applications as ma')
            ->join('users as u', 'u.id', '=', 'ma.user_id')
            ->join('terms as t', 't.id', '=', 'ma.term_id')
            ->leftJoin('blocks as b', 'b.id', '=', 'ma.block_id')
            ->where('ma.id', $id)
            ->select('ma.*', 'u.name as applicant_name', 'u.email as applicant_email',
                't.school_year', 't.semester', 'b.mayor_id as current_mayor_id')
            ->first();

        abort_if(!$application, 404, 'Mayor application not found.');

        return response()->json(['data' => $application]);
    }

    /**
     * POST /api/admin/mayor-applications/{id}/approve
     */
    public function approve(Request $request, int $id)
    {
        $admin = $this->requireAdmin();

        $data = DB::transaction(function () use ($id, $admin) {
            $application = DB::table('mayor_applications')
                ->where('id', $id)->lockForUpdate()->first();

            abort_if(!$application, 404, 'Mayor application not found.');
            if ($application->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => 'Only pending applications can be approved.',
                ]);
            }

            $term = DB::table('terms')->where('id', $application->term_id)->first();
            abort_if(!$term, 422, 'The application term no longer exists.');

            $block = DB::table('blocks')
                ->where('term_id', $application->term_id)
                ->where('program', $application->program)
                ->where('year_level', $application->year_level)
                ->where('block_number', $application->block_number)
                ->lockForUpdate()
                ->first();

            if (!$block) {
                $blockId = DB::table('blocks')->insertGetId([
                    'term_id' => $application->term_id,
                    'program' => $application->program,
                    'year_level' => $application->year_level,
                    'block_number' => $application->block_number,
                    'mayor_id' => $application->user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                if ($block->mayor_id && (int) $block->mayor_id !== (int) $application->user_id) {
                    throw ValidationException::withMessages([
                        'block' => 'This block already has an assigned mayor.',
                    ]);
                }

                $blockId = $block->id;
                DB::table('blocks')->where('id', $blockId)->update([
                    'mayor_id' => $application->user_id,
                    'updated_at' => now(),
                ]);
            }

            // The schema has no "mayor" value in users.role. A mayor is identified
            // by blocks.mayor_id, so do not try to update users.role.
            DB::table('mayor_applications')->where('id', $id)->update([
                'status' => 'approved',
                'block_id' => $blockId,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            // Prevent another pending application for the same applicant/term from
            // being approved later, while preserving the history of those records.
            DB::table('mayor_applications')
                ->where('user_id', $application->user_id)
                ->where('term_id', $application->term_id)
                ->where('id', '!=', $id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'rejected',
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            return DB::table('mayor_applications')->where('id', $id)->first();
        });

        return response()->json([
            'message' => 'Mayor application approved.',
            'data' => $data,
        ]);
    }

    /**
     * POST /api/admin/mayor-applications/{id}/reject
     */
    public function reject(Request $request, int $id)
    {
        $admin = $this->requireAdmin();
        $request->validate(['reason' => 'nullable|string|max:1000']);

        $application = DB::table('mayor_applications')->where('id', $id)->first();
        abort_if(!$application, 404, 'Mayor application not found.');
        if ($application->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending applications can be rejected.',
            ]);
        }

        DB::table('mayor_applications')->where('id', $id)->update([
            'status' => 'rejected',
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Mayor application rejected.',
            'data' => DB::table('mayor_applications')->where('id', $id)->first(),
        ]);
    }

    private function requireAdmin()
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Unauthenticated.');
        abort_unless($user->role === 'admin', 403, 'Admin access required.');
        return $user;
    }
}
