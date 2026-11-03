# Offline PWA implementation plan

> Implement the user's confirmed offline scope with test-first changes and one final integrated review. Preserve existing local changes. Do not commit or push unless requested.

## Confirmed scope

- Installable app and cached static shell.
- Per-account last-online identity, mayor-assigned tasks, personal tasks, and notifications remain available after offline restart.
- Offline class completion toggles and personal creation/completion changes persist and upload after reconnect or next online opening.
- Calendar displays cached task dates and offline-created personal tasks. Event editing, class task creation/editing/deletion, concerns, enrollment, and profile edits remain online-only.
- Offline notification viewing does not mark notifications read; online-only destinations/actions show a popup.
- Update checking/activation lives in the account dropdown. Preserve pending work before activating an update.
- Server rechecks identity and permissions before replay. Missing tasks/revoked access are rejected without restoring access. Concurrent server changes win with a user-visible conflict notice.

## Architecture and boundaries

Native IndexedDB stores account snapshots and an outbox; no API-response caching in the service worker. A service worker caches only versioned frontend assets and the app shell. React Query remains the live query cache. Offline snapshots hydrate only the last active account when offline; online startup first verifies server identity. Explicit logout clears the active offline identity and saved snapshots after pending changes synchronize.

### Task 1 — Backend offline replay

- Add integer revisions to task assignments and personal to-dos, nullable per-user personal client UUIDs, and a per-user operation ledger for idempotent retries.
- Expose authenticated POST `/offline-sync` with `{account_id, operations}`. Each operation has UUID `operation_id`, kind `complete_task|create_personal|complete_personal`, task/todo ID as appropriate, boolean `done`, and `expected_revision` for existing records. Creates include stable UUID `client_id`, title, and due_date.
- Return `{data:{results:[{operation_id,status:applied|conflict|rejected,message?,...}],...}}`. Individual failures do not discard other successful operations. Never act on another account's outbox.
- Maintain revisions on normal online writes, expose `completion_revision` on tasks and `revision`/`client_id` on personal to-dos. Repeated operation UUIDs must not duplicate records or repeat effects. Preserve term-first locks and authorization.
- Test replay retries, state conflicts, private ownership, removed membership/deleted tasks, overdue offline personal-task dates, and account mismatches.

### Task 2 — Installable shell/update infrastructure

- Add manifest, app icons, and build-generated versioned service worker. Cache static shell only; bypass API/auth/uploads/external URLs. Avoid registering in Vite development mode.
- Expose a small frontend update module with initialize/subscribe/check/apply interfaces. Waiting-worker activation must be requested from the dropdown, never automatically reload pending work.
- Verify production build assets and worker rules. No new dependencies without need.

### Task 3 — Offline state and UI

- Native IndexedDB adapter with transactional account updates, active-account metadata, durable snapshots/outbox, and graceful handling of unavailable storage.
- Per-account completion intents coalesce; personal creates retain stable client IDs. Overlay pending changes on server snapshots. Preserve original revisions until acknowledged. Never acknowledge a newer queued intent using an older request's result.
- Reconnect verifies `/me`, uploads operations, reports rejected/conflicting work, then refreshes live lists. Retry transport failures; pause on expired sessions. Keep cached data private across account changes.
- Central online-only navigation/action dialog; an offline banner communicates queued work and retry status. Dashboard/task controls support offline permitted actions; calendar renders both task types.
- Notification list stays read-only offline. Add update controls to account dropdown.

### Task 4 — Integrated verification

- Run complete backend/frontend suites, changed-file lint, production build, and whitespace checks.
- Review account isolation, retry/idempotency/conflicts, static-cache boundaries, offline restart, online-only guards, and update activation.
- Verify production worker behavior in a browser where possible. Record any physical-device or installation checks that remain unverified. Apply additive migrations locally without seeds/reset.

## Execution record

- Plan created from the confirmed conversation scope. Background upload while the app is closed is not promised; durable changes synchronize on reconnect while open or the next online opening.
- Implemented production-only static-shell service worker, manifest/icons, dropdown update controls, per-account IndexedDB snapshots/outbox, reconnect replay, pending-sync feedback, offline navigation dialog, cached read-only notifications, and personal tasks in the calendar.
- Backend replay checks current identity/access, records operation UUIDs transactionally, preserves overdue offline-created personal dates, and uses revisions to keep newer server changes. Online completion and personal edits update the same revisions. Replay updates the existing cross-device sync domains.
- Review fixes: resolve task context before starting MySQL transactions to avoid stale authorization snapshots; preserve attempted operations after uncertain uploads; prevent late reloads from restoring logged-out identity; gate writes during logout/update; protect other tabs' pending work with transactional logout tombstones.
- Unattempted completion intents coalesce. If an upload was attempted but confirmation was lost, that task waits for reconnect/confirmation before another edit; this prevents undoing against an uncertain server state.
- Verification: 125 backend tests passed (697 assertions), 78 frontend tests passed; frontend lint, production build, and whitespace checks passed. Local additive migration `2026_11_03_200000_add_offline_sync_state` applied without seeds or resets.
- Browser installation and actual offline reload remain manual checks: in-app browser could not reach the local preview, and Windows Computer Use stopped because it could not confidently determine the browser URL. No browser security setting was changed.

## Manual acceptance check

1. Keep the backend and MySQL running. Stop the frontend development server, then run `npm run build` and `npm run preview -- --port 5173` from `frontend/epanunot-app`. Use the existing configured frontend origin (`http://localhost:5173`). The service worker intentionally does not register under `npm run dev`.
2. Sign in online, load tasks/calendar/notifications, and check the account dropdown for offline setup/update status. Install using the browser's install control if offered.
3. Use browser DevTools offline mode. Reload: cached tasks and identity should return. Complete/uncomplete a class task; create and complete a personal task; confirm its calendar date and pending-sync count. Close/reopen while offline and verify the saved changes remain.
4. Open concerns, ledger, profile, class-task editing, or notification read actions: each must require a connection. Cached notifications must remain unread.
5. Restore connectivity with the app open. Pending changes should sync and disappear from the queue. Verify the resulting task state from another browser/device signed into the same account.
6. Change a task on another device before replay to check the server-conflict notice; remove block access to check rejection rather than restored access. Repeat with a mayor account.
7. Check for updates in the dropdown after serving a new build. Install explicitly and verify pending changes survive the restart. Sign out only after pending work syncs, then sign into a different account and check that no previous private tasks appear.
