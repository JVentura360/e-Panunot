<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_seeders_never_create_demo_data(): void
    {
        $this->app->instance('env', 'production');
        foreach (['DatabaseSeeder', 'DemoDataSeeder', 'SubjectSeeder', 'BlockSeeder', 'UserSeeder', 'TaskSeeder', 'ConcernSeeder', 'DevelopmentAccountSeeder'] as $name) {
            $this->artisan('db:seed', ['--class' => 'Database\\Seeders\\'.$name, '--force' => true])->assertSuccessful();
        }
        foreach (['users', 'blocks', 'subjects', 'tasks', 'concerns', 'terms'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_admin_setup_requires_a_real_existing_school_account(): void
    {
        $user = \App\Models\User::factory()->create(['email' => 'office@udd.edu.ph', 'google_id' => 'verified-google-id']);
        $this->artisan('app:promote-admin', ['email' => $user->email, '--force' => true])->assertSuccessful();
        $this->assertSame(\App\Enums\Role::Admin, $user->fresh()->role);
        $this->artisan('app:promote-admin', ['email' => $user->email, '--force' => true])->assertSuccessful();
        $demo = \App\Models\User::factory()->create(['email' => 'demo@udd.edu.ph', 'google_id' => 'local-dev:admin']);
        $this->artisan('app:promote-admin', ['email' => $demo->email, '--force' => true])->assertFailed();
        $this->artisan('app:promote-admin', ['email' => 'missing@udd.edu.ph', '--force' => true])->assertFailed();
        $this->assertSame(\App\Enums\Role::Student, $demo->fresh()->role);
        $mayor = \App\Models\User::factory()->create(['email' => 'mayor@udd.edu.ph', 'google_id' => 'real-mayor-id', 'role' => 'mayor']);
        $this->artisan('app:promote-admin', ['email' => $mayor->email, '--force' => true])->assertFailed();
        $this->assertSame(\App\Enums\Role::Mayor, $mayor->fresh()->role);
    }
}
