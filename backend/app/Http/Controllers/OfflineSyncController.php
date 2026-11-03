<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Services\OfflineSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineSyncController extends Controller
{
    public function store(Request $request, OfflineSyncService $sync): JsonResponse
    {
        $values = $request->validate([
            'account_id' => ['required', 'integer'],
            'operations' => ['required', 'array', 'min:1', 'max:100'],
            'operations.*' => ['required', 'array'],
            'operations.*.operation_id' => ['required', 'uuid', 'distinct'],
        ]);
        abort_unless((int) $values['account_id'] === (int) $request->user()->id, 403);
        abort_unless(in_array($request->user()->role, [Role::Student, Role::Mayor], true), 403);
        $results = [];
        foreach ($request->input('operations') as $operation) {
            $results[] = $sync->replay($request->user(), $operation);
        }
        return response()->json(['data' => ['results' => $results]]);
    }
}
