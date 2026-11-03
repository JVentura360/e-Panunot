<?php

namespace App\Notifications;

use App\Models\Concern;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewConcernNotification extends Notification
{
    use Queueable;

    public function __construct(public Concern $concern) {}

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        $student = $this->concern->student?->name ?? 'A student';

        return [
            'kind' => 'new_concern',
            'title' => "$student raised a concern",
            'message' => $this->concern->title,
            'link' => '/concerns/' . $this->concern->id,
            'concern_id' => $this->concern->id,
        ];
    }
}