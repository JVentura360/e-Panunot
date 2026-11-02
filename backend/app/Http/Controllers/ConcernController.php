<?php

namespace App\Http\Controllers;

use App\Enums\ConcernStatus;
use App\Enums\Role;
use App\Http\Requests\StoreConcernRequest;
use App\Http\Resources\ConcernResource;
use App\Models\Concern;
use App\Models\ConcernAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ConcernController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isMayor = $user->role === Role::Mayor;
        abort_if($isMayor && ! $user->block_id, 403, 'You are not in a block yet.');

        $concerns = Concern::query()
            // mayor: their block's concerns. student: everything they filed, in any block.
            ->when($isMayor,
                fn ($q) => $q->where('block_id', $user->block_id),
                fn ($q) => $q->where('student_id', $user->id))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->with(['student', 'subject', 'task', 'attachments'])
            ->latest()
            ->get();

        return ConcernResource::collection($concerns);
    }

    public function store(StoreConcernRequest $request)
    {
        $user = $request->user();
        $data = $request->safe()->except('attachments');
        $task = isset($data['task_id']) ? \App\Models\Task::find($data['task_id']) : null;

        // routing: the task's block, else the chosen block, else the primary block
        $blockId = $task?->block_id ?? ($data['block_id'] ?? $user->block_id);
        abort_unless($blockId, 403, 'You are not in a block yet.');

        $concern = Concern::create([
            ...$data,
            'block_id' => $blockId,
            'subject_id' => $task?->subject_id ?? ($data['subject_id'] ?? null),
            'student_id' => $user->id,
        ]);

        foreach ($request->file('attachments', []) as $file) {
            $concern->attachments()->create([
                'file_path' => $file->store("concerns/{$concern->id}"),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        }

        return new ConcernResource(
            $concern->refresh()->load(['student', 'subject', 'task', 'attachments'])
        );
    }

    public function updateStatus(Request $request, Concern $concern)
    {
        Gate::authorize('view', $concern);   // the student who filed it, or the block's mayor

        $user = $request->user();
        $data = $request->validate([
            'status' => ['required', Rule::enum(ConcernStatus::class)],
        ]);
        $status = ConcernStatus::from($data['status']);
        $isMayor = Gate::allows('manage', $concern);

        // mayor: any status. student: only close it or reopen it.
        abort_unless(
            $isMayor || in_array($status, [ConcernStatus::Closed, ConcernStatus::InProgress], true),
            403,
            'Students can only close or reopen a concern.'
        );

        if ($concern->status !== $status) {
            $flag = $isMayor ? 'student_unread' : 'mayor_unread';   // notify the other side

            DB::transaction(function () use ($concern, $status, $user, $flag) {
                $concern->update(['status' => $status, $flag => true]);

                $concern->messages()->create([
                    'sender_id' => $user->id,
                    'type' => 'system',
                    'message_text' => 'Status changed to ' . str_replace('_', ' ', $status->value) . '.',
                ]);
            });
        }

        return new ConcernResource($concern->load(['student', 'subject', 'task', 'attachments']));
    }

    public function download(Request $request, ConcernAttachment $attachment)
{
    Gate::authorize('view', $attachment->concern);

    if ($request->boolean('download')) {
        return Storage::download($attachment->file_path, $attachment->original_name);
    }

    return Storage::response($attachment->file_path, $attachment->original_name);
}
}
