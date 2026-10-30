<?php

namespace App\Services;

use App\Jobs\SyncBlockCalendarAccess;
use App\Enums\ApplicationStatus;
use App\Enums\Role;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Approving / rejecting mayor applications.
 *
 * Uses DB::table() like the rest of your controllers, so it works without
 * filling in the Eloquent models. Every public method is all-or-nothing:
 * if anything fails, the whole transaction is rolled back.
 */
class MayorApprovalService
{
    /**
     * Approve a pending application:
     *  1. create the block (or reuse an existing block that has no mayor yet)
     *  2. make the applicant its mayor (blocks.mayor_id + users.role + users.block_id)
     *  3. mark the application approved
     *  4. reject the other pending applications that are now pointless
     *     (same block, or the same applicant)
     *
     * @return object the application row, joined with its term (school_year, semester)
     */
    public function approve(int $applicationId, object $admin): object
    {
        try {
            return DB::transaction(function () use ($applicationId, $admin) {
                $application = $this->lockPendingApplication($applicationId);

                // The semester must still be running.
                $term = DB::table('terms')->where('id', $application->term_id)->first();
                if (! $term || ! $term->is_active) {
                    $this->fail('term', 'This application belongs to a semester that is no longer active.');
                }

                // Lock the applicant so two approvals cannot change them at the same time.
                $applicant = DB::table('users')
                    ->where('id', $application->user_id)
                    ->lockForUpdate()
                    ->first();

                if (! $applicant) {
                    $this->fail('application', 'The applicant account no longer exists.');
                }
                if ($applicant->role === Role::Admin->value) {
                    $this->fail('application', 'An admin account cannot become a mayor.');
                }

                // Does this block already exist this semester?
                $block = DB::table('blocks')
                    ->where('term_id', $application->term_id)
                    ->where('program', $application->program)
                    ->where('year_level', $application->year_level)
                    ->where('block_number', $application->block_number)
                    ->lockForUpdate()
                    ->first();

                if ($block && $block->mayor_id !== null && (int) $block->mayor_id !== (int) $applicant->id) {
                    $this->fail('block', 'This block already has an assigned mayor.');
                }

                $isMayorElsewhere = DB::table('blocks')
                    ->where('term_id', $application->term_id)
                    ->where('mayor_id', $applicant->id)
                    ->when($block, fn ($query) => $query->where('id', '!=', $block->id))
                    ->exists();

                if ($isMayorElsewhere) {
                    $this->fail('application', 'The applicant is already the mayor of another block this semester.');
                }

                if ($applicant->block_id !== null && (! $block || (int) $applicant->block_id !== (int) $block->id)) {
                    $this->fail('application', 'The applicant already belongs to another block. Remove them from it first.');
                }

                // 1) create (or claim) the block
                if ($block) {
                    $blockId = (int) $block->id;
                    DB::table('blocks')->where('id', $blockId)->update([
                        'mayor_id' => $applicant->id,
                        'updated_at' => now(),
                    ]);
                } else {
                    $blockId = (int) DB::table('blocks')->insertGetId([
                        'term_id' => $application->term_id,
                        'program' => $application->program,
                        'year_level' => $application->year_level,
                        'block_number' => $application->block_number,
                        'mayor_id' => $applicant->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // 2) assign the role and put the mayor inside their own block
                DB::table('users')->where('id', $applicant->id)->update([
                    'role' => Role::Mayor->value,
                    'block_id' => $blockId,
                    'updated_at' => now(),
                ]);

                // 3) mark this application approved
                DB::table('mayor_applications')->where('id', $application->id)->update([
                    'status' => ApplicationStatus::Approved->value,
                    'block_id' => $blockId,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

                // 4) close the other pending applications that can no longer be approved:
                //    anyone else who applied for the same block, and any other
                //    application by this same applicant in this semester.
                DB::table('mayor_applications')
                    ->where('term_id', $application->term_id)
                    ->where('status', ApplicationStatus::Pending->value)
                    ->where('id', '!=', $application->id)
                    ->where(function ($query) use ($application) {
                        $query->where('user_id', $application->user_id)
                            ->orWhere(function ($sameBlock) use ($application) {
                                $sameBlock->where('program', $application->program)
                                    ->where('year_level', $application->year_level)
                                    ->where('block_number', $application->block_number);
                            });
                    })
                    ->update([
                        'status' => ApplicationStatus::Rejected->value,
                        'reviewed_by' => $admin->id,
                        'reviewed_at' => now(),
                        'updated_at' => now(),
                    ]);

                SyncBlockCalendarAccess::dispatch($blockId, $applicant->email, true)->afterCommit();

                return $this->findWithTerm($application->id);
            });
        } catch (UniqueConstraintViolationException) {
            // Safety net if two admins approve at the same moment.
            $this->fail('block', 'A block with those details already exists this semester.');
        }
    }

    /**
     * Reject a pending application.
     *
     * @return object the application row, joined with its term
     */
    public function reject(int $applicationId, object $admin): object
    {
        return DB::transaction(function () use ($applicationId, $admin) {
            $application = $this->lockPendingApplication($applicationId);

            DB::table('mayor_applications')->where('id', $application->id)->update([
                'status' => ApplicationStatus::Rejected->value,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->findWithTerm($application->id);
        });
    }

    /** Re-read the row with a lock so it cannot be reviewed twice at the same time. */
    private function lockPendingApplication(int $applicationId): object
    {
        $application = DB::table('mayor_applications')
            ->where('id', $applicationId)
            ->lockForUpdate()
            ->first();

        abort_if(! $application, 404, 'Mayor application not found.');

        if ($application->status !== ApplicationStatus::Pending->value) {
            $this->fail('status', 'This application was already reviewed.');
        }

        return $application;
    }

    private function findWithTerm(int $applicationId): object
    {
        return DB::table('mayor_applications as ma')
            ->join('terms as t', 't.id', '=', 'ma.term_id')
            ->where('ma.id', $applicationId)
            ->select('ma.*', 't.school_year', 't.semester')
            ->first();
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
