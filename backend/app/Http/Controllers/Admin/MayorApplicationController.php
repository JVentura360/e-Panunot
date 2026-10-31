<?php

namespace App\Http\Controllers\Admin;
use App\Http\Resources\MayorApplicationResource;
use App\Services\MayorApprovalService;
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

        return response()->json($query->orderByDesc('ma.created_at')->paginate(min((int) $request->input('per_page', 15), 100)));
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
    public function approve(MayorApprovalService $service, int $id)
    {
        $application = $service->approve($id, $this->requireAdmin());

        return response()->json([
            'message' => 'Mayor application approved.',
            'data' => new MayorApplicationResource($application),
        ]);
    }

    /**
     * POST /api/admin/mayor-applications/{id}/reject
     */
    public function reject(Request $request, MayorApprovalService $service, int $id)
    {
        $admin = $this->requireAdmin();
        $request->validate(['reason' => 'nullable|string|max:1000']);

        return response()->json([
            'message' => 'Mayor application rejected.',
            'data' => new MayorApplicationResource($service->reject($id, $admin)),
        ]);
    }

    private function requireAdmin()
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Unauthenticated.');
        abort_unless($user->role === \App\Enums\Role::Admin, 403, 'Admin access required.');
        return $user;
    }
}
