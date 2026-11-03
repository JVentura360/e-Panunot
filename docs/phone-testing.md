# Phone testing with one Dev Tunnel

Use this process whenever you create a new tunnel URL. It uses your existing local accounts and MySQL data. No seeding, migrations, or database reset are needed just to change tunnels.

**The rule:** the tunnel URL, backend `-TunnelUrl`, frontend `PHONE_TUNNEL_HOST`, and address opened on your phone must all match.

```text
Phone -> HTTPS Dev Tunnel -> frontend preview :5173 -> local backend :8000 -> MySQL
```

## 1. Stop the previous setup

Before changing the URL:

1. Sync any pending offline changes while the old URL still works.
2. Press **Ctrl+C** in the old frontend, backend, and tunnel terminals.
3. Stop any ordinary `npm run dev` or `php artisan serve` server for this project too.
4. Keep **XAMPP MySQL running**.

Check that ports 5173 and 8000 are free:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,8000 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

No output means those ports are free. If a process remains, use the troubleshooting section before continuing. An IPv6 listener (`::1`) and IPv4 listener (`127.0.0.1`) can otherwise serve different apps on the same numbered port.

## 2. Terminal 1: create the tunnel

Sign in if necessary:

```powershell
devtunnel user login
```

Choose **one** command:

Private tunnel (sign in on the phone with the tunnel owner's account):

```powershell
devtunnel host -p 5173
```

Public tunnel (your anonymous testing setup):

```powershell
devtunnel host -p 5173 --allow-anonymous
```

**Public means anyone with the URL can use the passwordless local-account picker, including admin.** Keep it open only for your test and stop it when finished.

Copy the generated HTTPS URL whose hostname contains `-5173` and ends in `.devtunnels.ms`. Choose the version **without a separate `:5173` port**. For example:

```text
https://YOUR-TUNNEL-5173.asse.devtunnels.ms/
```

Leave Terminal 1 running. No separate tunnel for port 8000 or MySQL is needed.

## 3. Terminal 2: start the backend for this URL

```powershell
cd "$HOME\Documents\3rd_Year\System Integtration and Architecture\e-Panunot"

.\scripts\phone-backend.ps1 -TunnelUrl "https://YOUR-TUNNEL-5173.asse.devtunnels.ms/"
```

Replace the example with the URL from Terminal 1.

Expected output includes:

```text
Phone backend: http://127.0.0.1:8000
PHP Development Server ... started
```

Leave Terminal 2 running. **Do not also run `php artisan serve`.**

The helper applies temporary session/Sanctum settings to the PHP process and uses Laravel's request router directly. It does not edit `.env`. This avoids the environment filtering we encountered with Artisan's server launcher. It also refuses to start if another server already owns port 8000.

If PHP is installed elsewhere:

```powershell
.\scripts\phone-backend.ps1 -TunnelUrl "https://YOUR-TUNNEL-5173.asse.devtunnels.ms/" -PhpPath "C:\path\to\php.exe"
```

## 4. Terminal 3: build and start the phone frontend

```powershell
cd "$HOME\Documents\3rd_Year\System Integtration and Architecture\e-Panunot\frontend\epanunot-app"

Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
Remove-Item Env:VITE_LOCAL_ACCOUNTS -ErrorAction SilentlyContinue

$env:PHONE_TUNNEL_HOST = "https://YOUR-TUNNEL-5173.asse.devtunnels.ms/"

npm run build:phone
npm run preview:phone
```

Use the **same URL** as Terminal 2. Expected preview address:

```text
http://localhost:5173/
```

Leave Terminal 3 running. Do not start ordinary `npm run dev` alongside it.

The phone build uses `/api` through the proxy and enables the existing local-account picker. The production build is needed to test installation and offline caching.

## 5. Open the app on your phone

1. Open the exact HTTPS URL from Terminal 1.
2. For a private tunnel, sign in using the same account that owns the tunnel.
3. Expand **Local development accounts** and select an existing account.
4. Use this picker rather than Google sign-in: Google OAuth has not been configured for each temporary tunnel URL.
5. Check that the dashboard loads before testing installation/offline mode.

The PC must stay awake, MySQL must stay running, and all three terminals must remain open for online requests.

## 6. Test the PWA and offline changes

1. While online, open tasks, calendar, and notifications so their current data is saved.
2. Use your browser's Install app/Add to Home Screen control. Use a normal browser tab for installation; Incognito is only useful for diagnosing cached login pages.
3. Turn on airplane mode and reopen the app.
4. Complete a class task or create a personal task. Check the pending-sync indicator and calendar.
5. Restore connectivity with the app open. Wait for pending changes to finish syncing.

A new tunnel URL is a **different browser origin**: it has separate login cookies, installation, and cached offline work. Sync the old URL's pending work before changing URLs. Do not clear site storage while it contains unsynced work.

## Troubleshooting

### Port 8000 or 5173 is already in use

This means an old server is still running, not that you need another port.

Find the current owner:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,8000 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Inspect a reported PID (replace `12345` with the PID you just found):

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId=12345" |
    Select-Object ProcessId, ParentProcessId, Name, CommandLine
```

If it is this project's PHP or Vite server, stop its original terminal with Ctrl+C. If that terminal is unavailable, stop only that verified process:

```powershell
Stop-Process -Id 12345
```

For an old `artisan serve` setup, also stop its launcher in its original terminal. Inspect the parent process if necessary: a remaining launcher can keep the old setup alive. Check the ports again before starting the phone helper. Never reuse a PID from an earlier test without checking it again.

### "Unauthenticated" after choosing a local account

Check these in order:

1. The phone URL is exactly the URL supplied to both the backend helper and frontend preview.
2. Both old servers were stopped after changing the URL.
3. The backend was started with `phone-backend.ps1`, not a separate `artisan serve` command.
4. No older Laravel launcher/server still owns port 8000.
5. Refresh and choose the local account again. A fresh Incognito tab can rule out stale browser state, but do not clear unsynced offline data.

Changing from private to anonymous access does not update backend session settings automatically. If it creates a new URL, repeat the complete process.

### "Cannot reach the server"

Check that backend port 8000 is running and Terminal 3 uses `preview:phone`. An ordinary development build may still call `localhost:8000` on the phone itself.

### "Blocked host"

Set `PHONE_TUNNEL_HOST` to the current URL and restart `preview:phone`. Updating the variable in a different terminal does not change an already-running preview.

### Local accounts are missing

Rebuild with `npm run build:phone`, then restart `npm run preview:phone`. The backend must remain in its existing local environment. This process does not seed missing accounts.

### HTTP 419 / session expired

Use the HTTPS tunnel URL and restart the backend helper with that same URL. Keep the frontend hostname aligned, then refresh and retry login.

## Finishing the test

1. Wait for pending offline changes to sync.
2. Press Ctrl+C in all three terminals, especially an anonymous tunnel.
3. Leave MySQL running if you still need it for development.

For ordinary desktop development afterward, start your normal backend/frontend commands. Use `npm run build` rather than `build:phone` when producing a normal production build.

## Quick repeat checklist

- [ ] Old frontend, backend, and tunnel stopped; ports 5173/8000 free.
- [ ] MySQL running.
- [ ] New tunnel created; HTTPS URL copied.
- [ ] Backend helper started with the new URL.
- [ ] Frontend `PHONE_TUNNEL_HOST` set to the identical URL.
- [ ] `build:phone` completed and `preview:phone` running.
- [ ] Phone opened the same URL and an existing local account signs in.
- [ ] Pending offline changes synced before stopping/changing URLs.

References: [Microsoft Dev Tunnels quickstart](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started), [tunnel access/security](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/security), [Vite preview proxy](https://vite.dev/config/preview-options).
