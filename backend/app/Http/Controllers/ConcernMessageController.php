<?php

namespace App\Http\Controllers;

use App\Enums\ConcernStatus;
use App\Http\Resources\ConcernMessageResource;
use App\Models\Concern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class ConcernMessageController extends Controller
{
    public function index(Request $request, Concern $concern)
    {
        Gate::authorize('view', $concern);

        // opening the conversation = reading it, so clear this viewer's unread flag
        $flag = $request->user()->id === $concern->student_id
            ? 'student_unread'
            : 'mayor_unread';

        if ($concern->$flag) {
            $concern->update([$flag => false]);
        }

        return ConcernMessageResource::collection(
            $concern->messages()->with('sender')->oldest()->orderBy('id')->get()
        );
    }

    public function store(Request $request, Concern $concern)
    {
        Gate::authorize('view', $concern);

        abort_if($concern->status === ConcernStatus::Closed, 422, 'This concern is closed.');

        $data = $request->validate([
            'message_text' => ['required', 'string', 'max:5000'],
        ]);

        $user = $request->user();
        $isMayor = Gate::allows('manage', $concern);

        $message = DB::transaction(function () use ($concern, $user, $data, $isMayor) {
            $message = $concern->messages()->create([
                'sender_id' => $user->id,
                'type' => 'message',
                'message_text' => $data['message_text'],
            ]);

            // the other side now has something unread
            $updates = $isMayor ? ['student_unread' => true] : ['mayor_unread' => true];

            // first mayor reply on an open concern = work has started
            if ($isMayor && $concern->status === ConcernStatus::Open) {
                $updates['status'] = ConcernStatus::InProgress;

                $concern->messages()->create([
                    'sender_id' => $user->id,
                    'type' => 'system',
                    'message_text' => 'Status changed to in progress.',
                ]);
            }

            $concern->update($updates);

            return $message;
        });

        return new ConcernMessageResource($message->load('sender'));
    }
}
