# Block-first enrollment — handoff

## Status

The user confirmed the flow below on November 2, 2026. The revised flow is now implemented locally on `codex/subject-enrollment`, preserving all earlier uncommitted work. Do not commit, push, deploy, reset the database, or seed data unless requested.

## Confirmed user flow

1. A student without a block sees **Join a Block** in the navigation. The dashboard offers **Join a Block** or **Apply as Mayor**, subject to application eligibility.
2. On Join a Block, the student enters a block code and confirms their status: **Regular** or **Irregular**.
3. Joining establishes actual block membership for either status. The chosen block becomes the student's displayed block.
4. After joining, the navigation item becomes **My Ledger**.
5. Regular students automatically enroll in the chosen block's assigned subjects. They can **Withdraw** individual subjects, including subjects completed in previous terms or school years, while retaining regular status and block membership.
6. Irregular students first join their chosen block, then use My Ledger to search blocks and enroll in applicable subjects. They can take subjects in different blocks; their displayed block stays the block they initially joined.
7. Both regular and irregular students have Withdraw buttons for enrolled subjects.
8. **An empty ledger alone does not clear block membership.** This was explicitly clarified and confirmed: an irregular student can belong to a block before enrolling in subjects. Withdrawing the last subject must not undo membership.

## Removal from a block

The user also requested that removing a student from a block removes their enrollments in that block and access to tasks assigned by that block's mayor. Preserve personal tasks and unrelated enrollments in other blocks. Clear their displayed primary block when they are removed from that primary block. Task removal means removing that student's assignment/access; do not delete shared tasks for other students.

The earlier statement that zero enrolled subjects should reopen joining/application choices was superseded by the confirmed clarification above. Use block membership, rather than subject count, to determine Join a Block versus My Ledger and initial onboarding.

## Existing implemented behavior to retain

- Regular-student withdrawal already works in the backend and My Ledger.
- Subject-load updates enroll regular students in newly added subjects without restoring previously withdrawn subjects.
- Updated after the user's subsequent request: mayors may also withdraw individual subjects while keeping regular status, block membership, and their mayor role. Reconciliation and subject-load updates preserve their withdrawals; they can still manage and assign tasks for the block's offered subjects.
- Duplicate subject enrollment in a term is prohibited.
- Existing block members cannot apply as mayor; backend submission and approval enforce eligibility.
- All-subject tasks become separate tasks per subject, with independent completion.
- Block Management is in the mayor's account dropdown below My Profile, with a people icon; My Ledger uses a book icon.
- Preserve existing query caching and invalidation, personal tasks, and existing stored task IDs/completion history.

## Current gaps and relevant files

### Backend

- `backend/app/Services/StudentEnrollmentService.php`: `enrollBlock()` currently requires subjects for irregular enrollment and only assigns `users.block_id` for regular students. Separate initial membership from later irregular subject enrollment. Set the initial primary block for either status and never replace it when an irregular student enrolls elsewhere.
- `backend/app/Http/Controllers/EnrollmentProfileController.php`: exposes classified block enrollment; choose a clear membership interface consistent with existing routes and term-first transaction locking.
- `backend/app/Http/Controllers/SubjectEnrollmentController.php`: individual subject enrollment currently can classify/enroll an unjoined student. Require initial active block membership before subject enrollment. Preserve withdrawal ownership and archived-term guards.
- `backend/app/Http/Controllers/BlockMemberController.php`: inspect removal behavior and membership/member-list queries for primary members who have zero subjects. Existing legacy join-request creation and approval routes intentionally return 422; do not restore the old approval flow.
- `backend/app/Http/Controllers/MeController.php`: ensure current primary membership and displayed block are authoritative even with zero enrollments.
- `backend/app/Services/SubjectAccess.php`: preserve subject-based visibility for classified students. Membership alone must not expose subjects they have withdrawn from.
- `backend/app/Services/StudentEnrollmentService.php` and `backend/app/Services/SubjectLoadService.php`: preserve newly-added-subject-only synchronization for regular students and full-load reconciliation for mayors.

### Frontend

- `frontend/epanunot-app/src/features/navigation/Navigation.jsx`: navigation currently always says My ledger. Change desktop/mobile labels and icon based on actual block membership.
- `frontend/epanunot-app/src/features/block/JoinBlock.jsx`: currently combines joining and subject selection. Present a membership-first screen to unjoined students, then the ledger and irregular subject search after joining. Do not require irregular subject selection to join.
- `frontend/epanunot-app/src/features/block/EnrollmentStatus.jsx`: align classification guidance with joining first.
- `frontend/epanunot-app/src/features/block/enrollmentRules.js`: centralize membership-dependent UI rules where useful.
- `frontend/epanunot-app/src/features/dashboard/Dashboard.jsx`: onboarding must depend on membership, not enrollment count. Preserve Join a Block / Apply as Mayor choices for unjoined students.
- `frontend/epanunot-app/src/api/client.js`: membership changes must invalidate identity, profile, ledger, block/member data, subject access, tasks, calendar, and eligibility queries while preserving unrelated cached data.
- `frontend/epanunot-app/src/context/taskVisibility.js` and `TaskContext.jsx`: ensure removal and withdrawal remove applicable mayor-task visibility without affecting personal or unrelated tasks. The current task UI still has a browser-storage path; verify both existing paths without claiming complete backend integration.

## Suggested implementation and verification

1. Inspect current controllers/services and repository instructions before editing; preserve the large existing local diff.
2. Add regression tests first for irregular membership with zero subjects, displayed block retention during cross-block subject enrollment, rejection of subject enrollment before joining, and cleanup on removal.
3. Implement membership separately from irregular subject selection, preserving active-term checks, term-first locks, duplicate protection, and mayor eligibility.
4. Update navigation, onboarding, and Join a Block / My Ledger states. Keep existing teal light/dark styling and accessible loading/error feedback.
5. Test regular automatic enrollment and withdrawal, irregular joining before subjects, cross-block enrollment without primary-block replacement, zero-subject membership retention, and removed-member task/subject access.
6. Run backend and frontend suites, changed-file lint, production build, and `git diff --check`. Smoke-check desktop/mobile labels and onboarding where possible without changing real student records.

## Last verified baseline

Before this revised flow: **103 backend tests passed (469 assertions)**; **41 frontend tests passed**; production build, changed-file ESLint, and whitespace checks passed. The new block-first flow has not yet been implemented or tested.

Use PHP 8.4 explicitly: `C:\php84\php.exe`. Run Laravel commands from `backend`, not the repository root. Existing additive migrations were applied locally; do not assume a new migration is necessary for this flow before inspecting the schema.

Typical checks:

```powershell
# From backend
C:\php84\php.exe artisan test

# From frontend/epanunot-app
node --test src/**/*.test.js src/features/**/*.test.js
npm run build
```

Local secrets remain in environment files. Do not print credentials or reuse tokens pasted in earlier conversation.

## Implementation record — November 2, 2026

- Added authenticated `POST /api/blocks/{blockId}/join`, with Regular/Irregular confirmation and no subject-selection payload. Regular joins enroll the full assigned load; irregular joins establish primary membership with zero subjects. Cross-block subject enrollment cannot replace the primary block.
- Individual and bulk irregular subject enrollment now require prior active primary-block membership. Existing legacy classified subject-only users must join a primary block before adding subjects; their existing unrelated records are preserved.
- Membership snapshot exposes the active primary block; identity reads use that authoritative value. No schema change or migration is needed for this revision.
- Desktop/mobile navigation now shows Join a Block before membership and My Ledger afterward. Dashboard onboarding uses primary membership rather than enrollment count.
- Join a Block asks for code/status and does not offer irregular subject checkboxes until joining succeeds. My Ledger retains withdrawal for both student statuses and lets irregular students search subject offerings across blocks.
- Existing block removal already deletes that block's enrollments and task assignments and clears matching primary membership. Regression coverage confirms unrelated enrollments/tasks remain, shared task records are retained, and an empty ledger alone preserves primary membership.
- Join mutations invalidate identity, classification, ledger, members, eligibility, subject/task/calendar access, and related queries while preserving unrelated cached data.
- Independent read-only review found one important error-state gap: hidden failed ledger/profile reads could silently disable initial joining. Added a failing readiness regression and fixed it: initial membership does not depend on the subject ledger succeeding, and failed membership lookup exposes a retry action.
- Final checks: **105 backend tests passed (508 assertions)**; **43 frontend Node tests passed**; production build, changed-file ESLint, and `git diff --check` passed.
- Live browser smoke testing was not completed: available local browser tabs reported localhost:5173 unreachable, and the local port inventory returned no listeners. Automated feature and UI-rule tests cover the revised behavior; no real student membership/enrollment records were changed for testing.
- Nothing committed, pushed, or deployed. Existing frontend task persistence still includes browser storage; this revision does not claim complete cross-device backend integration.
- Subsequent mayor-withdrawal change verified: 105 backend tests (516 assertions), 43 frontend tests, build, and changed-file lint passed. Withdraw is available to mayors in My Ledger; initial legacy reconciliation remains required only when their regular profile/block is unconfirmed, rather than whenever a subject is missing.
