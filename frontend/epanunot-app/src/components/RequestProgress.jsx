import { useSyncExternalStore } from 'react';
import { getPendingRequestCount, subscribeRequests } from '../api/client.js';
import styles from './RequestProgress.module.css';

export default function RequestProgress() {
  const pending = useSyncExternalStore(subscribeRequests, getPendingRequestCount);
  return (
    <div className={styles.progress} data-active={pending > 0} role="status" aria-live="polite">
      <span className={styles.bar} aria-hidden="true" />
      <span className={styles.label}>{pending > 0 ? 'Loading…' : ''}</span>
    </div>
  );
}
