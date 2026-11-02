# Student types, block membership, and separate subject tasks

## Approved requirements

- Ask students whether they are regular or irregular when joining a block.
- Regular students automatically enroll in every subject assigned to that block.
- A mayor must be a regular student and automatically enroll in their appointed block's subjects.
- Irregular students select applicable subjects and may take different subjects in different blocks, keeping duplicate-subject-per-term protection.
- Move Block Management out of desktop/mobile main navigation and into the account dropdown, directly below My Profile, for mayors only.
- Use distinct icons: people for Block Management, a book/ledger for My ledger.
- Disable Apply as Mayor when the student already belongs to a block; enforce this in the backend as well as the UI.
- Assigning one task to three subjects creates three separate tasks with independent completion states. The user explicitly confirmed that these are separate tasks.

## Approaches and choice

The existing one-enrollment-per-subject model can be extended with a regular/irregular classification and a transactional regular-block enrollment operation. Replacing the ledger with a single block-only membership would lose the irregular student's existing cross-block behavior, so retain the ledger and its canonical subject identities.

For tasks, actual subject-specific records are the selected approach. A display-only count multiplier cannot support the explicitly requested independent task completion. Apply the same separate-record behavior to the backend task API and the existing browser-storage frontend task flow.

## Enrollment behavior

- Classification belongs to the current academic term, allowing a student to have a different classification next term.
- Before enrollment, the ledger's block result asks for Regular or Irregular and explains the difference.
- Choosing Regular shows the complete block load and one “Join and enroll in all subjects” action. Success joins that block and enrolls all its subjects together, without mayor approval.
- A regular student has one regular block. All its subjects remain required; individual withdrawal and enrollment into other blocks are disabled and rejected by the server while classified regular.
- Choosing Irregular shows per-subject enrollment controls. Enrollment remains immediate and may span blocks.
- A repeated regular enrollment request is idempotent; it cannot duplicate subjects or partially join a block.
- If the student already has the same subject in another block, regular enrollment fails with an explanation before changing any membership or enrollment. It never silently transfers that subject.
- Joining requires an active block with an appointed mayor and an available subject load. A block with no subjects shows the admin-managed-load empty state and does not offer a misleading successful regular enrollment.
- When an admin adds subjects to a shared load, automatically enroll regular members and the appointed mayor of each affected block in the added subjects. Preserve the existing enrolled-subject removal guard.
- Irregular students are not automatically enrolled in newly added subjects.
- Existing records and history are preserved. Ask existing students to confirm their classification rather than guessing regular versus irregular. Existing active mayors must be reconciled as regular against their own block load; if existing cross-block enrollment creates a conflict, preserve it and show the action needed rather than silently moving or deleting records.
- Changing an established classification or leaving an entire regular block is outside this change. Explain that restriction clearly; do not allow individual withdrawal to bypass regular enrollment rules.

## Mayor eligibility

- The application includes a required regular-student declaration. Irregular students cannot apply.
- Users with an active primary block or active subject enrollment already belong to a block for eligibility purposes. Disable their application action with an explanation instead of letting them submit a doomed application.
- Submission and admin approval both recheck current membership, classification, and the target block's appointed mayor. A student who joins a block while their application is pending can no longer be approved through that stale application.
- A valid approval creates/claims the block, assigns the shared subject load, marks the mayor regular for the term, and enrolls the mayor in the entire load in one transaction.
- Reject an approval that would create duplicate subject enrollment or otherwise fail regular enrollment; do not partially assign the role or publish a load.
- Term rollover resets current eligibility/classification and current memberships while retaining history and existing admin-only load governance.

## Task behavior

- Creating a class task requires a single offered subject or an explicit All subjects selection.
- All subjects uses the block's offered subjects at creation time. Create one task per subject, each with a unique ID, its own subject identity, and independent per-student completion state.
- The title, description, deadline, and platform are copied to each created task. Display each task's subject so identical titles remain understandable.
- Three subjects produce three tasks and count as three on the dashboard/calendar. Completing one changes the counters by one and leaves the others unfinished.
- An irregular student sees/counts only tasks for their enrolled subjects; a regular student and mayor see the full block load.
- Task assignment recipients follow subject enrollment, not merely an unrelated primary block membership. Legacy unclassified memberships keep historical visibility until their classification is confirmed, without granting new cross-block permissions.
- Personal tasks remain single tasks and are unaffected by All subjects.
- If a block has no offered subjects, class-task creation is blocked with an actionable message. Never silently create zero tasks or a generic task in place of the requested subjects.
- Editing, deleting, or completing one subject-specific task affects that task only. Bulk edit/delete is outside this change.
- Subjects added later do not retroactively receive copies of old All subjects tasks. Existing tasks and completion history are not multiplied or rewritten during migration.

## Navigation and feedback

- Keep Dashboard, Calendar, Concerns, and My ledger as the student/mayor main navigation.
- Keep admin navigation unchanged.
- In a mayor's account dropdown, show My Profile followed by Block Management; give it the existing people icon.
- Give My ledger a distinct book icon in desktop and mobile navigation.
- For students already in a block, show a disabled Apply as Mayor action with an explanation. Keep application controls unavailable to admins and already appointed mayors.
- Loading, retry, validation, and mutation feedback follow the existing cached query and teal-theme conventions. Update any old empty-state copy that incorrectly asks the mayor to add admin-managed subjects.

## Consistency and verification

- Reuse the Laravel/PHP/React/TanStack Query stack and preserve current local changes. No new dependencies, demo seeds, commits, pushes, or deployment.
- Regular join, mayor approval, shared-load publication, and rollover must use compatible lock ordering. Resolve duplicate/conflicting enrollments atomically and keep database uniqueness constraints.
- Invalidate identity, classification/membership, ledger, subjects, block members, task/calendar, and application eligibility queries after relevant changes; keep unrelated cached data.
- Tests must cover regular join and automatic subjects, irregular cross-block selection, repeat requests, conflicts, regular withdrawal restrictions, new-load subject additions, mayor declaration/approval/auto-enrollment, pending application eligibility changes, rollover, three-task creation, independent completion/counts, subject-scoped visibility, and navigation eligibility/icon differences.
- Run the backend suite, frontend tests, build, changed-file ESLint, migration checks, and relevant browser checks before completion.

## Builder decisions

Exact table/API/component names and whether to record a batch identifier for task creation are implementation choices. Preserve existing single-subject task API compatibility where practical; an explicit All subjects request may return a collection. Do not broaden this change into complete server integration of the existing browser-storage prototypes.
