# Admin-managed shared subject loads

## Intent and agreed behavior

Subject loads belong to a school year/semester, program, and year level. Block number does not affect the shared load: `31-ITE-04` and `31-ITE-09` share the Year 3, Semester 1, ITE load in the same school year. Other years, programs, semesters, and school years remain separate.

Applicants may propose the first load when no approved load exists. A proposal is pending application data, not permission to publish or modify subjects. When an approved load already exists, the application displays it read-only. Only an admin can approve, add, remove, or otherwise change a published load.

Approving a mayor application creates or claims the block, appoints its mayor, and assigns the approved load in one transaction. Admin load changes apply to every existing matching block and to future matching blocks. Students continue to enroll immediately in individual subjects, including across different blocks; the one-subject-per-student-per-term rule remains unchanged.

## Approaches and decision

1. Independent block loads with mayor editing: simple to extend from the current implementation, but blocks can diverge and mayors retain authority the user explicitly removed. Not selected.
2. One admin-managed shared load with pending application proposals: the selected approach. It requires shared-load persistence and synchronization, but gives matching blocks consistent subjects and enforces admin-only changes.

## Application flow

- Application details still include program, year level, block number, and motivation. The active term comes from the server.
- After choosing program/year, fetch that active term's approved shared load.
- If a load exists, display its subject codes and complete names read-only. Switching program/year clears any incompatible proposal and fetches the correct load.
- If none exists, provide a repeatable code/name form for proposing the first load. At least one complete subject is required for newly submitted applications in this case.
- Show: “Enter the complete subject name; avoid abbreviations.” Codes and names use the existing normalization rules, including `fundamentals of database systems` → `Fundamentals of Database Systems`.
- Submitting does not create catalog subjects, assign block subjects, or publish a shared load. Store the proposal with its application for admin review.
- A rejected application never publishes its proposed subjects.

## Admin flow

- The application review shows the requested block, proposed or inherited load, and the current published load when one exists.
- Admins can adjust a first proposal before approving it. Approval publishes the reviewed load and assigns it to all matching blocks.
- If another application already established the shared load, later approvals use the current approved load. A stale proposal cannot silently replace it.
- Add subject-load management to the admin's School Year area, preserving the existing top-level navigation. Admin selects program and year level within the current term, reviews codes/names, and saves a complete load.
- Before saving, show the matching blocks affected. Show a clear message when no blocks exist yet: the saved load will be used by future matching blocks.
- Block Management displays subjects read-only with the explanation that the admin manages the shared load. Remove the mayor's Add Subject form.
- Enforce the restriction in backend routes/services, including existing block-subject mutation endpoints. Hiding the form alone is insufficient.

## Data and consistency

- Persist a shared load keyed uniquely by `(term_id, program, year_level)`, with a revision, updater, and timestamps; use the existing subject catalog and block-subject offerings.
- Persist application proposals and the inherited revision separately from published loads. The builder may choose normalized rows or a validated JSON snapshot for proposals.
- Share canonical subject IDs by normalized code. Reuse matching catalog subjects. Reject duplicate codes, incomplete names, and conflicting names for an existing code rather than silently renaming catalog subjects used elsewhere or in history.
- Saving a published load synchronizes all matching blocks atomically. Adds become available for enrollment immediately.
- Reject a removal if that subject has enrolled students in any affected block. Preserve enrollment and historical content; do not automatically withdraw or move students.
- The complete update either succeeds for all matching blocks or changes nothing. Return the reason and affected subject when enrollment prevents removal.
- Protect publication, application approval, and term rollover with consistent transaction locking. Use revision checks so one admin cannot overwrite another admin's newer edit from a stale form.
- Reject publishing or changing an archived term's load. Term rollover creates a separate scope; previous loads and enrollment history remain intact.

## Existing data

- Preserve all existing blocks, subjects, enrollments, and application records. Do not reset or seed demonstration content.
- Do not guess which conflicting existing block load is authoritative. Until an admin publishes a shared load, existing block subjects remain usable and unchanged. Admin can review their existing subjects while establishing the shared load.
- Establishing a shared load uses the same enrollment removal guard as subsequent changes. Existing enrolled subjects cannot disappear as a migration side effect.
- Older pending applications without proposals can still be reviewed; an admin must establish an appropriate shared load before approving them. Do not fabricate an applicant proposal.

## Boundaries

- Keep the existing Laravel/PHP/React/TanStack Query stack; no additional dependency is needed.
- Do not add student enrollment approval, upload/OCR processing, automatic curriculum imports, or cross-program load propagation.
- Catalog renaming across historical terms is outside this change. Load management chooses subjects by code and full name; conflicting existing catalog names are reported for deliberate resolution.
- Keep unrelated local changes, including the existing subject-ledger implementation. Do not commit, push, or deploy as part of implementation.

## Validation

Backend tests must cover proposal-only submission, inherited read-only loads, rejected/forged mayor changes, approval publication, application rejection, shared propagation, cross-program/year/term isolation, stale admin saves, stale application proposals, term rollover, and atomic failure when enrolled subjects would be removed.

Frontend checks must cover proposal rows, required code/name fields, inherited-load states, admin editing and affected-block feedback, read-only mayor subjects, correct query invalidation, and retained student ledger behavior. Run the full backend suite, frontend tests, build, and ESLint for changed files; inspect the application and admin views in the browser.

## Builder decisions

Exact table names, component boundaries, proposal snapshot representation, and endpoint naming are implementation choices. Reuse the existing admin forms and cache conventions. Admin-only subject catalog rename tooling, if later requested, is a separate design.
