<?php

namespace App\Http\Controllers;

use App\Enums\ConcernStatus;
use App\Http\Resources\ConcernMessageResource;
use App\Models\Concern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

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
            $concern->messages()->with('sender')->oldest()->get()
        );
    }

    public function store(Request $request, Concern $concern)
    {
        Gate::authorize('view', $concern);

        abort_if($concern->status === ConcernStatus::Closed, 422, 'This concern is closed.');

        $data = $request->validate([
            'message_text' => ['required', 'string', 'max:5000'],
        ]);

        $message = $concern->messages()->create([
            'sender_id' => $request->user()->id,
            'type' => 'message',
            'message_text' => $data['message_text'],
        ]);

        // the *other* side now has something unread
        $isStudent = $request->user()->id === $concern->student_id;
        $concern->update($isStudent ? ['mayor_unread' => true] : ['student_unread' => true]);

        return new ConcernMessageResource($message->load('sender'));
    }
}
