<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewTaskNotification extends Notification
{
    use Queueable;

    public function __construct(public Task $task) {}

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'kind' => 'new_task',
            'title' => 'New task' . ($this->task->subject ? ': ' . $this->task->subject->code : ''),
            'message' => $this->task->title,
            'link' => '/calendar',
            'task_id' => $this->task->id,
        ];
    }
}