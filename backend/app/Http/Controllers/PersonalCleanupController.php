<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\PersonalTodo;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Lets a student tidy up their own agenda. Only the signed-in user's personal
 * items are touched; class tasks, class events and announcements never are.
 */
class PersonalCleanupController extends Controller
{
    /**
     * POST /api/personal-todos/clear-completed
     *
     * Deletes the user's finished personal tasks and personal events that have already ended.
     */
    public function clearCompleted(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($userId): array {
            // Same per-user lock the personal to-do endpoints take, so this can't race them.
            User::whereKey($userId)->lockForUpdate()->firstOrFail();

            return [
                'tasks' => PersonalTodo::where('user_id', $userId)->where('is_done', true)->delete(),
                'events' => CalendarEvent::whereNull('block_id')
                    ->where('created_by', $userId)
                    ->where('ends_at', '<', now('UTC'))
                    ->delete(),
            ];
        }, 3);

        return response()->json(['data' => $result]);
    }
}
