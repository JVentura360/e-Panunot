<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return $this->frontend('not_configured');
        }

        return Socialite::driver('google')->with(['prompt' => 'select_account'])->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return $this->frontend('cancelled');
        }

        try {
            $identity = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->frontend('login_failed');
        }

        $email = strtolower(trim((string) $identity->getEmail()));
        $domain = substr(strrchr($email, '@') ?: '', 1);
        $hostedDomain = strtolower((string) ($identity->user['hd'] ?? ''));
        $allowed = config('services.google.allowed_domains', []);

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)
            || ($identity->user['email_verified'] ?? false) !== true
            || ! in_array($domain, $allowed, true)
            || ! in_array($hostedDomain, $allowed, true)
            || ! $identity->getId()) {
            return $this->frontend('school_account_required');
        }

        $user = DB::transaction(function () use ($identity, $email): ?User {
            $user = User::where('google_id', $identity->getId())->lockForUpdate()->first();
            $emailOwner = User::where('email', $email)->lockForUpdate()->first();

            if ($emailOwner && (($user && $emailOwner->id !== $user->id)
                || ($emailOwner->google_id && $emailOwner->google_id !== (string) $identity->getId()))) {
                return null;
            }

            $user ??= $emailOwner ?? new User;
            if (! $user->exists) {
                $user->role = 'student';
            }
            $user->fill([
                'google_id' => $identity->getId(),
                'email' => $email,
                'name' => $identity->getName() ?: $email,
                'picture_url' => $identity->getAvatar(),
            ])->save();

            return $user;
        });

        if (! $user) {
            return $this->frontend('account_conflict');
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $this->frontend();
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    private function frontend(?string $error = null): RedirectResponse
    {
        $url = rtrim(config('services.google.frontend_url'), '/');

        return redirect()->away($url.($error ? '?auth_error='.$error : ''));
    }
}
