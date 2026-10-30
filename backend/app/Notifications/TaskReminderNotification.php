<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Task;

class TaskReminderNotification extends Notification
{
    use Queueable;

    public $task;

    public function __construct(Task $task)
    {
        $this->task = $task;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Task Reminder!',
            'message' => 'Don\'t forget: ' . $this->task->title,
            'task_id' => $this->task->id,
            'due_date' => $this->task->due_date,
        ];
    }
}