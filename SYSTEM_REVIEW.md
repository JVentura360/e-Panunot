# e-Panunot system review

## Current feature list — October 31, 2026

Checked against [GitHub main at e0e3455](https://github.com/JVentura360/e-Panunot/commit/e0e34555f021a7d076d545a81cd0abc5ac405609), which matches the local checkout. Status means present in source unless runtime verification is explicitly stated. This section supersedes the October 26 assessment preserved below.

### New features and implementation status

| Feature | Current implementation | Still needed |
| --- | --- | --- |
| Shared dashboard/calendar tasks | Both screens use `TaskContext`; class tasks are grouped by block, personal lists and completion by account; localStorage persistence and cross-tab updates | Connect to task APIs for sharing across users/devices; browser storage is not server persistence |
| Task deadlines and ordering | Date validation rejects past/invalid dates, allows today; unfinished items precede completed items; new tasks lead the list; reusable date picker and task utilities | Verify full browser interaction and server/UI date agreement |
| Themes and UI improvements | Aurora styling, persistent dark/light preference, revised layouts and dropdown behavior | Browser and accessibility review |
| API client and identity restoration | `src/api/client.js` sends bearer tokens, handles validation/network errors and clears expired tokens; App restores `/api/me` and refreshes on window focus | Real Google sign-in and server logout/token revocation; current login accepts a manually supplied token |
| Mayor application submission | ApplyMayorModal posts structured application data to the backend | Verify with real authenticated accounts/database |
| Admin application review | BlockContext loads applications/blocks, posts approve/reject actions and refreshes; backend approval service exists | Runtime authorization, concurrency and complete workflow verification |
| Profile/application details | Profile fetches own applications and block details; `/api/me` derives mayor display role from block ownership | Name editing remains local; add profile update API |
| Block membership and subjects | Backend routes/controllers for block lists, members, join requests, approval/rejection, removal and subject synchronization | Connect BlockManagement UI, which still uses local/demo data |
| Tasks and announcements backend | Controllers, requests, resources, task completion routes and authorization policies exist | Connect dashboard task/announcement operations and verify assignment isolation |
| Concerns backend | Concern creation/listing, conversation routes, status changes and attachment download implementation exist, with policies/resources | Replace localStorage concern UI with API queries, uploads, read tracking and verified status rules |
| Calendar events and personal to-dos backend | Models, migrations, resources and CRUD routes exist; combined calendar endpoint added | Connect Calendar UI; its events remain component state and tasks remain localStorage |
| Google Calendar integration | Service, block calendar endpoint, sync/delete/access jobs and test command exist; task/event/member workflows dispatch jobs | Configure credentials/calendars, run queue workers and verify remote synchronization |
| Notifications foundation | Task reminder, announcement and concern reply notification classes; policies added | Wire delivery and reminder scheduling; notification list/read APIs, UI and push flow remain unfinished; `routes/console.php` only contains inspire |
| Database and test foundation | Domain migrations now cover core tables plus calendar events/personal to-dos; custom factories/seeders and task/deadline/concern/application/factory tests exist | Verify fresh migration/seeding and execute backend suite with a compatible PHP runtime |

Source anchors: `frontend/epanunot-app/src/context/TaskContext.jsx`, `src/components/taskListUtils.js`, `src/theme.js`, `src/api/client.js`, `src/context/BlockContext.jsx`, `src/features/navigation/ApplyMayorModal.jsx`, `src/features/profile/Profile.jsx`; `backend/routes/api.php`, `app/Services/MayorApprovalService.php`, `app/Services/GoogleCalendarService.php`, `app/Jobs/`, `app/Notifications/`, `database/migrations/`, `tests/Feature/`.

### Updated remaining-work list

- [x] Add domain migrations, custom factories/seeders and backend workflow test files (execution still unverified).
- [x] Add backend application, membership, task, announcement, concern, event and personal to-do APIs.
- [x] Connect frontend application submission, admin review and profile/application reads to the API.
- [x] Share dashboard/calendar task state locally, with account-specific completion and deadline validation.
- [x] Add persistent dark/light themes and Google Calendar integration source.
- [ ] Verify compatible PHP, fresh database setup, migrations, seeders, routes and backend tests.
- [ ] Complete Google authentication, school-account validation and server logout/token revocation.
- [ ] Connect membership/subjects, announcements, tasks, concerns and calendar UI to persisted APIs.
- [ ] Persist profile edits and complete attachment/read-state flows.
- [ ] Verify policies and role consistency: the Role enum includes mayor, while `/api/me` derives mayor status from block ownership; do not assume every authorization path agrees.
- [ ] Configure and verify Google Calendar jobs and queue processing.
- [ ] Complete notifications/reminders, scheduling, delivery, read state and push subscriptions.
- [ ] Verify multi-user workflows, browser behavior, accessibility and deployment configuration.

### Verification for this update

- GitHub default-branch head and local commit match at `e0e3455`.
- `node --test src/theme.test.js src/components/taskListUtils.test.js src/context/taskStorage.test.js` in the frontend: **10 passed, 0 failed** on October 31, 2026.
- These tests cover utilities/storage/theme behavior; they do not verify React screens, backend APIs, database operations, OAuth, Google Calendar delivery or notifications.
- Application source was not changed by this feature-list update. Historical build/lint/runtime results below are dated October 26 and are not current verification.

---

## Historical assessment — October 26, 2026

The following assessment records the earlier checkout. Statements such as “no business controllers,” “no domain migrations,” and “only GET /api/user” are superseded by the current list above.

Reviewed: October 26, 2026. This is an assessment of the checked-out source and local verification, not confirmation of a running database or deployed system. Suggested files and endpoints below do not exist unless explicitly marked as current.

## 1. Current architecture and application flow

The project is a React prototype alongside a Laravel backend foundation. They are not connected yet. No frontend HTTP client or API calls were found. The backend defines Eloquent models and database SQL, but no business controllers.

```text
Current:
React pages -> mock data / component state / localStorage
Laravel -> models + SQL schema + GET /api/user (auth:sanctum)

Target:
React -> HTTP JSON requests -> Laravel routes
      -> authentication -> validation -> authorization
      -> controllers/services -> Eloquent -> MySQL
      <- JSON resources <- persisted records
```

Frontend entry: `frontend/epanunot-app/src/main.jsx` wraps the app in BrowserRouter and BlockProvider. `src/App.jsx` keeps the logged-in user in memory and selects pages. `src/layouts/MainLayout.jsx` supplies navigation and the page outlet.

| Route | Current behavior |
| --- | --- |
| `/` | Demo login while logged out; student/mayor dashboard while logged in; admins redirected to `/admin` |
| `/profile` | Identity, local name editing, and application/block details |
| `/calendar` | Month/week/day/agenda views with independently seeded tasks, events, and to-dos |
| `/concerns/*` | Concern lists, detail conversations, replies, and status changes saved in localStorage |
| `/block` | Hardcoded blockmates, subjects, and application handling |
| `/admin` | Application approval/rejection and mayor/block lists using BlockContext |

Intended business flow inferred from the UI and schema:

1. A student authenticates with a permitted school Google account.
2. A student submits a mayor application for a term, program, year, and block number.
3. An administrator approves it. The server creates or selects the appropriate block, sets its mayor, records the review, and rejects competing pending applications if that remains the agreed rule.
4. Students request block membership; the block's mayor reviews requests. Approval updates the student's membership.
5. Mayors publish announcements and assign tasks. Students track their own completion and personal tasks.
6. Students raise concerns. Their block mayor replies and updates status; students can confirm closure or reopen according to the UI rules.
7. The calendar displays shared task deadlines and personal schedule data; reminders notify the relevant students.

Today these flows are demonstrations. Approval does not update a real user's permissions, task creation is not shared between users, and concern storage is local to the browser origin.

## 2. Folder structure and unfinished files

All frontend paths in this table are relative to `frontend/epanunot-app/`.

| File/folder | What exists | Remaining work |
| --- | --- | --- |
| `src/App.jsx` | Routes and in-memory login | Restore session through `/api/user`, handle loading/expiry/logout, restrict `/block` by capability, remove unused ComingSoon and stale comments |
| `src/features/auth/Login.jsx` | Demo accounts and simulated Google button | Real Google authentication; remove demo shortcuts from production |
| `src/context/BlockContext.jsx` | Local application approval and block creation | Load/mutate server data; use database IDs and term-aware uniqueness; replace hardcoded 67 members; refresh user capabilities after approval |
| `src/features/admin/` | Application and mayor/block UI | Admin APIs, persisted reviews, transaction conflicts, loading/error states |
| `src/features/navigation/ApplyMayorModal.jsx` | Local application form | Submit to API; collect structured block fields and term instead of relying on a free-text name |
| `src/features/block/BlockManagement.jsx` | Hardcoded members/subjects/requests | Real membership APIs; Accept and Reject currently both just remove the item; add membership updates and authorized subject management if required |
| `src/features/dashboard/Dashboard.jsx` | Local task and announcement operations | API persistence, assignment-specific completion, shared calendar data; remove or repair the branch referencing an unimported BlockManagement |
| `src/features/dashboard/TaskItem.jsx` | Task row and completion UI | Map API dates/completion; distinguish overdue dates from today |
| `src/features/calendar/Calendar.jsx` | Functional local calendar UI | Server-backed tasks, events, and to-dos; use the same task records as the dashboard; decide whether Google synchronization is required |
| `src/features/concerns/Concerns.jsx` | Concern workflow and filename attachments | Server filtering/authorization, replies/status/read APIs, actual file upload/download; remove demo student fallback; fix undefined `arrow` |
| `src/features/concerns/useSyncedConcerns.js` | localStorage and cross-tab events | Replace with server queries/mutations; cross-tab storage is not synchronization between users/devices |
| `src/features/concerns/concernsData.js` | Demo concerns and subject choices | Fetch subjects for the actual block; remove demo ownership behavior |
| `src/features/profile/Profile.jsx` | Local name update and application status | Persist profile update and fetch real application/membership details |
| `src/features/notifications/placeholder.txt` | Placeholder only | Notification list/read state, real unread count, subscriptions, service worker and push behavior |
| `src/features/posts/placeholder.txt` | Placeholder only | Decide whether this means an announcement feed or a separate feature; no separate posts schema currently exists |
| `src/layouts/MainLayout.jsx` | Shared page shell | Replace hardcoded notification count of 3 |
| `src/data/mockData.js` | Demo identities, tasks, announcements, applications | Keep only as explicit demo/test fixtures once API integration is complete |
| `vite.config.js` | React plugin | Development API proxy or documented cross-origin setup |
| `README.md` | Starter documentation | Project-specific setup and environment instructions |

Backend paths below are relative to `backend/`.

| File/folder | What exists | Remaining work |
| --- | --- | --- |
| `app/Models/` | 12 domain models with relationships/casts | Add authorization-aware behavior where needed; align auth and push traits with the chosen approach; model relationships do not implement workflows |
| `app/Http/Controllers/` | Base Controller only | Authentication, profile, term/block, application, membership, task, announcement, concern, calendar and notification controllers |
| `routes/api.php` | Only authenticated `GET /api/user` | Protected business routes |
| `routes/web.php` | Welcome page | Google redirect/callback and session logout routes |
| `bootstrap/app.php` | Routing and JSON error rendering | Stateful SPA middleware configuration |
| `config/services.php` | Default third-party service entries | Google provider credentials and callback configuration |
| `.env.example` | MySQL name and blank Google/VAPID entries | Remove duplicate SESSION_DRIVER; add clear frontend URL, stateful host, DB host/port and Google callback examples |
| `database/sql/epanunot_db.sql` | 13 application tables | Make schema reproducible through migrations; settle calendar/to-do/membership decisions |
| `database/migrations/` | Cache, jobs, Sanctum tokens, push subscriptions | Domain-table migrations and sessions migration if using database sessions |
| `database/factories/UserFactory.php` | Default Laravel user factory | Remove or support fields absent from SQL: password, email_verified_at and remember_token |
| `database/seeders/DatabaseSeeder.php` | Default Test User | Seed active term, subjects, development identities and blocks with the real schema |
| `routes/console.php` | Default inspire command | Reminder schedule and maintenance commands |
| `tests/` | Default example tests | Feature coverage for real business rules and authorization |
| `resources/` | Laravel starter assets/view | Clarify their purpose alongside the separate React app |
| `README.md` | Laravel starter documentation | Real backend setup, migration/import policy and API documentation |

Missing areas to add as needed: `app/Http/Requests`, `app/Http/Resources`, `app/Policies`, workflow services, reminder jobs/notifications, and a frontend API service/auth context. These are proposed organization choices, not mandatory framework folders.

## 3. Database schema and relationships

Source: `backend/database/sql/epanunot_db.sql`.

| Table | Purpose and relationships |
| --- | --- |
| `terms` | School year, semester, date range, active flag; parent of blocks and mayor applications |
| `blocks` | Belongs to a term; unique term/program/year/block combination; mayor references users |
| `users` | Google identity, email, name, student/admin role, optional current block |
| `subjects` | Shared subject code/name catalog |
| `block_subjects` | Many-to-many block/subject links |
| `block_join_requests` | Student requests, status, reviewer, review timestamp |
| `mayor_applications` | Requested block coordinates and term, optional resulting block, motivation and review |
| `announcements` | Block-scoped announcements with author |
| `tasks` | Optional block for shared tasks, creator, subject, due date, reminder interval and optional Google event ID |
| `task_assignments` | Task/user pair; per-user completion and reminder delivery state |
| `concerns` | Block, student, subject, category, status and separate student/mayor unread flags |
| `conversation_messages` | Concern conversation entries, including system messages |
| `concern_attachments` | Concern file metadata and storage path |

The SQL contains foreign keys, useful indexes, a unique task/user assignment and block/mayor-per-term constraints. Laravel migrations separately define infrastructure tables; the raw SQL is not the full runtime schema.

Important alignment issues:

1. **Mayor capability:** SQL permits only `student` and `admin` in users.role. Mayor status comes from blocks.mayor_id. Prefer deriving `is_mayor` or explicit capabilities from the active-term block and using them in React and server policies. Do not write `mayor` to the current role enum.
2. **No domain migrations:** `php artisan migrate` does not currently execute the raw SQL file. A fresh migration run cannot create the application tables. Convert SQL to ordered migrations, creating the blocks-to-mayor foreign key after users exists. For an existing imported database, baseline it deliberately before introducing create-table migrations.
3. **Sessions:** `.env.example` declares SESSION_DRIVER twice, including database. There is no sessions table in the SQL or checked-in migrations. Choose file sessions initially or create the sessions migration before using database sessions.
4. **Factory mismatch:** the default factory inserts columns absent from the custom users table, so the current seeder is incompatible with that SQL.
5. **Calendar gaps:** no tables exist for calendar events or personal to-dos. Tasks alone do not represent event start/end times. Decide on event/to-do models and migrations, or intentionally reduce the UI scope.
6. **Personal tasks:** nullable tasks.block_id can represent personal tasks, but define ownership explicitly through created_by and an assignment. Completion belongs to task_assignments.completed_at, not a shared task-level done flag.
7. **UI/API mapping:** dashboard `due`, `done`, `body`, `by` differ from due_date, completed_at, description and creator. Concerns use subject names, title-case categories and string demo IDs while SQL expects IDs and lowercase enums. Use a documented JSON contract and remove demo IDs.
8. **Term lifecycle:** users.block_id stores only one membership. It cannot preserve term-by-term enrollment history. Add term-aware memberships if history is required. Also enforce the intended number of active terms and valid date ranges.
9. **Application integrity:** protect against duplicate pending requests and concurrent mayor approval. Uniqueness alone does not implement review behavior. Use transactions, appropriate locking and server authorization; ensure the appointed mayor belongs to the intended block.
10. **Term model:** is_active has a cast but is absent from its Fillable list. Ordinary mass-assignment will not set it; use an intentional privileged update path.
11. **Subjects:** the UI displays subjects per blockmate, but the schema links subjects to blocks only. Add student/subject enrollment only if individual enrollment is part of the requirements.
12. **Google sync:** google_event_id is a starting field, not synchronization. Per-user calendar synchronization would also need a token/consent and per-user event mapping design.

## 4. How to connect the three layers

### A. Backend to MySQL

First use a PHP runtime compatible with the locked dependencies: **PHP 8.4.1 or newer compatible 8.x**. composer.json says ^8.3, but the lock includes Symfony packages requiring >=8.4.1. Align terminal and web-server PHP; XAMPP's current CLI reports 8.2.12.

After fixing the runtime:

1. Run `composer install` in backend to reproduce the lock. Do not bypass platform checks.
2. Create the local backend `.env` from `.env.example` and generate APP_KEY.
3. Start MySQL and configure DB_CONNECTION=mysql, DB_HOST=127.0.0.1, DB_PORT=3306, DB_DATABASE=epanunot_db and local database credentials in backend `.env`.
4. Choose a reproducible schema path. Preferred future path: domain migrations plus infrastructure migrations. Current manual path: import the SQL into a new database and run the existing infrastructure migrations. Do not run the SQL repeatedly against existing tables; CREATE TABLE statements are not idempotent.
5. Resolve session driver/table and factory issues before login or seeding.
6. Verify `php artisan migrate:status`, then test a read and authorized write through the application.

React never connects directly to MySQL. Database credentials remain in the backend environment.

### B. Google authentication and session state

Use the already installed Laravel Socialite package for Google redirect/callback login and Sanctum for the first-party SPA session. Configure a Google OAuth client, its exact callback URL, and the google entry in config/services.php. The callback must validate the verified school identity server-side, upsert the user, establish/regenerate the session, and redirect to the frontend. Keep provider secrets on the server. See [Socialite documentation](https://laravel.com/framework/docs/13.x/socialite).

Enable Sanctum's stateful SPA middleware in bootstrap/app.php. For local development, consistently use localhost for both applications, allow the actual Vite origin, and include its port in SANCTUM_STATEFUL_DOMAINS. Configure credentialed CORS with an explicit origin for direct cross-origin requests. Initialize CSRF via `/sanctum/csrf-cookie`; mutations must send cookies and the X-XSRF-TOKEN header. Native fetch does not automatically copy the XSRF cookie into that header. See [Sanctum SPA authentication](https://laravel.com/framework/docs/13.x/sanctum#spa-authentication).

On React startup, fetch `/api/user` before rendering authenticated routes. A 401 means logged out. Logout must invalidate the backend session and clear the frontend user/cache. Return an API user resource with numeric id, identity, actual block, active term and derived capabilities. Never accept an administrator or mayor identity supplied by the browser.

### C. Frontend to backend API

Add a shared API module, for example `src/services/api.js`, to handle JSON, credentials, CSRF, 401/403/422 responses, network failures and response parsing. Keep server data shared across dashboard/calendar instead of independently seeding both pages.

Two development options:

- Direct calls from localhost:5173 to localhost:8000, with backend CORS and Sanctum configured as above.
- A Vite proxy for `/api`, `/auth` and `/sanctum` pointing to the backend. Account for callback redirects and session cookies consistently. A dev proxy does not configure production hosting. See [Vite server.proxy](https://vite.dev/config/server-options.html#server-proxy).

Proposed endpoint contract; **only GET /api/user currently exists**:

| Feature | Suggested endpoints |
| --- | --- |
| Identity | GET /auth/google/redirect, GET /auth/google/callback, POST /logout, GET /api/user, PATCH /api/profile |
| Reference data | GET /api/terms/active, GET /api/blocks, GET /api/blocks/{block}/subjects |
| Mayor applications | POST /api/mayor-applications, GET /api/mayor-applications/mine; admin list and approval/rejection endpoints |
| Membership | POST /api/blocks/{block}/join-requests; mayor list/review endpoints; GET /api/blocks/{block}/members |
| Announcements | Block-scoped list/create and authorized update/delete |
| Tasks | GET/POST /api/tasks; authorized update/delete; PATCH /api/tasks/{task}/completion for the authenticated assignment |
| Concerns | GET/POST /api/concerns; GET detail; POST messages; PATCH status; PATCH read state; POST/download attachments |
| Calendar | Query task deadlines by date range; add event/to-do endpoints after settling the schema |
| Notifications | List/read/count notifications and register/delete push subscriptions |

Use authenticated route groups, Form Requests, policies and JSON resources. Scope every list/detail/mutation to the authenticated user's block, ownership and capabilities. UI navigation restrictions are not server authorization. Mayor approval and join approval should be transactional. Uploads need real binary storage, validation, metadata and authorized download access.

## 5. Prioritized remaining work

1. **Make the backend runnable:** compatible PHP, environment, MySQL, consistent schema setup, session table/driver, corrected seeders.
2. **Build identity end to end:** Google callback, server school-account checks, Sanctum session, `/api/user`, logout, capabilities and block access policies.
3. **Deliver one complete workflow:** student application -> admin review -> block creation/mayor appointment -> updated permissions after session reload. Test duplicate/concurrent approval and unauthorized access.
4. **Connect block membership and subjects:** real student join UI, mayor review, member counts and term-aware block queries.
5. **Connect announcements and tasks:** persistence, assignments, personal ownership and completion; dashboard/calendar share the same data.
6. **Connect concerns:** identity isolation, status transitions, conversations, read tracking and attachments.
7. **Complete calendar persistence:** decide event/to-do scope, timezone rules and optional Google Calendar synchronization.
8. **Complete notifications/reminders:** subscriptions, service worker, VAPID configuration, scheduled reminder jobs, queue worker, retry/deduplication and notification read state. Push subscription migrations alone do not implement this.
9. **Prepare deployment:** real environment documentation, HTTPS/session settings, production frontend/backend routing, scheduler/queue processes, backup/restore, and workflow tests.

## 6. Verification and limits

- `npm run build`: succeeded; 54 modules transformed. This verifies bundling, not all runtime branches.
- `npm run lint`: failed with four errors: unused ComingSoon (App.jsx:14), unused onBack (BlockManagement.jsx:23), undefined arrow (Concerns.jsx:508), undefined BlockManagement (Dashboard.jsx:50).
- `php artisan route:list`: blocked by Composer's platform check. Installed dependencies require PHP >=8.4.1; active CLI is 8.2.12. Route assessment above comes from source inspection.
- Backend tests, live database schema/data, OAuth, browser interactions and multi-user behavior were not verified.
- No application code, database records or dependency versions were changed during this review.

The next implementation milestone should be a persisted, authorized mayor-application workflow running across React, Laravel and MySQL. It exercises authentication, schema, APIs, permissions and frontend state together.
