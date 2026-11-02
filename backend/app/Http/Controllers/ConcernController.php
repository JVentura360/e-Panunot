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
        $concerns = Concern::where(function ($query) use ($user): void {
            $query->where('student_id', $user->id);
            if ($user->role === Role::Mayor && $user->block_id) {
                $query->orWhere('block_id', $user->block_id);
            }
        })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->with(['student', 'subject', 'attachments'])
            ->latest()
            ->get();

        return ConcernResource::collection($concerns);
    }

    public function store(StoreConcernRequest $request)
    {
        $user = $request->user();
        $blockId = (int) $request->input('block_id', $user->block_id);
        abort_unless(\App\Services\SubjectAccess::canAccess($user, $blockId, $request->integer('subject_id') ?: null), 403, 'You are not enrolled in this block.');

        $concern = Concern::create([
            ...$request->safe()->except('attachments'),
            'block_id' => $blockId,
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
            $concern->refresh()->load(['student', 'subject', 'attachments'])
        );
    }

    public function updateStatus(Request $request, Concern $concern)
    {
        Gate::authorize('manage', $concern);

        $data = $request->validate([
            'status' => ['required', Rule::enum(ConcernStatus::class)],
        ]);
        $status = ConcernStatus::from($data['status']);

        if ($concern->status !== $status) {
            DB::transaction(function () use ($concern, $status, $request) {
                $concern->update(['status' => $status, 'student_unread' => true]);

                $concern->messages()->create([
                    'sender_id' => $request->user()->id,
                    'type' => 'system',
                    'message_text' => 'Status changed to ' . str_replace('_', ' ', $status->value) . '.',
                ]);
            });
        }

        return new ConcernResource($concern->load(['student', 'subject', 'attachments']));
    }

    public function download(ConcernAttachment $attachment)
    {
        Gate::authorize('view', $attachment->concern);

        return Storage::download($attachment->file_path, $attachment->original_name);
    }
}
