// src/features/calendar/GoogleCalendarButton.jsx
// "Add to Google Calendar": one button per block the person belongs to.
//
// Google does not put a shared calendar on someone's list by itself. The button
// opens Google's "Add calendar" screen already filled in, so it takes one click
// on "Add" in Google, once per block (not once per subject).
//
// The backend answers GET /blocks/{id}/google-calendar. A block is hidden when
// Google sync is off, when its calendar does not exist yet, or when the person
// is not allowed to see it.
import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import styles from './Calendar.module.css';

const storageKey = (userId, blockId) => `epanunot-gcal-added:${userId}:${blockId}`;
const readAdded = (userId, blockId) => {
  try { return window.localStorage.getItem(storageKey(userId, blockId)) === '1'; } catch { return false; }
};
const saveAdded = (userId, blockId) => {
  try { window.localStorage.setItem(storageKey(userId, blockId), '1'); } catch { /* remembering is optional */ }
};

// Ask Google to use the account the person is logged in with here (their school email),
// not whichever Google account the browser happens to be signed in to first.
// If that account is not signed in on this browser, Google asks them to sign in.
const withAccount = (url, email) => {
  try {
    const link = new URL(url);
    if (email) link.searchParams.set('authuser', email);
    return link.toString();
  } catch {
    return url;
  }
};

function BlockCalendarLink({ userId, email, blockId, name, showName }) {
  const { data } = useApiQuery(`/blocks/${blockId}/google-calendar`, { retry: false });
  const [added, setAdded] = useState(() => readAdded(userId, blockId));
  const info = data?.data;

  if (!info?.enabled || !info.ready || !info.add_url) return null;
  const href = withAccount(info.add_url, email);

  const onOpen = () => {
    saveAdded(userId, blockId);
    setAdded(true);
  };
  const label = showName && name ? `Subscribe to ${name} calendar` : 'Subscribe to block calendar';

  if (added) {
    return (
      <p className={styles.googleAdded}>
        ✓ {showName && name ? `${name} added` : 'Added'} to Google Calendar.{' '}
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen}>Add again</a>
      </p>
    );
  }

  return (
    <a className={`btn ghost ${styles.googleBtn}`} href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
      {label}
    </a>
  );
}

/**
 * user    - the signed-in user (needs id, block_id, block)
 * choices - from useSubjectChoices(user); gives the other blocks an irregular student takes subjects from
 */
export default function GoogleCalendarButtons({ user, choices = [] }) {
  if (user.role === 'admin') return null;

  const blocks = new Map();
  if (user.block_id) blocks.set(user.block_id, user.block || '');
  for (const choice of choices) {
    if (!blocks.has(choice.blockId)) blocks.set(choice.blockId, String(choice.label ?? '').split(' · ').pop());
  }
  if (blocks.size === 0) return null;

  return (
    <div className={styles.googleRow}>
      {[...blocks].map(([blockId, name]) => (
        <BlockCalendarLink key={blockId} userId={user.id} email={user.email} blockId={blockId} name={name} showName={blocks.size > 1} />
      ))}
    </div>
  );
}
