<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('a', 32)),
            'services.google.client_id' => 'test-client',
            'services.google.client_secret' => 'test-secret',
            'services.google.frontend_url' => 'http://localhost:5173',
            'services.google.allowed_domains' => ['udd.edu.ph', 'cdd.edu.ph'],
        ]);
    }

    private function mockIdentity(string $email, bool $verified, ?string $domain, string $id = 'google-123'): void
    {
        $identity = (new GoogleUser)->setRaw(['email_verified' => $verified, 'hd' => $domain])
            ->map(['id' => $id, 'email' => $email, 'name' => 'School Student', 'avatar' => null]);
        $provider = Mockery::mock();
        $provider->shouldReceive('user')->once()->andReturn($identity);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    #[DataProvider('schoolDomains')]
    public function test_school_account_creates_student_session(string $domain): void
    {
        $this->mockIdentity('student@'.$domain, true, $domain);
        $this->get('/auth/google/callback')->assertRedirect('http://localhost:5173');
        $user = User::where('google_id', 'google-123')->sole();
        $this->assertSame('student', $user->role->value);
        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public static function schoolDomains(): array
    {
        return [['udd.edu.ph'], ['cdd.edu.ph']];
    }

    #[DataProvider('invalidIdentities')]
    public function test_disallowed_identity_cannot_create_account(string $email, bool $verified, ?string $domain): void
    {
        $this->mockIdentity($email, $verified, $domain);
        $this->get('/auth/google/callback')->assertRedirect('http://localhost:5173?auth_error=school_account_required');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    public static function invalidIdentities(): array
    {
        return [
            ['student@gmail.com', true, 'gmail.com'],
            ['student@udd.edu.ph.attacker.com', true, 'udd.edu.ph'],
            ['student@udd.edu.ph', false, 'udd.edu.ph'],
            ['student@udd.edu.ph', true, null],
            ['student@udd.edu.ph', true, 'other.edu.ph'],
        ];
    }

    public function test_existing_role_is_preserved(): void
    {
        $user = User::factory()->admin()->create(['email' => 'admin@udd.edu.ph', 'google_id' => 'google-123']);
        $this->mockIdentity($user->email, true, 'udd.edu.ph');
        $this->get('/auth/google/callback')->assertRedirect('http://localhost:5173');
        $this->assertAuthenticatedAs($user);
        $this->assertSame('admin', $user->fresh()->role->value);
    }

    public function test_email_with_different_google_identity_is_not_linked(): void
    {
        User::factory()->create(['email' => 'student@udd.edu.ph', 'google_id' => 'different-id']);
        $this->mockIdentity('student@udd.edu.ph', true, 'udd.edu.ph');
        $this->get('/auth/google/callback')->assertRedirect('http://localhost:5173?auth_error=account_conflict');
        $this->assertGuest();
    }

    public function test_invalid_oauth_state_does_not_log_in(): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('user')->andThrow(new InvalidStateException);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
        $this->get('/auth/google/callback')->assertRedirect('http://localhost:5173?auth_error=login_failed');
        $this->assertGuest();
    }

    public function test_consent_denial_returns_safe_error(): void
    {
        $this->get('/auth/google/callback?error=access_denied')
            ->assertRedirect('http://localhost:5173?auth_error=cancelled');
        $this->assertGuest();
    }

    public function test_logout_ends_session(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/logout')->assertNoContent();
        $this->assertGuest();
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
