<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $visible = $user->notifications()->where(function ($query) use ($user): void {
            $query->whereNull('data->concern_id')->orWhereNotIn('data->concern_id',
                DB::table('concerns')->where('student_id', $user->id)
                    ->whereNotNull('student_removed_at')->select('id'));
        });
        $items = (clone $visible)->latest()->limit(30)->get()->map(fn ($n) => [
            'id' => $n->id,
            'title' => $n->data['title'] ?? 'Notification',
            'message' => $n->data['message'] ?? '',
            'link' => $n->data['link'] ?? '/',
            'kind' => $n->data['kind'] ?? null,
            'due_date' => $n->data['due_date'] ?? null,
            'read' => $n->read_at !== null,
            'created_at' => $n->created_at,
        ]);

        return response()->json([
            'data' => $items,
            'unread_count' => (clone $visible)->whereNull('read_at')->count(),
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
