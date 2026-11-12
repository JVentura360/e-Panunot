<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Block;
use App\Models\TaskAssignment;
use App\Notifications\TaskReminderNotification;
use App\Services\SubjectAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MayorReminderController extends Controller
{
    public function store(Request $request, int $blockId): JsonResponse
    {
        $block = Block::findOrFail($blockId);
        abort_unless($request->user()->role === Role::Mayor && (int) $block->mayor_id === (int) $request->user()->id, 403);
        abort_unless($block->term?->is_active, 422, 'This school term is no longer active.');
        abort_unless(Cache::add('manual-reminders:block:'.$blockId, true, 60), 429, 'Please wait a minute before sending another reminder.');

        $sent = 0;
        $students = [];
        $failed = 0;
        TaskAssignment::query()->whereNull('completed_at')
            ->whereHas('task', fn ($query) => $query->where('block_id', $blockId)
                ->where('due_date', '>', now())->where('due_date', '<=', now()->addHours(24)))
            ->whereHas('user', fn ($query) => $query->where('role', Role::Student->value))
            ->with(['task', 'user'])->chunkById(100, function ($assignments) use (&$sent, &$students, &$failed): void {
                foreach ($assignments as $assignment) {
                    $assignment = TaskAssignment::with(['task', 'user'])->find($assignment->id);
                    if (! $assignment) {
                        continue;
                    }
                    $task = $assignment->task;
                    $student = $assignment->user;
                    if ($assignment->completed_at || ! $task || ! $student || $task->due_date->lte(now()) || $task->due_date->gt(now()->addHours(24))
                        || ! SubjectAccess::canAccess($student, $task->block_id, $task->subject_id)) {
                        continue;
                    }
                    try {
                        $student->notify(new TaskReminderNotification($task));
                        $sent++;
                        $students[$student->id] = true;
                    } catch (\Throwable $error) {
                        report($error);
                        $failed++;
                    }
                }
            });

        $pushConfigured = filled(config('webpush.vapid.public_key')) && filled(config('webpush.vapid.private_key'));
        $pushEnabledStudents = $pushConfigured
            ? \App\Models\User::whereIn('id', array_keys($students))->whereHas('pushSubscriptions')->count()
            : 0;

        return response()->json([
            'sent' => $sent,
            'students' => count($students),
            'failed' => $failed,
            'push_configured' => $pushConfigured,
            'push_enabled_students' => $pushEnabledStudents,
            'push_unregistered_students' => count($students) - $pushEnabledStudents,
        ]);
    }
}
