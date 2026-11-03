<?php

namespace App\Notifications;

use App\Models\Concern;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ConcernStatusNotification extends Notification
{
    use Queueable;

    public function __construct(public Concern $concern, public string $statusLabel) {}

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'kind' => 'concern_status',
            'title' => 'Concern ' . $this->statusLabel,
            'message' => $this->concern->title,
            'link' => '/concerns/' . $this->concern->id,
            'concern_id' => $this->concern->id,
        ];
    }
}