import { useEffect, useRef, useState } from 'react';
import { enablePushNotifications, getPushState } from './push.js';
import { useOffline } from '../offline/useOffline.js';
import styles from '../components/Modal.module.css';

function PromptDialog({ busy, error, onDismiss, onEnable }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    // Let an existing first-run tutorial finish before requesting permission.
    const show = () => {
      if (!document.querySelector('dialog:modal')) dialog.showModal();
    };
    show();
    const timer = setInterval(() => { if (!dialog.open) show(); }, 500);
    return () => { clearInterval(timer); dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby="push-prompt-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss(); }}>
    <header className={styles.header}><h2 id="push-prompt-title" tabIndex={-1} autoFocus>Stay ahead of deadlines</h2></header>
    <p className={styles.description}>Enable notifications on this device to receive task reminders, even when the app is closed.</p>
    <p className={styles.description}>You can change this later in Settings → Deadline alerts.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <footer className={styles.actions}>
      <button type="button" className="btn ghost" disabled={busy} onClick={onDismiss}>Later</button>
      <button type="button" className="btn" disabled={busy} onClick={() => void onEnable()}>{busy ? 'Enabling…' : 'Enable notifications'}</button>
    </footer>
  </dialog>;
}

export default function PushPrompt({ user }) {
  const { online } = useOffline();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = `epanunot:push-prompt:${user.id}`;
  const member = ['student', 'mayor'].includes(user.role);

  useEffect(() => {
    let active = true;
    if (!member || !online) return;
    try {
      if (localStorage.getItem(key)) return;
    } catch { /* The prompt still works when browser storage is unavailable. */ }
    getPushState().then((state) => {
      if (active) setVisible(state.supported && !state.enabled && Notification.permission !== 'denied');
    }).catch(() => {});
    return () => { active = false; };
  }, [key, member, online]);

  const dismiss = () => {
    try { localStorage.setItem(key, 'dismissed'); } catch { /* Dismiss for this session. */ }
    setVisible(false);
  };
  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      await enablePushNotifications();
      dismiss();
    } catch (failure) {
      setError(failure.message || 'Could not enable notifications. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!member || !online || !visible) return null;
  return <PromptDialog busy={busy} error={error} onDismiss={dismiss} onEnable={enable} />;
}
