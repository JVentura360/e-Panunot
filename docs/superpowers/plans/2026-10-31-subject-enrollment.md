# Subject Enrollment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let appointed mayors offer subjects and let students immediately enroll in subjects across blocks through their ledger.

**Architecture:** Keep the subject catalog shared across blocks. Add term-scoped enrollment records connecting a student, subject, and offering block. Existing block memberships and historical records remain intact; enrollment adds access to the relevant block and subject without changing mayor appointments.

**Tech Stack:** Laravel 13, MySQL, PHP 8.4, React 19, TanStack Query 5.

**Spec:** The approved conversation requirements are recorded below.

## Requirements

- An appointed mayor adds subjects to their own active block using a required subject code and full subject name.
- Normalize codes to uppercase and trim whitespace. A shared code identifies the same subject across blocks.
- Format full names as titles: `fundamentals of database systems` becomes `Fundamentals of Database Systems`.
- Show this instruction in the mayor form: “Enter the complete subject name; avoid abbreviations.”
- Reuse an existing subject when its normalized code and name match. Reject conflicting names for an existing code rather than silently changing other blocks’ subjects.
- Students enroll immediately, without mayor approval, in a specific subject offered by a specific block in the active term.
- A student may take different subjects in different blocks.
- A student cannot enroll twice in the same subject in the same term, including across different blocks. To switch blocks for that subject, withdraw first.
- A new term starts with an empty current ledger; historical enrollment records remain stored.
- Preserve existing block memberships and appointments; do not automatically enroll existing students in every subject.
- No new dependencies and no deployment, commit, or push as part of this change.

## Review Focus

- Two simultaneous enrollment requests must not create duplicate subject enrollments.
- A forged offering or another mayor’s block must not grant enrollment or management rights.
- Archived terms must not accept enrollment or subject changes.
- Withdrawing must revoke the additional subject access without removing an unrelated membership or mayor appointment.
- Cached ledger, subject lists, and member counts must update after mutations and clear on account changes.

## Task 1: Mayor-managed subject offerings

**Files:**
- Modify `backend/app/Http/Controllers/SubjectController.php`.
- Modify `backend/routes/api.php`.
- Create `backend/tests/Feature/SubjectOfferingTest.php`.
- Create `frontend/epanunot-app/src/features/block/SubjectForm.jsx`.
- Modify `frontend/epanunot-app/src/features/block/BlockManagement.jsx` and its CSS module.

**Interfaces:**
- `POST /api/blocks/{blockId}/subjects`, body `{code, name}`, returns `{data: {id, code, name}}`.
- `GET /api/subjects?block_id={blockId}` returns offerings visible to authenticated users for active blocks, allowing students to choose before enrollment.
- Keep the existing bulk assignment API compatible, but reject removal of offerings with enrollments.

- [ ] Write backend tests for normalization, canonical code reuse, conflicting names, required fields, unauthorized users, and archived terms.
- [ ] Run `C:\php84\php.exe artisan test --filter=SubjectOfferingTest` from `backend`; confirm new behavior fails before implementation.
- [ ] Implement transactional catalog reuse and offering creation, checking the active term and appointed mayor on the server.
- [ ] Add the mayor form with labeled fields, the full-name instruction, submission feedback, and duplicate-click protection.
- [ ] Re-run the focused tests and frontend build.

## Task 2: Enrollment persistence and ledger API

**Files:**
- Create an Artisan migration for `subject_enrollments` in `backend/database/migrations`.
- Create `backend/app/Http/Controllers/SubjectEnrollmentController.php`.
- Modify `backend/routes/api.php`.
- Create `backend/tests/Feature/SubjectEnrollmentTest.php`.

**Interfaces:**
- Table: `id`, `user_id`, `term_id`, `block_id`, `subject_id`, timestamps; unique `(user_id, term_id, subject_id)` plus foreign keys.
- `GET /api/subject-enrollments/mine` returns current-term rows with enrollment ID, subject code/name, block code, mayor, school year, and semester.
- `POST /api/subject-enrollments`, body `{block_id, subject_id}`, returns the enrolled row with HTTP 201.
- `DELETE /api/subject-enrollments/{id}` withdraws only the authenticated student’s enrollment.

- [ ] Write tests for immediate enrollment, two subjects across two blocks, same-subject duplicates across blocks, nonexistent offerings, archived terms, admin restrictions, ownership on withdrawal, and re-enrollment after withdrawal.
- [ ] Run the focused tests and confirm failures before implementation.
- [ ] Create the migration using Artisan. Enforce uniqueness in the database and serialize enrollment mutations through the student record, with useful validation responses.
- [ ] Validate term, offering, and role inside the transaction; never trust a term ID supplied by the client.
- [ ] Add tests proving term rollover hides old rows from the current ledger while preserving history.
- [ ] Run the focused tests with SQLite and verify the migration against local MySQL without resetting data.

## Task 3: Subject-aware access and membership

**Files:**
- Modify relevant query and authorization paths in `backend/app/Http/Controllers/{BlockController,BlockMemberController,TaskController,TaskCompletionController,AnnouncementController,CalendarEventController,ConcernController,MeController}.php`.
- Modify affected models, policies, and form requests only where current single-block checks prevent enrolled-subject access.
- Extend `backend/tests/Feature/SubjectEnrollmentTest.php` and existing affected feature tests.

**Interfaces:**
- Centralize active enrollment access in a focused service under `backend/app/Services`, following existing service conventions.
- Enrollment grants access to its matching block and subject, not all subjects in that block.
- Block-wide announcements are visible for enrolled blocks. Subject-specific tasks/events require the corresponding enrollment, with existing manager access preserved.
- Member lists/counts include distinct enrolled students and existing members, without double counting.
- Preserve the existing `block_id` response for compatibility; add current enrollment summary to `/me` rather than reassigning a mayor’s block.

- [ ] Write tests for cross-block subject access, unrelated-subject denial, block-wide announcement access, withdrawal revocation, distinct counts, and preserved mayor management permissions.
- [ ] Confirm these tests fail under the current single-block checks.
- [ ] Implement the shared access rules and update each affected query/policy consistently.
- [ ] Verify private concerns remain private and student enrollment does not grant mayor permissions.
- [ ] Run affected feature tests, followed by the full backend suite.

## Task 4: Student ledger and cached enrollment flow

**Files:**
- Modify `frontend/epanunot-app/src/features/block/JoinBlock.jsx` and its CSS module into the ledger and offering browser.
- Modify `frontend/epanunot-app/src/features/navigation/Navigation.jsx`.
- Modify `frontend/epanunot-app/src/features/dashboard/Dashboard.jsx` where the empty-state action refers to joining.
- Modify `frontend/epanunot-app/src/api/client.js` and `client.test.js`.
- Update subject selectors in relevant frontend forms to use real enrolled/offered subjects rather than an `Other`-only choice.

**Interfaces:**
- Keep `/join-block` working as the ledger route for existing links; label its navigation item “My ledger”.
- Make the ledger available to students regardless of existing block membership, and to mayors who also take subjects.
- Ledger shows subject code, full name, and block, with withdrawal confirmation.
- Block-code lookup displays available subjects with immediate “Enroll” actions. Already enrolled subjects show their current block and cannot be enrolled again.
- Mutation invalidation refreshes ledger, subject offerings, relevant block queries, and identity without clearing unrelated cached data.

- [ ] Add API cache tests for enrollment and withdrawal invalidation, preserved unrelated cache, and account separation; confirm new assertions fail first.
- [ ] Build the ledger, offering browser, empty/loading/error/retry states, and confirmation before withdrawal.
- [ ] Remove the old mayor-approval wording from the new enrollment flow; keep historical join request data intact.
- [ ] Wire subject selectors to the new server data and provide useful empty states.
- [ ] Run `npm test`, changed-file ESLint, and `npm run build` from `frontend/epanunot-app`.
- [ ] Verify locally with a mayor and two students: add a subject, enroll immediately, use different blocks for different subjects, reject a duplicate, withdraw, then switch the subject’s block.
- [ ] Check desktop/mobile layout and both themes; keep the existing teal design.

## Completion

- [ ] Run the full backend suite with PHP 8.4 and the frontend checks once final changes are complete.
- [ ] Review the diff for credentials, unintended data deletion, inconsistent authorization, and unrelated changes.
- [ ] Report the verified results and any required teammate migration command. Leave all changes local for review.
