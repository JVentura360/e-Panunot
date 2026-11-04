
import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { toApplication } from '../../context/BlockContext.jsx';
import styles from './Profile.module.css';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import { api, errorMessage } from '../../api/client.js';

const NAME_MAX = 60;

const ROLE_LABELS = {
    student: 'Student',
    mayor: 'Mayor',
    admin: 'Admin',
};

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
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();

        const name = value.trim().replace(/\s+/g, ' ');

        if (!name) {
            setError('Enter your name.');
            return;
        }

        setError('');
        setSaving(true);
        try { await onSave(name); }
        catch (error) { setError(errorMessage(error)); }
        finally { setSaving(false); }
    };

    return (
        <form className={styles.editForm} onSubmit={submit} noValidate>
            <input
                className={styles.input}
                value={value}
                disabled={saving}
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
                <button type="submit" className="btn alt" disabled={saving}>
                    {saving ? 'Saving…' : 'Save name'}
                </button>

                <button
                    type="button"
                    className="btn ghost"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>

            {error && (
                <div className={styles.fieldError} role="alert">
                    {error}
                </div>
            )}
        </form>
    );
}

// Block details for mayors, application status for students.
function RoleSection({ user }) {
    const applications = useApiQuery('/mayor-applications/mine', { enabled: user.role === 'student' && !user.block_id });
    const block = useApiQuery(`/blocks/${user.block_id}`, { enabled: user.role === 'mayor' && Boolean(user.block_id) });
    const mine = (applications.data?.data ?? []).map(toApplication).reverse();
    const memberCount = block.data?.data?.member_count ?? null;
    const details = user.role === 'student' ? applications : block;
    if (user.role === 'student' && user.block_id) return null;
    if ((user.role === 'student' || (user.role === 'mayor' && user.block_id)) && details.isPending) {
        return <section className={styles.section}><p role="status">Loading account details…</p></section>;
    }
    if (details.error && !details.data) {
        return <section className={styles.section}><p role="alert">Couldn’t load account details.</p><button className="btn ghost" onClick={() => details.refetch()}>Retry</button></section>;
    }
    if (user.role === 'mayor') {
        return (
            <section className={styles.section}>
                <h3>Your Block</h3>

                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <strong>{user.block || '-'}</strong>
                        Block
                    </div>

                    <div className={styles.stat}>
                        <strong>{memberCount ?? '-'}</strong>
                        Members
                    </div>
                </div>
            </section>
        );
    }

    if (user.role === 'student') {
        const latest = mine[mine.length - 1];

        return (
            <section className={styles.section}>
                <h3>Mayor application</h3>

                {latest ? (
                    <div className={styles.application}>
                        <div>
                            <strong>{latest.block}</strong>

                            <div className={styles.muted}>
                                {APPLICATION_TEXT[latest.status]}
                            </div>
                        </div>

                        <span
                            className={`${styles.status} ${styles[latest.status]}`}
                        >
                            {latest.status}
                        </span>
                    </div>
                ) : (
                    <PlannerEmpty>
                        Ready to help your block grow? Apply as Mayor from the navigation.
                    </PlannerEmpty>
                )}
            </section>
        );
    }

    return null;
}

// Profile page for every role.
export default function Profile({ user, onUpdateUser }) {
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    const roleLabel = ROLE_LABELS[user.role] || user.role;
    const hasBlock = user.block && user.block !== '-';

    const saveName = async (name) => {
        const response = await api('/me', { method: 'PATCH', body: { name } });
        onUpdateUser({ name: response.data.name });
        setEditing(false);
        setSaved(true);
    };

    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <div>
                    <h1>Profile</h1>
                </div>
            </header>

            <section className={styles.identity}>
                <div className={styles.avatar} aria-hidden="true">
                    {user.name.charAt(0)}
                </div>

                <div>
                    <h2>{user.name}</h2>
                    <div className={styles.muted}>{user.email}</div>

                    <div className={styles.tags}>
                        <span className={styles.tag}>{roleLabel}</span>

                        {hasBlock && (
                            <span className={styles.tag}>{user.block}</span>
                        )}
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h3>Account details</h3>

                <div className={styles.card}>
                    <DetailRow label="Name">
                        {editing ? (
                            <NameEditor
                                initial={user.name}
                                onSave={saveName}
                                onCancel={() => setEditing(false)}
                            />
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

                    <DetailRow
                        label="School email"
                        hint="Managed by your Google account"
                    >
                        <span>{user.email}</span>
                    </DetailRow>

                    <DetailRow label="Role">
                        <span>{roleLabel}</span>
                    </DetailRow>

                    {hasBlock && (
                        <DetailRow label="Block">
                            <span>{user.block}</span>
                        </DetailRow>
                    )}
                </div>

                {saved && (
                    <div className={styles.notice} role="status">
                        Name updated.
                    </div>
                )}
            </section>

            <RoleSection user={user} />
        </div>
    );
}
