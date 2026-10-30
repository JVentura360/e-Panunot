<?php

namespace App\Http\Controllers;

use App\Http\Resources\BlockResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MeController extends Controller
{
    /**
     * GET /api/me
     *
     * The signed-in user in the shape the React app expects:
     *   role  = 'student' | 'mayor' | 'admin'
     *   block = the display code, e.g. "31-ITE-04" (null when they have no block)
     *
     * The mayor role is derived from blocks.mayor_id, so a stale 'mayor' value
     * left over from a previous semester never shows up in the UI.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        $block = $user->block_id
            ? DB::table('blocks as b')
                ->join('terms as t', 't.id', '=', 'b.term_id')
                ->where('b.id', $user->block_id)
                ->first(['b.id', 'b.program', 'b.year_level', 'b.block_number', 'b.mayor_id', 't.semester'])
            : null;

        $storedRole = $user->role instanceof \BackedEnum ? $user->role->value : $user->role;
        $isMayor = $block && (int) $block->mayor_id === (int) $user->id;

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'picture_url' => $user->picture_url,
                'role' => $storedRole === 'admin' ? 'admin' : ($isMayor ? 'mayor' : 'student'),
                'block_id' => $block?->id,
                'block' => $block
                    ? BlockResource::makeCode($block->year_level, $block->semester, $block->program, $block->block_number)
                    : null,
            ],
        ]);
    }
}
