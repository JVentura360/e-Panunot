const paths = {
  tasks: ['/tasks', '/calendar'], personal: ['/personal-todos', '/calendar'], calendar: ['/calendar'],
  concerns: ['/concerns'], announcements: ['/announcements'],
  catalog: ['/subjects', '/subject-loads', '/blocks', '/enrollment-profile'],
  admin: ['/admin', '/mayor-applications', '/blocks'],
};

export function syncPaths(domains) {
  return domains.includes('access') ? null : [...new Set(domains.flatMap((domain) => paths[domain] ?? []))];
}

export function createSyncSession({ accountId, read, refresh, available, accountChanged = () => {} }) {
  let previous = null;
  let busy = false;
  let stopped = false;
  return {
    stop() { stopped = true; },
    async check() {
      if (stopped || busy || !available()) return;
      busy = true;
      try {
        const next = await read();
        if (stopped || !available()) return;
        if (String(next.account_id) !== String(accountId)) {
          stopped = true;
          accountChanged();
          return;
        }
        if (previous) {
          const changed = Object.keys(paths).concat('access').filter((domain) => next[domain] !== previous[domain]);
          if (changed.length) await refresh(changed);
        }
        if (!stopped) previous = next;
      } finally {
        busy = false;
      }
    },
  };
}

export function startClientSync({ accountId, read, refresh, accountChanged,
  available = () => document.visibilityState === 'visible' && navigator.onLine !== false,
  now = Date.now, windowTarget = window, documentTarget = document,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  const session = createSyncSession({ accountId, read, refresh, available, accountChanged });
  let timer;
  let stopped = false;
  let running = false;
  let lastAttempt = -Infinity;
  let delay = 30000;
  const run = async () => {
    if (stopped || running) return;
    clearTimer(timer);
    running = true;
    try {
      if (available()) {
        lastAttempt = now();
        await session.check();
        delay = 30000;
      }
    } catch {
      delay = Math.min(delay * 2, 120000);
    } finally {
      running = false;
      if (!stopped) timer = setTimer(run, delay);
    }
  };
  const wake = () => {
    if (available() && now() - lastAttempt >= 15000) void run();
  };
  windowTarget.addEventListener('focus', wake);
  windowTarget.addEventListener('online', wake);
  documentTarget.addEventListener('visibilitychange', wake);
  void run();
  return () => {
    stopped = true;
    session.stop();
    clearTimer(timer);
    windowTarget.removeEventListener('focus', wake);
    windowTarget.removeEventListener('online', wake);
    documentTarget.removeEventListener('visibilitychange', wake);
  };
}
