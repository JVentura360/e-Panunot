<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\Term;
use App\Models\User;
use App\Services\DevelopmentAccounts;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DevelopmentAccountSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        DB::transaction(function (): void {
            $term = Term::where('is_active', true)->first() ?? Term::firstOrCreate(['school_year' => '2099-2100', 'semester' => 1], [
                'starts_on' => '2099-08-01', 'ends_on' => '2100-01-31',
            ]);
            if (! $term->is_active) {
                $term->forceFill(['is_active' => true])->save();
            }
            $block = Block::firstOrCreate([
                'term_id' => $term->id, 'program' => 'DEV', 'year_level' => 3, 'block_number' => 1,
            ]);

            foreach (DevelopmentAccounts::ACCOUNTS as $key => $account) {
                $user = User::firstOrCreate(['google_id' => 'local-dev:'.$key], [
                    'email' => $key.'@epanunot.test',
                    'name' => $account['name'],
                    'block_id' => in_array($key, ['admin', 'new-student'], true) ? null : $block->id,
                ]);
                if ($user->wasRecentlyCreated) {
                    $user->role = $account['role'];
                    $user->save();
                }
                if ($key === 'mayor' && ! $block->mayor_id) {
                    $block->mayor_id = $user->id;
                    $block->save();
                }
            }
        });
    }
}
