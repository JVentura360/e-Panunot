<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;

/**
 * Who may do what with a block.
 *
 * The mayor is identified by blocks.mayor_id (NOT by users.role), so a stale
 * 'mayor' role left over from a previous semester never gives access.
 *
 * $block is typed `object` on purpose: it works with an Eloquent Block model
 * AND with the stdClass rows your DB::table() controllers return.
 *
 *   // with an Eloquent model (auto-discovered, no registration needed):
 *   Gate::authorize('manage', Block::findOrFail($id));
 *
 *   // with a DB::table() row:
 *   abort_unless(app(BlockPolicy::class)->manage($user, $block), 403);
 */
class BlockPolicy
{
    /** See a block's details and subjects: an admin, its mayor, or one of its members. */
    public function view(User $user, object $block): bool
    {
        return $this->isAdmin($user)
            || $this->isMayorOf($user, $block)
            || $this->isMemberOf($user, $block);
    }

    /**
     * See the full member list. Matches your current rule (admin or the block's
     * mayor). To let blockmates see each other, return $this->view(...) instead.
     */
    public function viewMembers(User $user, object $block): bool
    {
        return $this->isAdmin($user) || $this->isMayorOf($user, $block);
    }

    /** Review join requests, remove members, manage the block: an admin or the block's mayor. */
    public function manage(User $user, object $block): bool
    {
        return $this->isAdmin($user) || $this->isMayorOf($user, $block);
    }

    private function isAdmin(User $user): bool
    {
        // users.role is a plain string today; it becomes an enum if you add a cast later.
        $role = $user->role instanceof \BackedEnum ? $user->role->value : $user->role;

        return $role === Role::Admin->value;
    }

    private function isMayorOf(User $user, object $block): bool
    {
        return $block->mayor_id !== null && (int) $block->mayor_id === (int) $user->id;
    }

    private function isMemberOf(User $user, object $block): bool
    {
        return $user->block_id !== null && (int) $user->block_id === (int) $block->id;
    }
}
