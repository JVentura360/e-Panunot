<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\User;
use App\Notifications\NewAnnouncementNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Services\SubjectAccess;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $announcements = SubjectAccess::scope(Announcement::query(), $user, 'announcements')
            ->with(['creator', 'subject', 'block.term'])
            ->latest()
            ->get();

        return AnnouncementResource::collection($announcements);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAnnouncementRequest $request)
    {
        $user = $request->user();
        abort_unless($user->block_id, 403, 'You are not in a block yet.');

        $announcement = Announcement::create([
            ...$request->validated(),
            'block_id' => $user->block_id,
            'created_by' => $user->id,
        ]);

        Notification::send($this->recipients($announcement), new NewAnnouncementNotification($announcement));

        return new AnnouncementResource($announcement->load(['creator', 'subject', 'block.term']));
    }

    /**
     * Display the specified resource.
     */
    // public function show(string $id)
    // {
    //     //
    // }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAnnouncementRequest $request, Announcement $announcement)
    {
        $this->ensureOwnBlock($request, $announcement);

        $announcement->update($request->validated());

        return new AnnouncementResource($announcement->load(['creator', 'subject', 'block.term']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Announcement $announcement)
    {
        $this->ensureOwnBlock($request, $announcement);

        $announcement->delete();

        return response()->noContent();
    }

    private function ensureOwnBlock(Request $request, Announcement $announcement): void
    {
        abort_unless($announcement->block_id === $request->user()->block_id, 403);
    }

    /** Same audience rule as tasks: subject enrollments, plus students from before enrollment existed. */
    private function recipients(Announcement $announcement)
    {
        $block = DB::table('blocks')->where('id', $announcement->block_id)->first();

        $enrolled = DB::table('subject_enrollments')
            ->where('block_id', $block->id)
            ->when($announcement->subject_id, fn ($q) => $q->where('subject_id', $announcement->subject_id))
            ->pluck('user_id');

        $legacy = DB::table('users')->where('block_id', $block->id)
            ->whereNotIn('id', DB::table('student_term_profiles')->where('term_id', $block->term_id)->select('user_id'))
            ->pluck('id');

        return User::whereIn('id', $enrolled->merge($legacy)->unique())
            ->where('id', '!=', $announcement->created_by)
            ->get();
    }
}
