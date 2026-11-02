# Student Types and Subject Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add regular/irregular enrollment, regular-only mayor eligibility, the requested navigation changes, and independent tasks for each selected subject.

**Architecture:** Extend the existing subject ledger with a term-scoped student classification and transactional regular-block enrollment. Reuse that enrollment service during mayor approval and shared-load publication. Create distinct task records per subject in both the Laravel API and the existing browser-storage task flow.

**Tech Stack:** Existing Laravel 13, PHP 8.4, MySQL, React 19, TanStack Query 5, and Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-01-student-types-and-subject-tasks-design.md` (approved).

## Global Constraints

- Classification belongs to the current academic term; historical enrollment/classification remains stored.
- Regular students and mayors enroll in the complete block load. Irregular students select subjects across blocks.
- Keep the unique student/term/subject enrollment constraint. Never silently move or delete a conflicting enrollment.
- Only admins change published shared subject loads; enrolled-subject removal remains guarded.
- Each subject-specific task has its own ID, subject, completion state, and count.
- Preserve existing tasks and completion history; do not multiply old tasks or retroactively copy them to newly added subjects.
- No new dependencies, demo seeds, commits, pushes, or deployment. Continue directly on the existing feature branch and preserve prior local changes.
- This change does not replace the browser-storage prototypes with complete server integration.

## Review Focus

- Regular join must fail atomically if one required subject is already enrolled in another block.
- Pending mayor applications must become ineligible after the applicant joins a block, even if their cached UI still permits approval.
- Irregular students with a legacy primary block must stop receiving unrelated subject tasks once classified; primary membership must not bypass subject filtering.
- Concurrent regular enrollment, load publication, and rollover must not create incomplete loads, duplicate enrollments, or partial role changes.
- Three subject tasks must keep distinct completion IDs across refresh/storage round trips; one completion must change counts by one.

## Task 1: Term classification and atomic enrollment

**Files:**
- Create an Artisan migration in `backend/database/migrations` for `student_term_profiles` and a nullable regular-student declaration on `mayor_applications`.
- Create `backend/app/Services/StudentEnrollmentService.php` and `backend/app/Http/Controllers/EnrollmentProfileController.php`.
- Modify `backend/app/Http/Controllers/{SubjectEnrollmentController,MeController}.php`, `backend/app/Services/SubjectAccess.php`, and `backend/routes/api.php`.
- Create `backend/tests/Feature/StudentEnrollmentTypeTest.php`; update `SubjectEnrollmentTest.php` fixtures for classification.

**Interfaces:**
- `student_term_profiles`: user/term FKs, `student_type` (`regular` or `irregular`), nullable `regular_block_id` FK, timestamps; unique `(user_id, term_id)`.
- `GET /api/enrollment-profile` returns the current profile or null, active term, legacy membership/enrollment summary, and whether mayor reconciliation is needed. Reading never creates or changes records.
- `PUT /api/enrollment-profile`, body `{student_type:'irregular'}`, lets an unclassified student confirm irregular status while retaining their existing enrollments. It cannot change an established classification or classify an appointed mayor as irregular.
- `POST /api/blocks/{blockId}/enrollment`, body `{student_type:'regular'}` or `{student_type:'irregular',subject_ids:[...]}`, joins/enrolls immediately. Regular means the complete offered load; irregular means only the selected offered subjects.
- `POST /api/enrollment-profile/reconcile-mayor` reconciles the current appointed mayor into regular enrollment for their own active block. On conflict, keep all existing records and return the action required.
- `StudentEnrollmentService::enrollBlock(int $userId, int $blockId, string $studentType, array $subjectIds = []): array` validates/locks term first, then student/profile, and performs an all-or-nothing mutation.
- `StudentEnrollmentService::syncRegularMembers(array $blockIds): void` enrolls declared regular members and appointed mayors in all currently offered subjects. Called inside the term-locked publication transaction in Task 2.
- `/me` includes `student_type`, regular block, `can_apply_as_mayor`, and `mayor_application_disabled_reason` derived from active records.
- Keep the existing individual subject-enrollment endpoint for classified irregular students; new unclassified callers must supply an explicit irregular choice or use the new block enrollment flow. Reject individual withdrawals for regular students and mayors.

- [ ] Write tests for regular whole-load enrollment and idempotent repeats; assert one profile and one enrollment per subject, and that membership is set only after all subjects succeed.
- [ ] Add tests for irregular multi-block subjects, classification confirmation for legacy records, regular cross-block conflicts, forbidden individual withdrawal, inactive/unappointed/empty blocks, and immutable classification.
- [ ] Add tests proving classified irregular students cannot see unrelated subjects through a legacy primary block; preserve unclassified historical visibility until confirmation.
- [ ] Add tests for term rollover leaving history intact but returning an unclassified current profile.
- [ ] Run `C:\php84\php.exe artisan test --filter=StudentEnrollmentTypeTest` from `backend`; confirm the new behavior fails first.
- [ ] Generate the additive migration using Artisan and implement the service, profile/enrollment routes, `/me` metadata, and classification-aware access checks.
- [ ] Update existing enrollment tests to explicitly classify irregular fixtures where needed; retain their original ownership/duplicate/access assertions.
- [ ] Re-run enrollment/access feature tests; expect all assertions above to pass without deleting legacy data.

## Task 2: Regular-only mayor approval and load synchronization

**Files:**
- Modify `backend/app/Http/Controllers/Mayor/ApplicationController.php`, `backend/app/Http/Controllers/Admin/MayorApplicationController.php`, and `backend/app/Services/MayorApprovalService.php`.
- Modify `backend/app/Services/SubjectLoadService.php`, `backend/app/Models/MayorApplication.php`, and `backend/app/Http/Resources/MayorApplicationResource.php`.
- Modify relevant member removal in `backend/app/Http/Controllers/BlockMemberController.php` so active classification cannot retain a removed regular block.
- Create `backend/tests/Feature/MayorRegularEnrollmentTest.php`; extend `SubjectLoadTest.php` and existing mayor application fixtures.

**Interfaces:**
- New mayor applications require `is_regular_student:true`; reject irregular profiles, any active primary block, or any active subject enrollment.
- Approval rechecks those same active membership rules, target mayor assignment, and regular declaration under the term lock before publishing or assigning anything.
- For older pending applications without a declaration, admin review must explicitly confirm regular eligibility using `confirm_regular_student:true`; existing membership still blocks approval. This avoids requiring a nonexistent applicant cancellation flow.
- Valid approval uses Task 1's service to record regular status and enroll the new mayor in every subject in their assigned load, within the same transaction as block/role/application changes.
- Publication calls `syncRegularMembers` after offering synchronization and before commit. New subjects are added for regular members/mayors only; irregular enrollments remain unchanged. Any conflict rolls back the whole publication.
- Current legacy mayors with missing enrollment receive an explicit reconciliation action; conflicts remain visible and are never silently resolved by moving subjects.

- [ ] Write tests rejecting false/missing declarations, irregular applicants, existing block members, and students with only cross-block subject enrollment.
- [ ] Write a stale-application test: submit while eligible, join a block, then attempt approval; assert application, role, load, and block are not partially changed.
- [ ] Write tests for successful mayor auto-enrollment, legacy admin confirmation, safe mayor reconciliation, and rollback on enrollment conflict.
- [ ] Extend load tests: adding a subject enrolls regular students and the mayor, leaves irregular students untouched, and preserves atomicity if one required enrollment conflicts.
- [ ] Run `C:\php84\php.exe artisan test --filter='MayorRegularEnrollmentTest|SubjectLoadTest'`; confirm new assertions fail first.
- [ ] Implement the submission/approval guards, declaration persistence, regular enrollment, publication synchronization, and member-removal profile consistency.
- [ ] Update existing mayor test helpers to use eligible unjoined students and explicit declarations; preserve authorization and duplicate-application coverage.
- [ ] Run the full backend suite and resolve regressions according to the approved new behavior.

## Task 3: Real per-subject tasks and independent completion

**Files:**
- Modify `backend/app/Http/Requests/{StoreTaskRequest,UpdateTaskRequest}.php`, `backend/app/Http/Controllers/{TaskController,TaskCompletionController}.php`, and `backend/app/Http/Resources/TaskResource.php` where needed.
- Create `backend/app/Services/SubjectTaskService.php` for transactional creation and subject-enrolled recipients.
- Create `backend/tests/Feature/SubjectTaskBatchTest.php`; update existing task/deadline fixtures with valid subjects and regular mayor enrollment.
- Create `frontend/epanunot-app/src/context/subjectTaskCreation.js` and its Node test file.
- Modify `frontend/epanunot-app/src/context/{TaskContext.jsx,taskVisibility.js}` and relevant task/storage tests.
- Modify `frontend/epanunot-app/src/features/{dashboard/Dashboard.jsx,dashboard/TaskItem.jsx,calendar/Calendar.jsx}`.

**Interfaces:**
- A single subject uses `subject_id`; All subjects uses `all_subjects:true`, mutually exclusive with `subject_id`. Validate against the appointed mayor's active block and current offerings.
- `SubjectTaskService::create(User $mayor, array $values): Collection` returns one persisted task per selected subject. Require reconciled regular mayor enrollment and a nonempty offered load.
- Single-subject API creation retains its existing resource shape. An explicit All subjects request returns a collection with HTTP 201. Every created row has a real subject ID and distinct task ID.
- Assign recipients by the task's subject enrollment, retaining only explicit legacy compatibility required for old unclassified records. An irregular primary-block member is not a recipient of unrelated subjects.
- `createSubjectTasks(values, offeredSubjects, makeId)` produces the analogous distinct records for the browser-storage frontend. Personal tasks still produce one record. Store generated IDs once, not anew while rendering.
- Dashboard and Calendar pass the explicit selected subject or All subjects into shared task creation. Show subject labels on task items; count the resulting visible tasks directly.
- Editing/deleting/completing one task never operates on sibling tasks merely because their titles match. New subjects do not receive old tasks automatically.

- [ ] Write backend tests asserting three offered subjects create exactly three distinct task rows/assignments; completing one leaves the other two incomplete.
- [ ] Add tests for a two-subject irregular student seeing/counting only two copies, unauthorized creation, unrelated subject IDs, empty loads, deadlines, and atomic batch failure.
- [ ] Run `C:\php84\php.exe artisan test --filter=SubjectTaskBatchTest`; confirm new behavior fails first.
- [ ] Write Node tests for three unique IDs/subjects, one personal task, irregular filtering, independent completion/counts, and storage round trips retaining IDs and completion state.
- [ ] Run `node --test src/context/subjectTaskCreation.test.js`; confirm failures before implementation.
- [ ] Implement task creation on both existing paths, subject-aware recipients/visibility, subject labels, and the explicit task selection controls.
- [ ] Preserve all existing stored task IDs/completions; do not rewrite historical generic tasks. Update old task fixtures for the newly required offered subject selection.
- [ ] Run affected backend and frontend task tests; expect separate creation, counts, and completion behavior to pass.

## Task 4: Enrollment UI, navigation, eligibility, and final verification

**Files:**
- Modify `frontend/epanunot-app/src/features/block/{JoinBlock.jsx,JoinBlock.module.css,BlockManagement.jsx}`.
- Modify `frontend/epanunot-app/src/features/navigation/{Navigation.jsx,Navigation.module.css,ApplyMayorModal.jsx}`.
- Modify `frontend/epanunot-app/src/features/admin/ApplicationSubjectReview.jsx`, `frontend/epanunot-app/src/features/dashboard/Dashboard.jsx`, and relevant profile/subject-choice display.
- Create `frontend/epanunot-app/src/features/block/enrollmentRules.js` and its Node tests for eligibility/selection presentation.
- Modify `frontend/epanunot-app/src/api/{client.js,client.test.js}`.

**Interfaces:**
- Ledger presents Regular/Irregular before joining. Regular offers one whole-load action and read-only required subjects; irregular offers applicable subject selection and immediate enrollment.
- Existing unclassified students see a classification confirmation section tied to their existing block/enrollments. Mayors see regular reconciliation status and an explicit action if enrollment needs attention.
- Do not offer individual withdrawal to regular students or mayors. Display a clear explanation rather than an unusable disabled action with no reason.
- The mayor application includes an unchecked required regular-student declaration. Admin review displays it or asks for explicit confirmation for legacy applications.
- My ledger uses a book icon in both main navigation variants. Block Management is removed from both main variants and appears only for mayors, immediately below My Profile in the dropdown, using the people icon.
- Students already belonging to a block see a disabled Apply as Mayor item and the server-derived reason. Recheck eligibility before opening/submitting a stale modal and preserve the backend restrictions from Task 2.
- Relevant mutations invalidate profile, identity, ledger, subjects, members, task/calendar, and application eligibility queries; retain unrelated cached data and account separation.

- [ ] Write Node tests for eligibility with primary membership, subject-only membership, irregular status, and eligible unjoined students; validate regular versus irregular control states.
- [ ] Add cache tests for new enrollment/profile routes and regular reconciliation, preserving unrelated cached queries; run these tests and confirm failure first.
- [ ] Implement the UI states, declaration/legacy confirmation, disabled explanations, distinct icons, dropdown placement, and cache updates. Correct outdated text asking mayors to add admin-managed subjects.
- [ ] Run all frontend tests, changed-file ESLint, and production build; expect zero failures.
- [ ] Run the full backend suite, apply the additive migration locally, and inspect routes. Preserve existing real data; do not seed sample curriculum or tasks.
- [ ] Smoke-check regular/irregular choice, mayor declaration/disabled eligibility, dropdown placement/icons, separate task labels/counts, and responsive/theme behavior. Use tests for destructive/conflicting scenarios rather than changing real students' records.
- [ ] Obtain one read-only whole-change review. Reproduce important findings with a failing test, then fix and verify them.
- [ ] Record final verification results and teammate migration instructions. Leave the feature branch local and uncommitted as approved.

## Self-review

All approved requirements map to a task. Tasks 1–2 share one regular-enrollment service and term-first lock order; Task 3 uses the same current classification/enrollments for recipients and filtering; Task 4 consumes server-derived eligibility rather than recreating authorization in the browser. The review-focus cases each have an explicit test obligation. Classification changes, whole-block leaving, bulk task editing, and complete frontend/backend storage integration remain outside the approved scope.

## Execution record

- Direct execution on the existing feature branch; preserve earlier local work and do not commit or push.
- Task 1: 5 new enrollment tests failed for missing routes, then passed with 30 assertions.
- Task 2: regular mayor tests failed for missing declaration/auto-enrollment rules, then the combined enrollment and mayor suite passed: 10 tests, 58 assertions.
- Task 3: 4 task-batch tests failed under the old single generic task behavior, then passed: 4 tests, 22 assertions. Frontend task tests first failed for the missing creation module.
- Additive classification/declaration migration applied to local MySQL without changing existing student classification or enrollment records.
- Task 4 implemented: enrollment classification and ledger controls, regular mayor declaration/reconciliation, eligibility explanations, dropdown navigation, distinct icons, and dependent cache invalidation.
- Independent read-only review found two legacy bypasses. Regression tests reproduced both before fixes: legacy join/approval writes now return 422 directing students to immediate classified enrollment; classified irregular students with no enrolled subjects no longer see generic legacy tasks. Historical requests remain readable and dismissible.
- Final verification: all 103 backend tests passed (464 assertions); all 41 frontend Node tests passed; changed-file ESLint and production build passed; git diff whitespace check passed.
- Browser smoke check confirmed an existing block member sees disabled Apply as Mayor with the assigned-mayor explanation, and the ledger exposes explicit Regular/Irregular confirmation for a legacy unclassified student. No enrollment records were changed through the browser.
- Teammates must run `C:\php84\php.exe artisan migrate` from the backend directory before testing. Existing students confirm classification in My ledger; existing mayors reconcile their regular enrollment there or in Block Management. Do not seed or reset the database.
- Changes remain local and uncommitted on the existing feature branch; no push or deployment performed.
