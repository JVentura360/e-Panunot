<?php

namespace App\Notifications;

use App\Models\Announcement;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewAnnouncementNotification extends Notification
{
    use Queueable;

    public function __construct(public Announcement $announcement) {}

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'kind' => 'announcement',
            'title' => 'New announcement',
            'message' => $this->announcement->title,
            'link' => '/',
            'announcement_id' => $this->announcement->id,
        ];
    }
}