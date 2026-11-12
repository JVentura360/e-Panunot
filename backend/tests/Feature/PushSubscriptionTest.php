<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_status_is_scoped_to_the_signed_in_account(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $endpoint = 'https://fcm.googleapis.com/fcm/send/device';
        $owner->updatePushSubscription($endpoint, 'key', 'auth');

        $this->actingAs($owner)->postJson('/api/notifications/push-subscriptions/status', ['endpoint' => $endpoint])
            ->assertOk()->assertJson(['subscribed' => true]);
        $this->actingAs($other)->postJson('/api/notifications/push-subscriptions/status', ['endpoint' => $endpoint])
            ->assertOk()->assertJson(['subscribed' => false]);
    }

    public function test_logout_removes_only_this_devices_subscription(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $endpoint = 'https://fcm.googleapis.com/fcm/send/device';
        $user->updatePushSubscription($endpoint, 'key', 'auth');
        $user->updatePushSubscription($endpoint.'-second', 'key', 'auth');
        $other->updatePushSubscription($endpoint.'-other', 'key', 'auth');

        $this->actingAs($user, 'web')->postJson('/logout', ['push_endpoint' => $endpoint])->assertNoContent();

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => $endpoint]);
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $endpoint.'-second']);
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $endpoint.'-other']);
        $this->assertGuest('web');
    }

    public function test_logout_cannot_remove_another_accounts_subscription(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $endpoint = 'https://fcm.googleapis.com/fcm/send/other';
        $other->updatePushSubscription($endpoint, 'key', 'auth');

        $this->actingAs($user, 'web')->postJson('/logout', ['push_endpoint' => $endpoint])->assertNoContent();
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $endpoint]);
    }

    public function test_a_user_can_subscribe_and_unsubscribe_a_supported_push_endpoint(): void
    {
        $user = User::factory()->create();
        $subscription = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint',
            'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
            'contentEncoding' => 'aes128gcm',
        ];

        $this->actingAs($user)->postJson('/api/notifications/push-subscriptions', $subscription)
            ->assertCreated()
            ->assertJson(['subscribed' => true]);
        $this->assertDatabaseHas('push_subscriptions', [
            'subscribable_id' => $user->id,
            'subscribable_type' => $user->getMorphClass(),
            'endpoint' => $subscription['endpoint'],
        ]);

        $this->actingAs($user)->deleteJson('/api/notifications/push-subscriptions', [
            'endpoint' => $subscription['endpoint'],
        ])->assertOk()->assertJson(['subscribed' => false]);
        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => $subscription['endpoint']]);
    }

    public function test_it_rejects_non_https_and_non_push_service_endpoints(): void
    {
        $user = User::factory()->create();

        foreach ([
            'http://fcm.googleapis.com/fcm/send/token',
            'https://localhost/internal',
        ] as $endpoint) {
            $this->actingAs($user)->postJson('/api/notifications/push-subscriptions', [
                'endpoint' => $endpoint,
                'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
            ])->assertUnprocessable();
        }

        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    public function test_the_public_key_endpoint_requires_vapid_configuration(): void
    {
        config(['webpush.vapid.public_key' => null, 'webpush.vapid.private_key' => null]);
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/notifications/push/public-key')->assertServiceUnavailable();

        config(['webpush.vapid.public_key' => 'public-key', 'webpush.vapid.private_key' => 'private-key']);
        $this->actingAs($user)->getJson('/api/notifications/push/public-key')
            ->assertOk()
            ->assertJson(['public_key' => 'public-key']);
    }
}
