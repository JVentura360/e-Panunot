<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use NotificationChannels\WebPush\PushSubscription;

class PushSubscriptionController extends Controller
{
    public function publicKey(): JsonResponse
    {
        $publicKey = config('webpush.vapid.public_key');
        $privateKey = config('webpush.vapid.private_key');

        if (! filled($publicKey) || ! filled($privateKey)) {
            return response()->json(['message' => 'Browser push notifications are not configured.'], 503);
        }

        return response()->json(['public_key' => $publicKey]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'max:'.PushSubscription::ENDPOINT_MAX_LENGTH],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'contentEncoding' => ['nullable', 'string', 'in:aes128gcm,aesgcm'],
        ]);

        if (! $this->isSupportedEndpoint($data['endpoint'])) {
            throw ValidationException::withMessages([
                'endpoint' => 'The push endpoint must belong to a supported browser push service.',
            ]);
        }

        $request->user()->updatePushSubscription(
            $data['endpoint'],
            $data['keys']['p256dh'],
            $data['keys']['auth'],
            $data['contentEncoding'] ?? null,
        );

        return response()->json(['subscribed' => true], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'max:'.PushSubscription::ENDPOINT_MAX_LENGTH],
        ]);

        $request->user()->deletePushSubscription($data['endpoint']);

        return response()->json(['subscribed' => false]);
    }

    private function isSupportedEndpoint(string $endpoint): bool
    {
        $parts = parse_url($endpoint);

        if (! is_array($parts)
            || strtolower($parts['scheme'] ?? '') !== 'https'
            || (isset($parts['port']) && $parts['port'] !== 443)
            || isset($parts['user'])
            || isset($parts['pass'])) {
            return false;
        }

        $host = strtolower($parts['host'] ?? '');

        foreach (['.push.apple.com', '.push.services.mozilla.com', '.notify.windows.com'] as $suffix) {
            if ($host !== '' && str_ends_with($host, $suffix)) {
                return true;
            }
        }

        return $host === 'fcm.googleapis.com';
    }
}
