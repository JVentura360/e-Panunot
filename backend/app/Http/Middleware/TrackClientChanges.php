<?php

namespace App\Http\Middleware;

use App\Services\ClientSyncState;
use App\Services\SubjectAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackClientChanges
{
    public function handle(Request $request, Closure $next): Response
    {
        $write = ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        $blocks = $write && $request->user() ? SubjectAccess::blockIds($request->user()->fresh()) : [];
        $response = $next($request);
        if ($write && $request->user() && $response->isSuccessful()) {
            app(ClientSyncState::class)->changed($request, $blocks);
        }
        return $response;
    }
}
