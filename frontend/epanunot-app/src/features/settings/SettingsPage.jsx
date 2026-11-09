import { useEffect, useState, useSyncExternalStore } from 'react';
import { applyTheme } from '../../theme.js';
import { applyUpdate, checkForUpdate, getUpdateState, subscribeUpdates } from '../../pwa/updates.js';
import { getInstallState, isInstalled, isIos, promptInstall, subscribeInstall } from '../../pwa/install.js';
import { disablePushNotifications, enablePushNotifications, getPushState } from '../../pwa/push.js';
import { finishOfflineUpdate, prepareOfflineUpdate, reconnectOffline } from '../../offline/runtime.js';
import { useOffline } from '../../offline/useOffline.js';
import styles from './SettingsPage.module.css';

const savedFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Row({ title, hint, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <strong>{title}</strong>
        {hint && <span>{hint}</span>}
      </div>
      <div className={styles.rowAction}>{children}</div>
    </div>
  );
}

export default function SettingsPage({ user, onLogout }) {
  const offline = useOffline();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState, getUpdateState);
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  const [busy, setBusy] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [pushState, setPushState] = useState({ supported: false, enabled: false, hint: '' });
  const [pushError, setPushError] = useState('');
  const isMember = ['student', 'mayor'].includes(user.role);

  useEffect(() => {
    let active = true;
    getPushState()
      .then((state) => { if (active) setPushState(state); })
      .catch((error) => { if (active) setPushError(error.message || 'Could not check notification settings.'); });

    return () => { active = false; };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const installUpdate = async () => {
    setBusy(true);
    setUpdateError('');
    try {
      await prepareOfflineUpdate();
      if (!await applyUpdate()) {
        finishOfflineUpdate();
        setBusy(false);
        setUpdateError('No update is ready. Check for updates again.');
      }
    } catch (error) {
      finishOfflineUpdate();
      setBusy(false);
      setUpdateError(error.message || 'Save your changes before installing the update.');
    }
  };

  const syncSummary = offline.syncing
    ? 'Syncing saved changes…'
    : offline.pending
      ? `${offline.pending} saved change${offline.pending === 1 ? '' : 's'} waiting to sync.`
      : 'All changes are synced.';

  const togglePush = async () => {
    setBusy(true);
    setPushError('');
    try {
      const state = pushState.enabled
        ? await disablePushNotifications()
        : await enablePushNotifications();
      setPushState(state);
    } catch (error) {
      setPushError(error.message || 'Could not update notification settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header><h1>Settings</h1></header>

      <section className={styles.card} aria-labelledby="set-appearance">
        <h2 id="set-appearance">Appearance</h2>
        <Row title="Dark theme" hint={theme === 'dark' ? 'On' : 'Off'}>
          <button type="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark theme"
            className={styles.switch} data-on={theme === 'dark'} onClick={toggleTheme} />
        </Row>
      </section>

      <section className={styles.card} aria-labelledby="set-app">
        <h2 id="set-app">App</h2>
        <Row title="Install ePanunot" hint={isInstalled() ? 'Already installed on this device.' : undefined}>
          {isInstalled() ? null : install.canPrompt ? (
            <button type="button" className="btn alt" data-online-only onClick={() => void promptInstall()}>Install</button>
          ) : null}
        </Row>
        {!isInstalled() && !install.canPrompt && (
          <p className={styles.note}>
            {isIos()
              ? 'On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”.'
              : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'}
          </p>
        )}
        {isMember && (
          <Row title="Deadline alerts" hint={pushError || pushState.hint || 'Checking notification support…'}>
            {pushState.supported && (
              <button type="button" role="switch" aria-checked={pushState.enabled} aria-label="Deadline alerts"
                className={styles.switch} data-on={pushState.enabled} disabled={busy || offline.online === false}
                onClick={() => void togglePush()} />
            )}
          </Row>
        )}
        {update.supported && (
          <>
            <Row title="App updates" hint={updateError || update.message || 'Check that you have the latest version.'}>
              {update.ready ? (
                <button type="button" className="btn" disabled={busy} onClick={() => void installUpdate()}>
                  {busy ? 'Installing…' : 'Install and restart'}
                </button>
              ) : (
                <button type="button" className="btn alt" data-online-only disabled={update.checking || busy}
                  onClick={() => { setUpdateError(''); void checkForUpdate(); }}>
                  {update.checking ? 'Checking…' : 'Check for updates'}
                </button>
              )}
            </Row>
          </>
        )}
      </section>

      {isMember && (
        <section className={styles.card} aria-labelledby="set-sync">
          <h2 id="set-sync">Sync</h2>
          <Row title={offline.online ? 'Online' : 'Offline mode'} hint={syncSummary}>
            {!offline.syncing && (
              <button type="button" className="btn ghost" onClick={() => void reconnectOffline()}>Retry</button>
            )}
          </Row>
          {offline.savedAt && <p className={styles.note}>Last saved on this device: {savedFmt.format(new Date(offline.savedAt))}</p>}
          {offline.message && <p className={styles.note}>{offline.message}</p>}
        </section>
      )}

      <section className={styles.card} aria-labelledby="set-account">
        <h2 id="set-account">Account</h2>
        <Row title={user.name} hint={user.email}>
          <button type="button" className={`btn ghost ${styles.danger}`} onClick={onLogout}>Sign out</button>
        </Row>
      </section>
    </div>
  );
}