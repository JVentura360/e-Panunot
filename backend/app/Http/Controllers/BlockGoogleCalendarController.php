<?php

namespace App\Http\Controllers;

use App\Policies\BlockPolicy;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BlockGoogleCalendarController extends Controller
{
    /**
     * GET /api/blocks/{blockId}/google-calendar
     *
     * Tells React whether the block's Google calendar exists and gives the link
     * for an "Add to Google Calendar" button. Only the block's own members, its
     * mayor, or an admin can ask.
     */
    public function show(Request $request, int $blockId, GoogleCalendarService $google)
    {
        $block = DB::table('blocks')->where('id', $blockId)->first();
        abort_if(! $block, 404, 'Block not found.');

        abort_unless(
            app(BlockPolicy::class)->view($request->user(), $block),
            403,
            'You do not belong to this block.'
        );

        return response()->json([
            'data' => [
                'enabled' => $google->enabled(),
                'ready' => (bool) $block->google_calendar_id,
                'add_url' => $block->google_calendar_id
                    ? $google->addToCalendarUrl($block->google_calendar_id)
                    : null,
            ],
        ]);
    }
}
