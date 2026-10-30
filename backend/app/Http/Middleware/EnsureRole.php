<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $role = $user?->role instanceof \BackedEnum ? $user->role->value : $user?->role;

        if (! $user || ! in_array($role, $roles, true)) {
            abort(403, 'You do not have permission to do this.');
        }

        return $next($request);
    }
}
