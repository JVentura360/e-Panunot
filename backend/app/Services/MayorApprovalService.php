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
    public function approve(int $applicationId, object $admin, int $expectedRevision, ?array $subjects = null, bool $confirmRegular = false): object
    {
        $candidate = DB::table('mayor_applications')->where('id', $applicationId)->first();
        abort_unless($candidate, 404, 'Mayor application not found.');
        try {
            return DB::transaction(function () use ($applicationId, $admin, $expectedRevision, $subjects, $candidate, $confirmRegular) {

                // The semester must still be running.
                $term = DB::table('terms')->where('id', $candidate->term_id)->lockForUpdate()->first();
                if (! $term || ! $term->is_active) {
                    $this->fail('term', 'This application belongs to a semester that is no longer active.');
                }
                $loads = app(SubjectLoadService::class);
                $load = $loads->find($candidate->term_id, $candidate->program, $candidate->year_level);
                abort_if(($load?->revision ?? 0) !== $expectedRevision, 409, 'The shared subject load changed. Reload the application review before approving.');
                $application = $this->lockPendingApplication($applicationId);
                $enrollment = app(StudentEnrollmentService::class);
                if ($enrollment->hasMembership($application->user_id, $term->id)
                    || $enrollment->profile($application->user_id, $term->id)?->student_type === 'irregular') {
                    $this->fail('application', 'The applicant already belongs to a block or is classified irregular and is no longer eligible.');
                }
                if (($application->is_regular_student !== null && ! $application->is_regular_student)
                    || ($application->is_regular_student === null && ! $confirmRegular)) {
                    $this->fail('is_regular_student', 'Confirm that this applicant is a regular student before approval.');
                }
                if ($load && $subjects !== null) {
                    $this->fail('subjects', 'An approved load already exists. Change it through admin subject-load settings.');
                }
                if (! $load) {
                    $proposal = $application->proposed_subjects ? json_decode($application->proposed_subjects, true, flags: JSON_THROW_ON_ERROR) : null;
                    if (! $proposal) {
                        $this->fail('subjects', 'This older application has no subject proposal. Establish its shared load in School Year before approving.');
                    }
                    $load = $loads->publish($term->id, $application->program, $application->year_level, 0, $subjects ?? $proposal, $admin->id);
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

                $loads->assignToBlock($load->id, $blockId);
                $enrollment->enrollBlock((int) $applicant->id, $blockId, 'regular');

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
                    'subject_load_revision' => $load->revision,
                    'is_regular_student' => true,
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
            }, 3);
        } catch (UniqueConstraintViolationException) {
            // Safety net if two admins approve at the same moment.
            $this->fail('block', 'A block with those details already exists this semester.');
        }
    }

    /**
     * Remove the mayor of a block (admin only).
     *
     *  - the block keeps existing but has no mayor (blocks.mayor_id = null)
     *  - the old mayor becomes a normal student again (users.role) and LEAVES the
     *    block (like a member removed by the mayor), so they can apply as mayor
     *    again or join a block as a student
     *  - their approved application is marked rejected so the approval is really
     *    revoked and the history is not misleading
     *  - a new application for this block can then be approved
     *
     * @return object the block row
     */
    public function removeMayor(int $blockId, object $admin): object
    {
        $removedEmail = null;

        $block = DB::transaction(function () use ($blockId, $admin, &$removedEmail) {
            $block = DB::table('blocks')->where('id', $blockId)->lockForUpdate()->first();
            abort_unless($block, 404, 'Block not found.');

            $term = DB::table('terms')->where('id', $block->term_id)->lockForUpdate()->first();
            if (! $term || ! $term->is_active) {
                $this->fail('term', 'A mayor can only be removed during the active semester.');
            }

            if ($block->mayor_id === null) {
                $this->fail('block', 'This block does not have a mayor.');
            }

            $mayorId = (int) $block->mayor_id;
            $mayor = DB::table('users')->where('id', $mayorId)->lockForUpdate()->first();
            $removedEmail = $mayor?->email;

            DB::table('blocks')->where('id', $blockId)->update([
                'mayor_id' => null,
                'updated_at' => now(),
            ]);

            DB::table('users')
                ->where('id', $mayorId)
                ->where('role', Role::Mayor->value)
                ->update(['role' => Role::Student->value, 'updated_at' => now()]);

            // Take them out of the block, same as when a mayor removes a member.
            // Without this they still "belong to a block" and cannot apply as mayor again.
            DB::table('subject_enrollments')->where('user_id', $mayorId)->where('block_id', $blockId)->delete();
            DB::table('student_term_profiles')->where('user_id', $mayorId)->where('term_id', $block->term_id)->where('regular_block_id', $blockId)->delete();
            DB::table('users')->where('id', $mayorId)->where('block_id', $blockId)->update(['block_id' => null, 'updated_at' => now()]);
            DB::table('task_assignments')
                ->where('user_id', $mayorId)
                ->whereIn('task_id', DB::table('tasks')->where('block_id', $blockId)->select('id'))
                ->delete();

            DB::table('mayor_applications')
                ->where('block_id', $blockId)
                ->where('user_id', $mayorId)
                ->where('status', ApplicationStatus::Approved->value)
                ->update([
                    'status' => ApplicationStatus::Rejected->value,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            return DB::table('blocks')->where('id', $blockId)->first();
        });

        // Take the old mayor off the block's Google calendar.
        if ($removedEmail) {
            SyncBlockCalendarAccess::dispatch($blockId, $removedEmail, false);
        }

        return $block;
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
