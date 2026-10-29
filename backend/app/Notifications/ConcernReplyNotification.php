<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\ConcernMessage;

class ConcernReplyNotification extends Notification
{
    use Queueable;

    public $message;

    public function __construct(ConcernMessage $message)
    {
        $this->message = $message;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'New Reply to your Concern',
            'message' => 'Someone replied: ' . substr($this->message->message_text, 0, 50) . '...',
            'concern_id' => $this->message->concern_id,
        ];
    }
}