<?php

namespace App\Notifications;

use App\Models\ConversationMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class ConcernReplyNotification extends Notification
{
    use Queueable;

    public function __construct(public ConversationMessage $message) {}

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        $sender = $this->message->sender?->name ?? 'Someone';

        return [
            'kind' => 'concern_reply',
            'title' => "$sender replied to a concern",
            'message' => Str::limit($this->message->message_text, 80),
            'link' => '/concerns/' . $this->message->concern_id,
            'concern_id' => $this->message->concern_id,
        ];
    }
}