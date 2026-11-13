<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdmin extends Command
{
    protected $signature = 'app:promote-admin {email : Existing school account email} {--force : Skip confirmation}';

    protected $description = 'Promote an existing Google-authenticated school account to admin';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $user = User::where('email', $email)->first();
        $domain = str_contains($email, '@') ? substr(strrchr($email, '@'), 1) : '';
        if (! $user || ! $user->google_id || str_starts_with($user->google_id, 'local-dev:')
            || (! in_array($domain, config('services.google.allowed_domains'), true)
                && ! in_array($email, config('services.google.admin_emails', []), true))) {
            $this->error('Sign in with an allowed school Google account first. Development accounts cannot be promoted here.');
            return self::FAILURE;
        }
        if ($user->role === Role::Admin) {
            $this->info('This account is already an admin.');
            return self::SUCCESS;
        }
        if ($user->role === Role::Mayor || $user->block_id
            || \Illuminate\Support\Facades\DB::table('subject_enrollments')->where('user_id', $user->id)->exists()) {
            $this->error('Use an account without block membership or a mayor role for admin setup.');
            return self::FAILURE;
        }
        if (! $this->option('force') && ! $this->confirm('Give '.$email.' administrator access?')) {
            return self::FAILURE;
        }
        $user->forceFill(['role' => Role::Admin])->save();
        $this->info('Administrator access granted. Sign out and sign back in.');
        return self::SUCCESS;
    }
}
