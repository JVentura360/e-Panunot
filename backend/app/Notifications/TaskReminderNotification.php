<?php

namespace App\Notifications;

use App\Models\PersonalTodo;
use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class TaskReminderNotification extends Notification
{
    use Queueable;

    public function __construct(public Task|PersonalTodo $item) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (filled(config('webpush.vapid.public_key')) && filled(config('webpush.vapid.private_key'))) {
            $channels[] = WebPushChannel::class;
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        $isPersonalTodo = $this->item instanceof PersonalTodo;
        $dueDate = $isPersonalTodo
            ? Carbon::parse($this->item->due_date)->endOfDay()
            : $this->item->due_date;
        $type = $isPersonalTodo ? 'personal_todo' : 'task';

        return [
            'title' => 'Deadline approaching',
            'message' => $this->item->title.' is due '.$dueDate->format('M j, Y'.($isPersonalTodo ? '' : ' g:i A')),
            'task_id' => $isPersonalTodo ? null : $this->item->id,
            'personal_todo_id' => $isPersonalTodo ? $this->item->id : null,
            'due_date' => $dueDate->toIso8601String(),
            'kind' => $type.'_reminder',
            'link' => '/calendar',
        ];
    }

    public function toWebPush(object $notifiable, self $notification): WebPushMessage
    {
        $data = $this->toArray($notifiable);

        return (new WebPushMessage)
            ->title($data['title'])
            ->body($data['message'])
            ->tag('deadline-'.$data['kind'].'-'.$this->item->id)
            ->data(['url' => $data['link']]);
    }
}
