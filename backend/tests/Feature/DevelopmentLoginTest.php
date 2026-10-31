<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DevelopmentAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DevelopmentLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance('env', 'local');
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32))]);
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
    }

    public function test_accounts_are_distinct_and_seeding_is_repeatable(): void
    {
        $this->seed(DevelopmentAccountSeeder::class);
        $this->seed(DevelopmentAccountSeeder::class);
        $this->assertDatabaseCount('users', 5);
        $this->getJson('/auth/development/accounts')->assertOk()->assertJsonCount(5, 'data');
        $this->postJson('/auth/development/login', ['account' => 'student-one'])->assertNoContent();
        $first = auth('web')->id();
        $this->getJson('/api/me')->assertJsonPath('data.role', 'student');
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/development/login', ['account' => 'student-two'])->assertNoContent();
        $this->assertNotSame($first, auth('web')->id());
        $this->postJson('/auth/development/login', ['account' => 'mayor'])->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertJsonPath('data.role', 'mayor');
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/development/login', ['account' => 'admin'])->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertJsonPath('data.role', 'admin');
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/development/login', ['account' => 'new-student'])->assertNoContent();
        $this->assertNull(auth('web')->user()->block_id);
    }

    public function test_real_accounts_cannot_be_selected(): void
    {
        $user = User::factory()->admin()->create();
        $this->postJson('/auth/development/login', ['account' => (string) $user->id])->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_production_blocks_picker_login_and_seeding(): void
    {
        $this->app->instance('env', 'production');
        $this->getJson('/auth/development/accounts')->assertNotFound();
        $this->postJson('/auth/development/login', ['account' => 'admin'])->assertNotFound();
        (new DevelopmentAccountSeeder)->run();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_non_loopback_requests_are_blocked(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])
            ->getJson('/auth/development/accounts')->assertNotFound();
    }
}
