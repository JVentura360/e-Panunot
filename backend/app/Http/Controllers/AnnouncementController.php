<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAnnouncementRequest;
use App\Http\Requests\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->block_id, 403, 'You are not in a block yet.');

        $announcements = Announcement::where('block_id', $user->block_id)
            ->with('creator')
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

        return new AnnouncementResource($announcement->load('creator'));
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

        return new AnnouncementResource($announcement->load('creator'));
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
}
