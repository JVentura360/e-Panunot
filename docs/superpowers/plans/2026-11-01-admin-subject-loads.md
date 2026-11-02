# Admin Subject Loads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect initial subject-load proposals with mayor applications and give admins sole authority to publish shared loads across matching blocks.

**Architecture:** Store a revisioned load per term/program/year, referencing the existing subject catalog. Application proposals remain unpublished snapshots. A shared service handles normalization, publication, enrollment-safe synchronization, and assignment during mayor approval.

**Tech Stack:** Existing Laravel 13/PHP 8.4/MySQL backend, React 19 frontend, and TanStack Query 5; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-shared-subject-loads-design.md` (approved).

## Global Constraints

- “Only an admin can approve, add, remove, or otherwise change a published load.”
- “Admin load changes apply to every existing matching block and to future matching blocks.”
- Matching scope is `(term_id, program, year_level)`; term includes school year and semester.
- “Enter the complete subject name; avoid abbreviations.”
- Normalize codes to uppercase and full names to titles, including `Fundamentals of Database Systems`.
- Preserve existing blocks, subjects, enrollments, application history, and unrelated local changes.
- Reject removal of subjects with enrollments; never silently withdraw students.
- Keep the existing top-level admin navigation and put load management in School Year.
- Do not commit, push, or deploy. Continue direct execution on the existing `codex/subject-enrollment` feature branch.

## Review Focus

- A forged mayor request must not bypass the read-only UI to publish or change a load.
- A first proposal approved after another application establishes a load must not overwrite that load.
- A save that would remove an enrolled subject from one matching block must leave every matching block unchanged.
- A stale form or a term rollover between read and save must not publish to the wrong term or overwrite a newer revision.
- Switching program/year in an application must not submit a proposal or inherited load from the previous selection.

---

## Task 1: Shared-load persistence, publication, and permissions

**Files:**
- Create an Artisan migration in `backend/database/migrations` for `subject_loads`, `subject_load_subject`, and application snapshot columns.
- Create `backend/app/Services/SubjectLoadService.php` and `backend/app/Http/Controllers/SubjectLoadController.php`.
- Modify `backend/app/Http/Controllers/SubjectController.php` and `backend/routes/api.php`.
- Create `backend/tests/Feature/SubjectLoadTest.php`; update `SubjectOfferingTest.php` for the new admin-only contract.

**Interfaces:**
- `subject_loads`: ID, term FK, normalized program, year level, revision, updater FK, timestamps; unique `(term_id, program, year_level)`.
- `subject_load_subject`: load FK and subject FK, composite primary key. Do not delete catalog subjects with a published load reference.
- `mayor_applications`: nullable `proposed_subjects` JSON snapshot and nullable `subject_load_revision`; old records remain valid.
- `GET /api/subject-loads/current?program=ITE&year_level=3` returns `{data:{term, load, blocks, existing_subjects}}`. `load` is null or `{id, revision, subjects:[{id,code,name}]}`. Existing subjects are the union of matching block offerings; no member information is returned.
- `PUT /api/admin/subject-loads/current` accepts `{term_id, program, year_level, expected_revision, subjects:[{code,name}]}`; expected revision is 0 when no load exists. Return the same current-load shape.
- `SubjectLoadService::publish(int $termId, string $program, int $yearLevel, int $expectedRevision, array $subjects, int $adminId): object` checks active term/revision, resolves subjects, and synchronizes matching blocks atomically.
- `SubjectLoadService::assignToBlock(int $loadId, int $blockId): void` assigns an approved load to one new/claimed matching block, preserving the enrolled-subject removal guard.
- Existing `POST /blocks/{id}/subjects` and `PUT /blocks/{id}/subjects` must not remain a per-block mutation bypass: return a clear 403 directing callers to admin shared-load management. Catalog mutation methods remain admin-only.

- [ ] Write tests using ITE Year 3 blocks 04 and 09 in the same active term. Assert one admin save assigns both, increments revision, and leaves a different program/year/term untouched.
- [ ] Add tests asserting student and mayor saves fail with 403; the old block-level write endpoints also fail and cannot change the database.
- [ ] Add tests for normalized reuse, duplicate codes, incomplete values, array-valued fields, conflicting catalog names, and creation before any matching block exists.
- [ ] Add tests for expected revision mismatch (409), wrong/archived term, preserving legacy offerings before publication, and atomic failure when one affected block has an enrollment in a removed subject.
- [ ] Run `C:\php84\php.exe artisan test --filter=SubjectLoadTest` from `backend`; confirm these new behaviors fail first.
- [ ] Generate the migration with Artisan, implement the service/controller/routes, and switch the old mutation permissions. Lock the term before the load and any affected block/user rows so publication and rollover cannot interleave.
- [ ] Run the focused tests; expect all assertions above to pass. Preserve historical tables and do not backfill guessed shared loads.

## Task 2: Application proposals and atomic approval

**Files:**
- Modify `backend/app/Http/Controllers/Mayor/ApplicationController.php`.
- Modify `backend/app/Http/Controllers/Admin/MayorApplicationController.php`.
- Modify `backend/app/Services/MayorApprovalService.php` and `backend/app/Http/Resources/MayorApplicationResource.php`.
- Create `backend/tests/Feature/MayorSubjectLoadTest.php`; update existing `MayorApplicationTest.php` fixtures to meet the revised contract.

**Interfaces:**
- Mayor application submission accepts `proposed_subjects:[{code,name}]` only when no published load exists. At least one complete row is then required. Store the normalized snapshot without creating catalog subjects or block offerings.
- With a published load, derive its identity/revision on the server and reject a supplied nonempty proposal. Applicant-supplied catalog IDs or term IDs never authorize a change.
- Admin application detail includes `proposed_subjects`, current `subject_load`, and its revision, plus the existing applicant/block details.
- Approval accepts `{expected_revision, subjects?}`. The optional reviewed subjects are allowed only when publishing the first load. For an existing load, use that current load; changing it requires the admin load-management endpoint.
- `MayorApprovalService::approve(int $applicationId, object $admin, int $expectedRevision, ?array $subjects = null): object` creates/claims the block, publishes a first reviewed proposal if necessary, assigns the approved load, and appoints the mayor in one transaction.
- Missing proposals on legacy applications require an admin to establish a shared load first. Report the required action; never fabricate proposal subjects.

- [ ] Write tests proving submission stores only a proposal, rejection publishes nothing, and an inherited load is read-only even under a forged HTTP request.
- [ ] Write tests proving first approval publishes/assigns the reviewed load and propagates it to existing matching blocks; a later matching approval receives the same canonical IDs.
- [ ] Write tests proving stale revisions return 409, and a stale first proposal cannot overwrite a load established by another approval.
- [ ] Write tests for legacy pending applications, archived-term approval, and publication failure rolling back block creation, role changes, and application status.
- [ ] Run `C:\php84\php.exe artisan test --filter=MayorSubjectLoadTest`; confirm failures first.
- [ ] Implement proposal validation/storage and approval integration. Refactor approval lock order to term → load → application → applicant/block, matching Task 1 and existing rollover locking.
- [ ] Update existing mayor application test payloads/fixtures with proposals or approved loads, preserving their original authorization and duplicate-application assertions.
- [ ] Run `C:\php84\php.exe artisan test`; expect the full backend suite to pass.

## Task 3: Applicant proposal editor and read-only mayor subjects

**Files:**
- Create `frontend/epanunot-app/src/features/subjects/SubjectLoadEditor.jsx` and its CSS module for reusable code/name rows.
- Create `frontend/epanunot-app/src/features/subjects/subjectLoadForm.js` and `subjectLoadForm.test.js` for payload validation and scope identity.
- Modify `frontend/epanunot-app/src/features/navigation/ApplyMayorModal.jsx` and its CSS module.
- Modify `frontend/epanunot-app/src/features/block/BlockManagement.jsx`.
- Remove the unused mayor `SubjectForm.jsx` and its form-only CSS after references are removed.

**Interfaces:**
- `SubjectLoadEditor({value, onChange, disabled, idPrefix})` renders repeatable required code/full-name rows. Row add/remove controls never submit the parent form accidentally.
- The application reads Task 1's GET endpoint with program/year as part of the TanStack Query key.
- Pending lookup or lookup failure disables submission and exposes loading/error/retry states. A published load is rendered read-only; no proposal editor is shown.
- Scope changes clear the proposal. Submission is tied to the scope that produced the current load result, preventing a late lookup from showing or submitting another scope's subjects.
- Block Management shows read-only subjects and “Subject loads are managed by the admin.”

- [ ] Write Node tests asserting incomplete and duplicate rows cannot become submission payloads, subject names/codes are retained for server normalization, and changing scope cannot reuse a previous proposal.
- [ ] Run `node --test src/features/subjects/subjectLoadForm.test.js`; confirm the tests fail first.
- [ ] Build the shared editor and application states, including the exact full-name instruction from the spec. Use native form validation, labels, error announcements, and the existing teal theme.
- [ ] Remove mayor subject mutation controls and update the explanatory copy.
- [ ] Run the form tests, changed-file ESLint, and `npm run build`; expect all to pass.

## Task 4: Admin management, review, caching, and final verification

**Files:**
- Create `frontend/epanunot-app/src/features/admin/SubjectLoadSettings.jsx` and `ApplicationSubjectReview.jsx`, with colocated CSS as necessary.
- Modify `frontend/epanunot-app/src/features/admin/{AdminDashboard,MayorApplications}.jsx` and `frontend/epanunot-app/src/context/BlockContext.jsx`.
- Modify `frontend/epanunot-app/src/api/client.js` and `client.test.js`.

**Interfaces:**
- Render SubjectLoadSettings alongside SchoolYearSettings in the existing School Year area. Select program/year, show published revision or no-load state, show existing block subjects for deliberate review, and use SubjectLoadEditor for the admin's complete replacement load.
- Save sends the displayed term ID/revision and explains which matching block codes are affected. A 409 preserves the unsaved draft and asks the admin to reload/reconcile; do not silently overwrite.
- Replace direct Accept with an application review that displays the proposal/current load. Only the first load can be edited in that approval view. An explicit approval action sends Task 2's payload; return to the application list after success.
- Extend `BlockContext.approve` to accept the review payload and preserve its existing `{ok,message}` result contract.
- Subject-load saves and mayor approval invalidate subject-load lookups, block/subject lists, affected application queries, identity, ledger, and class-content queries whose access may have changed. Keep unrelated cached queries fresh and retain account-change cache clearing.

- [ ] Add cache tests for shared-load publication and approval invalidation, asserting unrelated cached data is reused. Run them and confirm failure before implementation.
- [ ] Implement admin load settings and application review, showing server validation failures without losing the entered rows.
- [ ] Wire the reviewed approval payload and cache invalidation. Keep the existing School Year / Applications / Mayors top-level navigation.
- [ ] Run `node --test src/**/*.test.js src/features/**/*.test.js`, changed-file ESLint, and `npm run build` from `frontend/epanunot-app`; expect zero failures.
- [ ] Apply the additive migration locally with `C:\php84\php.exe artisan migrate --no-interaction`; inspect the new routes and verify existing data remains intact.
- [ ] Smoke-check application proposal/inherited views, admin review/load settings, and read-only mayor subjects in the browser, including narrow layout and both themes. Use existing development accounts; do not seed preset content.
- [ ] Run the full backend suite once final changes are complete, and obtain one read-only whole-change review. Fix important findings with regression tests.
- [ ] Report verified results and the migration command teammates need. Leave code local and uncommitted.

## Self-review

The tasks cover every approved requirement. Tasks 2–4 consume the same scope, revision, subject-row, and response interfaces defined above. Enrollment removal protection, stale forms/proposals, forged mutation requests, scope switching, and historical data preservation each have a named test obligation. The earlier browser-storage task/concern prototypes remain in place; this change governs shared subject loads and does not replace their storage architecture.

## Execution record

- Continuing direct execution in the user-approved existing feature branch with earlier ledger changes preserved; no commits, merges, or pushes.
- Task 1: shared-load feature tests first failed for missing routes, then passed: 5 tests, 42 assertions.
- Task 2: application-load feature tests first failed for missing proposal/approval rules, then passed: 6 tests, 37 assertions. Full regression fixtures are being updated for the approved contract.
- Shared interfaces checked: application submission/review and admin settings use the same term/program/year scope, revision, and code/name rows; the existing catalog and enrollment tables remain authoritative.
- Task 3: proposal form tests failed for the missing form module, then passed. Applicant load lookup is scoped by program/year; mayor subject lists are read-only.
- Task 4: cache invalidation tests failed before the client changes, then passed. Admin settings and review are implemented; 33 frontend tests, build, and changed-file ESLint passed on the first integrated run.
- Ruling: add optional expected term/revision guards to application submission, sent by the new UI, so a load lookup from an old term cannot silently become a proposal for a new term. Older clients remain subject to the same server-derived published-load rules.
- Final review: fixed the MySQL repeatable-read ordering finding by ensuring the term lock is the first transactional read in publication/approval. The regression test failed on the original admin-role read, then passed for both paths. Catalog resolution uses current locking reads; transaction retries handle deadlocks.
- Final review: displayed row validation messages in applicant, admin settings, and application review rather than leaving duplicate-code actions disabled without explanation.
- Ruling: made the enrollment test's block fixture deterministic after a random factory collision reproduced the database's composite uniqueness error. No product behavior was changed for that test failure.
- Migration applied successfully to the existing local XAMPP MySQL database: `2026_11_01_143109_create_shared_subject_loads`; no curriculum data was seeded and no existing enrollments were removed.
- Final verification: full backend suite **87 tests / 373 assertions passed**; frontend **33 tests passed**; production build and changed-file ESLint passed; `git diff --check` reported no whitespace errors.
- Browser checks: initial application proposal fields, duplicate-code feedback, year-change draft reset, centered/scrolled 390px layout, admin School Year load editor, actual affected block `31-ITE-01`, cached reopening, and light/dark themes. Restored the original light preference and default viewport. Approval/inheritance/rollback behavior was verified by feature tests without publishing sample curricula to the user's database.
- Tasks 1–4 complete. Existing unrelated changes are preserved. Keep this feature branch local, uncommitted, and unpushed as approved.
