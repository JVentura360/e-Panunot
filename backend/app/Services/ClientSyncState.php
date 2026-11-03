<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ClientSyncState
{
    public function snapshot(User $user): array
    {
        $blocks = SubjectAccess::blockIds($user->fresh());
        sort($blocks);
        $groups = ['access' => ['access', 'identity:user:'.$user->id], 'catalog' => ['catalog'],
            'tasks' => ['tasks:user:'.$user->id], 'personal' => ['personal:user:'.$user->id],
            'calendar' => ['calendar:user:'.$user->id], 'concerns' => ['concerns:user:'.$user->id],
            'announcements' => [], 'admin' => $user->role === \App\Enums\Role::Admin ? ['admin'] : []];
        foreach (['tasks', 'calendar', 'concerns', 'announcements', 'catalog'] as $domain) {
            foreach ($blocks as $blockId) {
                $groups[$domain][] = $domain.':block:'.$blockId;
            }
        }
        $keys = array_unique(array_merge(...array_values($groups)));
        $values = Cache::many(array_map($this->key(...), $keys));
        return ['account_id' => $user->id] + array_map(function (array $scopes) use ($values, $user): string {
            $parts = [$user->id];
            foreach ($scopes as $scope) {
                $parts[] = [$scope, $values[$this->key($scope)] ?? '0'];
            }
            return hash('sha256', json_encode($parts, JSON_THROW_ON_ERROR));
        }, $groups);
    }

    public function changed(Request $request, array $previousBlocks): void
    {
        $user = $request->user();
        $path = $request->path();
        $blocks = array_unique([...$previousBlocks, ...SubjectAccess::blockIds($user->fresh())]);
        $scopes = [];
        if ($path === 'api/offline-sync') {
            $scopes = ['tasks:user:'.$user->id, 'personal:user:'.$user->id, 'calendar:user:'.$user->id];
        } elseif ($path === 'api/me') {
            $scopes = ['identity:user:'.$user->id, ...$this->blockScopes(['tasks', 'concerns', 'announcements', 'catalog'], $blocks)];
        } elseif (str_contains($path, 'personal-todos')) {
            $scopes = ['personal:user:'.$user->id, 'calendar:user:'.$user->id];
        } elseif (preg_match('#api/tasks/\d+/complete$#', $path)) {
            $scopes = ['tasks:user:'.$user->id, 'calendar:user:'.$user->id];
        } elseif (str_contains($path, 'tasks')) {
            $scopes = $this->blockScopes(['tasks', 'calendar'], $blocks);
        } elseif (str_contains($path, 'announcements')) {
            $scopes = $this->blockScopes(['announcements'], $blocks);
        } elseif (str_contains($path, 'concerns')) {
            $scopes = [...$this->blockScopes(['concerns'], $blocks), 'concerns:user:'.$user->id];
            $concern = $request->route('concern');
            if ($concern instanceof \App\Models\Concern) {
                $scopes[] = 'concerns:user:'.$concern->student_id;
                $scopes[] = 'concerns:block:'.$concern->block_id;
            }
        } elseif (str_contains($path, 'calendar-events')) {
            $event = $request->route('calendarEvent');
            $blockId = is_object($event) ? $event->block_id : ($request->input('scope') === 'block' ? $user->block_id : null);
            $scopes = $blockId ? ['calendar:block:'.$blockId] : ['calendar:user:'.$user->id];
        } else {
            $scopes = ['access', 'catalog', 'admin'];
        }
        $values = [];
        foreach ($scopes as $scope) {
            $values[$this->key($scope)] = (string) Str::uuid();
        }
        if ($values) {
            Cache::putMany($values, now()->addDays(30));
        }
    }

    private function blockScopes(array $domains, array $blocks): array
    {
        $scopes = [];
        foreach ($domains as $domain) {
            foreach ($blocks as $blockId) {
                $scopes[] = $domain.':block:'.$blockId;
            }
        }
        return $scopes;
    }

    private function key(string $scope): string
    {
        return 'client-sync:'.$scope;
    }
}
