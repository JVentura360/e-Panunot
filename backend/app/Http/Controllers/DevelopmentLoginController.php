<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DevelopmentAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DevelopmentLoginController extends Controller
{
    private function requireLocalAccess(Request $request): void
    {
        abort_unless(app()->environment('local')
            && in_array($request->ip(), ['127.0.0.1', '::1'], true), 404);
    }

    public function index(Request $request): JsonResponse
    {
        $this->requireLocalAccess($request);
        $accounts = [];
        foreach (DevelopmentAccounts::ACCOUNTS as $key => $account) {
            $accounts[] = ['key' => $key, ...$account];
        }

        return response()->json(['data' => $accounts]);
    }

    public function login(Request $request): Response
    {
        $this->requireLocalAccess($request);
        $values = $request->validate([
            'account' => ['required', 'string', Rule::in(array_keys(DevelopmentAccounts::ACCOUNTS))],
        ]);
        $user = User::where('google_id', 'local-dev:'.$values['account'])->first();
        abort_unless($user, 409, 'Development accounts have not been seeded yet.');
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->noContent();
    }
}
