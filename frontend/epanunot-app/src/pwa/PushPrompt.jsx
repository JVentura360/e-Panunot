import { useEffect, useState } from 'react';
import { enablePushNotifications, getPushState } from './push.js';
import { useOffline } from '../offline/useOffline.js';
import styles from './PushPrompt.module.css';

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
  return (
    <section className={styles.prompt} aria-labelledby="push-prompt-title">
      <div>
        <h2 id="push-prompt-title">Stay ahead of deadlines</h2>
        <p>Enable notifications on this device to receive task reminders, even when the app is closed.</p>
        <p>You can change this later in Settings → Deadline alerts.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className={styles.actions}>
        <button type="button" className="btn ghost" disabled={busy} onClick={dismiss}>Later</button>
        <button type="button" className="btn" disabled={busy} onClick={() => void enable()}>
          {busy ? 'Enabling…' : 'Enable notifications'}
        </button>
      </div>
    </section>
  );
}
