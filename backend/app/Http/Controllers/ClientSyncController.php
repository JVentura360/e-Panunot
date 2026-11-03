<?php

namespace App\Http\Controllers;

use App\Services\ClientSyncState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientSyncController extends Controller
{
    public function show(Request $request, ClientSyncState $state): JsonResponse
    {
        return response()->json(['data' => $state->snapshot($request->user())])->header('Cache-Control', 'no-store, private');
    }
}
