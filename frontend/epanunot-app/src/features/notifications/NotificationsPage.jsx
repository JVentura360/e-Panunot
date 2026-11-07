import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import { useOffline } from '../../offline/useOffline.js';
import { offlineOnly } from '../../offline/runtime.js';
import { canOpenOffline } from '../../offline/policy.js';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import styles from './NotificationsPage.module.css';
import SkeletonList from '../../components/Skeleton.jsx';

const timeFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function groupOf(date) {
    const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : 'Earlier';
}

export default function NotificationsPage({ user }) {
const navigate = useNavigate();
const { online } = useOffline();
const [tab, setTab] = useState('all');
const [error, setError] = useState('');
const [readIds, setReadIds] = useState(() => new Set());

const query = useApiQuery('/notifications', { refetchInterval: online ? 30000 : false });
const all = useMemo(
    () => (query.data?.data ?? []).map((n) => ({ ...n, read: n.read || readIds.has(n.id) })),
    [query.data, readIds]
);
const unreadCount = all.filter((n) => !n.read).length;
const shown = tab === 'unread' ? all.filter((n) => !n.read) : all;

const groups = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Earlier'];
    const map = { Today: [], Yesterday: [], Earlier: [] };
    shown.forEach((n) => map[groupOf(new Date(n.created_at))].push(n));
    return order.filter((g) => map[g].length).map((g) => ({ label: g, items: map[g] }));
}, [shown]);

const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(errorMessage(e)); }
};

const openItem = (item) => run(async () => {
    if (!online) {
    if (!canOpenOffline(item.link, user.role)) { offlineOnly(); return; }
    navigate(item.link);
    return;
    }
    if (!item.read) {
    await api(`/notifications/${item.id}/read`, { method: 'POST' });
    setReadIds((prev) => new Set([...prev, item.id]));
    }
    navigate(item.link);
});

const markAll = () => run(async () => {
    await api('/notifications/read-all', { method: 'POST' });
    setReadIds((prev) => new Set([...prev, ...all.map((n) => n.id)]));
});

return (
    <div className={styles.page}>
        <header className={styles.top}>
            <h1>Notifications</h1>
            {unreadCount > 0 && (
            <button type="button" data-online-only className="btn ghost" onClick={markAll}>Mark all as read</button>
            )}
        </header>

        <div className={styles.tabs} role="group" aria-label="Filter notifications">
            {[['all', 'All'], ['unread', `Unread${unreadCount ? ` (${unreadCount})` : ''}`]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={tab === value}
                className={tab === value ? styles.tabActive : ''} onClick={() => setTab(value)}>{label}</button>
            ))}
        </div>

        {!online && <p className={styles.note}>Saved notifications. Read status stays unchanged offline.</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}

        {query.isPending && !query.data ? (
            <SkeletonList rows={5} label="Loading notifications" />
        ) : query.error && !query.data ? (
            <p role="alert" className={styles.error}>{errorMessage(query.error)}</p>
        ) : groups.length === 0 ? (
            <PlannerEmpty>{tab === 'unread' ? 'No unread notifications.' : 'You’re all caught up.'}</PlannerEmpty>
        ) : (
            groups.map((group) => (
            <section key={group.label} className={styles.group}>
                <h2>{group.label}</h2>
                <ul className={styles.list}>
                {group.items.map((n) => {
                    const date = new Date(n.created_at);
                    return (
                    <li key={n.id}>
                        <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => openItem(n)}>
                        {!n.read && <span className={styles.dot} aria-label="Unread" />}
                        <span className={styles.body}>
                            <span className={styles.title}>{n.title}</span>
                            <span className={styles.message}>{n.message}</span>
                        </span>
                        <span className={styles.time}>
                            {group.label === 'Earlier' ? dateFmt.format(date) : timeFmt.format(date)}
                        </span>
                        </button>
                    </li>
                    );
                })}
                </ul>
            </section>
            ))
        )}
        </div>
    );
}