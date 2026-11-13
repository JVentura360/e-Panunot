# Production deployment

Use a separate production database. Keep the existing local database for development; do not copy demo users or sample records to production.

## Database setup

Laravel migrations in `backend/database/migrations` are the schema authority. The old standalone SQL files were retired because they duplicate and can drift from migrations. Do not import a schema snapshot and then rerun the same migrations.

A generated reference is available at [database-schema.sql](database-schema.sql). It contains no application data; migration-history rows are included to keep future Laravel migrations compatible. Import it only into an empty selected database. Regenerate it locally from the repository root with `php scripts/export-schema.php`: this requires MySQL CREATE/DROP DATABASE permission, migrates and round-trip verifies a randomly named scratch database, and removes that scratch database afterward. It does not change the working database. Prefer migrations over importing the reference for a normal deployment.

`DatabaseSeeder` creates the small development account set only under `APP_ENV=local`. In production it creates no records. Every sample-data seeder is also local-only, even when invoked directly. The optional random sample dataset is available locally with `php artisan db:seed --class=DemoDataSeeder`; it is intended for disposable development databases and is not repeatable.

## Production environment

The example assumes the frontend and backend share one HTTPS origin. Configure the web server to send `/api`, `/auth`, `/logout`, and `/sanctum` to Laravel; serve frontend assets and other application routes from the built frontend. Laravel's web root must be `backend/public`, never the repository root. Keep `.env`, storage, source, and vendor files outside the public web root.

1. Install PHP 8.4+ with the required project extensions, Composer, and the project's supported Node/npm versions.
2. In `backend`, run `composer install --no-dev --prefer-dist --optimize-autoloader`.
3. Copy `.env.production.example` to `.env` only on a new production setup. Replace example hosts, database credentials, and OAuth values. Generate `APP_KEY` once with `php artisan key:generate`. Preserve it across deployments.
4. Create the empty production MySQL database and run `php artisan migrate --force`. Do not use `migrate:fresh`, import demo SQL, or run sample-data seeders against production.
5. Generate a VAPID key pair once with `php artisan webpush:vapid`, or securely install the existing production pair. Keep the pair stable across deployments and instances. Each device must enable alerts on the production website address.
6. Register the production Google callback URL on the matching OAuth client. Complete the consent-screen/test-user setup appropriate for the intended users. Google Calendar link exports do not require enabling the optional shared-calendar service-account integration.
7. In `frontend/epanunot-app`, run `npm ci` and build with `VITE_API_URL=/api` and `VITE_LOCAL_ACCOUNTS=false` in the build environment, then `npm run build`. Deploy `dist`. Do not deploy `build:phone`, `preview:phone`, or Dev Tunnel configuration as the production server.
8. Grant the PHP service write access to `backend/storage` and `backend/bootstrap/cache`. Run `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache` after environment setup. Restart workers after every deployment with `php artisan queue:restart`.

For a split frontend/backend deployment, explicitly configure CORS, cookie domains, and Sanctum for those actual HTTPS domains. Do not reuse localhost or tunnel cookie settings.

## First administrator

To use a specific organization Gmail address, configure `GOOGLE_ADMIN_EMAILS=epanunot66@gmail.com` in the server `.env` and clear the configuration cache. Only exact, verified Google addresses in this list bypass the school-domain requirement. Their first sign-in creates an admin account; existing accounts keep their role and can be promoted with the command below. Never add `gmail.com` to the allowed school domains.

Sign in once with the intended real school Google account. From the production backend shell run:

```sh
php artisan app:promote-admin office@udd.edu.ph
```

Replace the email with that account's actual address and confirm the grant. The command refuses missing accounts, development identities, and accounts already participating as students/mayors in blocks. Sign out and sign back in, then use the admin UI to configure the current school year, subject loads, and mayor applications.

## Background processes and verification

Run the platform scheduler every minute with `php /absolute/path/backend/artisan schedule:run`. Run a supervised `php artisan queue:work --tries=3` worker for queued integrations. Configure HTTPS, database and attachment backups, log retention, and monitoring for failed jobs/reminder errors.

Before release, verify Google sign-in, local-login endpoints returning 404, correct role permissions, block approval, irregular-subject isolation, concern image upload/download, offline synchronization, and real phone push delivery. Verify a fresh MySQL migration on the chosen host; the automated test suite uses SQLite and does not replace that check.

These instructions prepare the repository for deployment. Hosting-specific web-server configuration, credentials, MySQL validation, backups, and end-to-end smoke tests remain required on the chosen production host.
