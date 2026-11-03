<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $items = $user->notifications()->latest()->limit(30)->get()->map(fn ($n) => [
            'id' => $n->id,
            'title' => $n->data['title'] ?? 'Notification',
            'message' => $n->data['message'] ?? '',
            'link' => $n->data['link'] ?? '/',
            'read' => $n->read_at !== null,
            'created_at' => $n->created_at,
        ]);

        return response()->json([
            'data' => $items,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function read(Request $request, string $id)
    {
        $request->user()->notifications()->whereKey($id)->first()?->markAsRead();

        return response()->noContent();
    }

    public function readAll(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }
}
