# Local development setup

Use PHP 8.4.1+ (tested with 8.4.27), Composer, Node.js 24/npm, and MySQL/MariaDB. XAMPP can supply MySQL; its PHP 8.2 cannot run this backend.

## Backend setup (Windows PowerShell)

Pull or check out the update branch, then run from the repository root:

```powershell
# Adjust this if PHP 8.4 is installed somewhere else.
$env:Path = "C:\php84;" + $env:Path
php -v
cd backend
composer install

# Only copy this on a fresh setup; keep an existing .env and update its settings.
Copy-Item .env.example .env
php artisan key:generate
```

Enable `curl`, `fileinfo`, `mbstring`, `openssl`, `pdo_mysql`, `pdo_sqlite`, `sqlite3`, and `zip` in the loaded php.ini. If Google login reports cURL error 60, download the trusted CA bundle from https://curl.se/ca/cacert.pem and set `curl.cainfo` and `openssl.cafile` in php.ini to its absolute path. Restart PHP afterward; keep TLS verification enabled.

Start MySQL in XAMPP. Create an empty `epanunot_db` database in phpMyAdmin, with utf8mb4 collation. In backend `.env`, confirm:

```dotenv
APP_ENV=local
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=epanunot_db
DB_USERNAME=root
DB_PASSWORD=
SESSION_DRIVER=file
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000
GOOGLE_CALENDAR_ENABLED=false
```

Use your actual database credentials if they differ. Then:

```powershell
php artisan config:clear
php artisan migrate
php artisan db:seed --class=DevelopmentAccountSeeder
```

The development seeder adds five accounts and a shared test block without resetting the database or overwriting existing users. It reuses an active term, or creates an active development term when none exists. Do not run `migrate:fresh` on an existing database.

For browser notifications while the app is in the background or closed, configure Web Push before starting the backend. From `backend/`, run `php artisan webpush:vapid`, then set a valid `VAPID_SUBJECT` (a production URL or `mailto:` address) in `.env` and run `php artisan config:clear`. Keep the private key secret and stable; never regenerate it after browsers subscribe. Production instances must share the same VAPID key pair. Browser push requires HTTPS in production; localhost is accepted for local testing. Each student/mayor can enable or disable **Settings → Deadline alerts** on each device. If VAPID is not configured, in-app notifications still work, but browser push is unavailable. Restart the backend after changing its environment.

Run the backend HTTP server and Laravel scheduler in separate terminals, both from `backend/`:

```powershell
php artisan serve --host=localhost --port=8000
```

```powershell
php artisan schedule:work
```

`routes/console.php` schedules `tasks:send-reminders` every minute. It sends reminders for unfinished assigned tasks due within the next 24 hours and personal to-dos due today or tomorrow. Assigned-task reminders honor each task's reminder interval; personal-to-do reminders are limited to once per 24 hours. Both stop after three reminders or when the item is completed/overdue. The schedule command prints errors in its terminal; keep it running while testing reminders.

In production, run `php artisan schedule:run` from the platform scheduler once per minute (for example, a cron entry invoking the production PHP binary and `artisan schedule:run`). Run a queue worker separately when `QUEUE_CONNECTION=database` so existing queued integrations such as Google Calendar synchronization are processed: `php artisan queue:work --tries=3`. The deadline reminder notification itself is delivered synchronously by the scheduled command. Configure monitoring/restart policies for both long-running processes; the development-only `schedule:work` should not replace a production scheduler.

## Frontend setup

In another PowerShell terminal, from the repository root:

```powershell
cd frontend\epanunot-app
npm.cmd ci
npm.cmd run dev -- --host localhost --port 5173 --strictPort
```

The frontend `.env` should contain `VITE_API_URL=http://localhost:8000/api`. Open http://localhost:5173 consistently; do not alternate between localhost and 127.0.0.1.

Expand **Local development accounts** and choose Admin, Mayor, Student One, Student Two, or New Student. These are real local database users; old API tokens from a teammate's database are unnecessary. The picker requires a Vite development build and backend APP_ENV=local with loopback requests. It is unavailable in production.

Mayor and the two classmates share the test block. New Student starts without a block. Log out to switch. For simultaneous users use separate browser profiles (ordinary tabs share session cookies; multiple incognito windows can also share one session).

Sample tasks, announcements, events, concerns, blockmates, subjects and join requests have been removed. Previously created records are preserved. Some screens still use browser storage/component state, so this update does not provide server persistence or cross-device synchronization for every feature. The block management screen is not connected to the actual membership API yet.

## Optional Google authentication

Local account testing does not require Google credentials. To test Google sign-in, configure these backend-only values privately:

```dotenv
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
GOOGLE_ALLOWED_DOMAINS=udd.edu.ph,cdd.edu.ph
```

Register that exact callback URI in a Google OAuth Web application client. Sign in through the app button with a verified school Workspace account. New Google users receive the student role; existing roles remain intact. Never commit backend `.env`, tokens, client secrets, or downloaded service-account credentials.

## Verification checklist

1. Log in as each local account and verify its role/profile.
2. Refresh: the session should remain signed in. Log out: it should return to login.
3. Confirm sample records do not appear; create a personal task, then switch classmates and confirm it stays private.
4. Test a mayor-created class task with a classmate in the same browser storage. Completion is per account. Use separate profiles to test authenticated API users, but browser-local task data will not synchronize between profiles.
5. Use New Student to submit an application for an unoccupied block, then Admin to review it. Google Calendar integration is intentionally disabled unless configured separately.
6. Optionally verify allowed Google sign-in and rejection of a personal Gmail account.

Automated authentication checks (backend terminal, PHP 8.4 on PATH):

```powershell
php artisan test --filter="DevelopmentLoginTest|GoogleAuthTest|TaskReminderTest|PushSubscriptionTest"
```

Frontend checks:

```powershell
node --test src/api/client.test.js src/context/taskStorage.test.js src/components/taskListUtils.test.js src/theme.test.js
npm run build
```
