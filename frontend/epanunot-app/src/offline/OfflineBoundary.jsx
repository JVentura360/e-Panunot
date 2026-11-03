import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOffline } from './useOffline.js';
import { canOpenOffline } from './policy.js';
import { dismissOfflineMessage, reconnectOffline } from './runtime.js';
import modal from '../components/Modal.module.css';
import styles from './OfflineBoundary.module.css';

function OnlineNotice({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={modal.modal} aria-labelledby="offline-notice-title" aria-describedby="offline-notice-message"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={modal.header}><h2 id="offline-notice-title">Connect to continue</h2></header>
    <p id="offline-notice-message" className={modal.description}>You are in offline mode. This action requires an internet connection. Your saved tasks, personal tasks, calendar, and notifications are still available.</p>
    <footer className={modal.actions}><button type="button" className="btn" onClick={onClose}>Got it</button></footer>
  </dialog>;
}

export default function OfflineBoundary({ user, children }) {
  const offline = useOffline();
  const { pathname } = useLocation();
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    const show = () => setNotice(true);
    window.addEventListener('offline:notice', show);
    const intercept = event => {
      if (offline.online || !(event.target instanceof Element)) return;
      const marked = event.target.closest('[data-online-only]');
      const anchor = event.target.closest('a[href]');
      let blocked = Boolean(marked);
      if (anchor && !anchor.getAttribute('href')?.startsWith('#')) {
        const url = new URL(anchor.href, window.location.href);
        blocked ||= url.origin !== window.location.origin || !canOpenOffline(url.pathname, user.role);
      }
      if (blocked) { event.preventDefault(); event.stopImmediatePropagation(); show(); }
    };
    document.addEventListener('click', intercept, true);
    document.addEventListener('submit', intercept, true);
    return () => {
      window.removeEventListener('offline:notice', show);
      document.removeEventListener('click', intercept, true);
      document.removeEventListener('submit', intercept, true);
    };
  }, [offline.online, user.role]);
  const blocked = !offline.online && !canOpenOffline(pathname, user.role);
  const showStatus = !offline.online || offline.pending > 0 || offline.syncing || offline.message;
  return <>
    {showStatus && <aside className={styles.status} aria-label="Connection and saved changes">
      <div role="status" aria-live="polite">
        <strong>{offline.syncing ? 'Syncing saved changes…' : offline.online ? 'Saved changes' : 'Offline mode'}</strong>
        <span>{offline.pending ? `${offline.pending} saved change${offline.pending === 1 ? '' : 's'} waiting to sync.` : offline.online ? 'Your saved work is up to date.' : 'Showing your last saved tasks and notifications.'}</span>
        {offline.message && <span>{offline.message}</span>}
      </div>
      <div className={styles.actions}>
        {!offline.syncing && <button type="button" className="btn ghost" onClick={() => void reconnectOffline()}>Retry connection</button>}
        {offline.message && <button type="button" className="btn ghost" onClick={() => void dismissOfflineMessage()}>Dismiss</button>}
      </div>
    </aside>}
    {blocked ? <section className={styles.unavailable}>
      <h1>This page needs a connection</h1>
      <p>Reconnect to open this page. Your cached tasks and calendar remain available offline.</p>
      {['student', 'mayor'].includes(user.role) && <Link className="btn" to="/">View saved tasks</Link>}
    </section> : children}
    {notice && <OnlineNotice onClose={() => setNotice(false)} />}
  </>;
}
