import { useState } from 'react';
import { useBlocks } from '../../context/BlockContext.jsx';
import styles from './Profile.module.css';

const NAME_MAX = 60;

const ROLE_LABELS = { student: 'Student', mayor: 'Mayor', admin: 'Admin' };

const APPLICATION_TEXT = {
  pending: 'Waiting for admin review.',
  approved: 'Approved. You are the mayor of this block.',
  rejected: 'Not approved.',
};

// One label/value line inside the account card.
function DetailRow({ label, hint, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <div className={styles.rowValue}>{children}</div>
    </div>
  );
}

// Inline editor for the display name.
function NameEditor({ initial, onSave, onCancel }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name) {
      setError('Enter your name.');
      return;
    }
    onSave(name);
  };

  return (
    <form className={styles.editForm} onSubmit={submit} noValidate>
      <input
        className={styles.input}
        value={value}
        maxLength={NAME_MAX}
        autoFocus
        aria-label="Name"
        aria-invalid={Boolean(error)}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
      />
      <div className={styles.editActions}>
        <button type="submit" className="btn alt">Save name</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
      {error && <div className={styles.fieldError} role="alert">{error}</div>}
    </form>
  );
}

// Block details for mayors, application status for students.
function RoleSection({ user }) {
  const { blocks, apps } = useBlocks();

  if (user.role === 'mayor') {
    const block = blocks.find((b) => b.name === user.block);
    return (
      <section className={styles.section}>
        <h3>Your block</h3>
        <div className={styles.stats}>
          <div className={styles.stat}><strong>{user.block || '-'}</strong>block</div>
          <div className={styles.stat}><strong>{block ? block.members : '-'}</strong>members</div>
        </div>
      </section>
    );
  }

  if (user.role === 'student') {
    const mine = apps.filter((a) => a.email.toLowerCase() === user.email.toLowerCase());
    const latest = mine[mine.length - 1];
    return (
      <section className={styles.section}>
        <h3>Mayor application</h3>
        {latest ? (
          <div className={styles.application}>
            <div>
              <strong>{latest.block}</strong>
              <div className={styles.muted}>{APPLICATION_TEXT[latest.status]}</div>
            </div>
            <span className={`${styles.status} ${styles[latest.status]}`}>{latest.status}</span>
          </div>
        ) : (
          <div className="empty">You have not applied to be a mayor.</div>
        )}
      </section>
    );
  }

  return null;
}

// Profile page for every role. `user` and `onUpdateUser` come from App,
// the same way Dashboard receives `user`.
export default function Profile({ user, onUpdateUser }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const hasBlock = user.block && user.block !== '-';

  const saveName = (name) => {
    // TODO: PATCH the new name to the Laravel API before updating local state.
    onUpdateUser({ name });
    setEditing(false);
    setSaved(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <h1>Your profile</h1>
          <p>Your account details in e-Panunot.</p>
        </div>
      </header>

      <section className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">{user.name.charAt(0)}</div>
        <div>
          <h2>{user.name}</h2>
          <div className={styles.muted}>{user.email}</div>
          <div className={styles.tags}>
            <span className={styles.tag}>{roleLabel}</span>
            {hasBlock && <span className={styles.tag}>{user.block}</span>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3>Account details</h3>
        <div className={styles.card}>
          <DetailRow label="Name">
            {editing ? (
              <NameEditor initial={user.name} onSave={saveName} onCancel={() => setEditing(false)} />
            ) : (
              <>
                <span>{user.name}</span>
                <button
                  className={styles.link}
                  onClick={() => {
                    setSaved(false);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              </>
            )}
          </DetailRow>
          <DetailRow label="School email" hint="Managed by your Google account">
            <span>{user.email}</span>
          </DetailRow>
          <DetailRow label="Role"><span>{roleLabel}</span></DetailRow>
          {hasBlock && <DetailRow label="Block"><span>{user.block}</span></DetailRow>}
        </div>
        {saved && <div className={styles.notice} role="status">Name updated.</div>}
      </section>

      <RoleSection user={user} />
    </div>
  );
}