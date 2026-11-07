import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import navStyles from '../navigation/Navigation.module.css';
import styles from './NotificationBell.module.css';
import { useOffline } from '../../offline/useOffline.js';
import { offlineOnly } from '../../offline/runtime.js';
import { canOpenOffline } from '../../offline/policy.js';

const dateTime = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function NotificationBell({ user }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const wrapRef = useRef(null);
    const buttonRef = useRef(null);
    const navigate = useNavigate();
    const { online } = useOffline();

    const query = useApiQuery('/notifications', { enabled: user.role !== 'admin', refetchInterval: online ? 30000 : false });
    // Ids marked as read this session; hidden immediately without waiting for a refetch.
    const [readIds, setReadIds] = useState(() => new Set());
    const [panelTop, setPanelTop] = useState(0);
    // Read notifications are removed from the list, so an empty list shows "You're all caught up."
    const items = (query.data?.data ?? []).filter((n) => !n.read && !readIds.has(n.id));
    const unread = items.length;
    const markRead = (ids) => setReadIds((prev) => new Set([...prev, ...ids]));

    useEffect(() => {
        if (!open) return;
        const outside = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        const escape = (e) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('keydown', escape);
        return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', escape);
        };
    }, [open]);

    if (user.role === 'admin') return null;

    const run = async (fn) => {
        setError('');
        try { await fn(); } catch (e) { setError(errorMessage(e)); }
    };

    const openItem = (item) => run(async () => {
        if (!online) {
            if (!canOpenOffline(item.link, user.role)) { offlineOnly(); return; }
            setOpen(false);
            navigate(item.link);
            return;
        }
        if (!item.read) {
            await api(`/notifications/${item.id}/read`, { method: 'POST' });
            markRead([item.id]);
            query.refetch?.();
        }
        setOpen(false);
        navigate(item.link);
    });

    const markAll = () => run(async () => {
        await api('/notifications/read-all', { method: 'POST' });
        markRead(items.map((n) => n.id));
        query.refetch?.();
    });

    const toggle = () => {
        if (window.matchMedia('(max-width: 760px)').matches) {
            navigate('/notifications');
            return;
        }
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) setPanelTop(Math.round(rect.bottom + 8));
        setOpen((v) => !v);
    };

    return (
        <div ref={wrapRef} className={styles.wrap}>
        <button
            ref={buttonRef}
            type="button"
            className={navStyles.iconBtn}
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={open}
            aria-haspopup="true"
            onClick={toggle}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && <span className={navStyles.notifBadge} aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
        </button>

        {open && (
            <div className={styles.panel} style={{ '--panel-top': `${panelTop}px` }}>
            <div className={styles.head}>
                <strong>Notifications</strong>
                {unread > 0 && <button type="button" data-online-only className={styles.link} onClick={markAll}>Mark all as read</button>}
            </div>
            {!online && <p className={styles.empty}>Saved notifications · read status stays unchanged offline.</p>}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {items.length === 0 ? (
                <p className={styles.empty}>You&rsquo;re all caught up.</p>
            ) : (
                <ul className={styles.list}>
                {items.map((n) => (
                    <li key={n.id}>
                    <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => openItem(n)}>
                        <span className={styles.itemTitle}>{n.title}</span>
                        <span className={styles.itemMsg}>{n.message}</span>
                        <span className={styles.itemTime}>{dateTime.format(new Date(n.created_at))}</span>
                    </button>
                    </li>
                ))}
                </ul>
            )}
            <button type="button" className={styles.seeAll} onClick={() => { setOpen(false); navigate('/notifications'); }}>
                See all notifications
            </button>
            </div>
        )}
        </div>
    );
}
