
import { useState, useEffect } from 'react';
import { useBlocks } from '../../context/BlockContext';
import MayorApplications from './MayorApplications.jsx';
import MayorsAndBlocks from './MayorsAndBlocks.jsx';
import SchoolYearSettings from './SchoolYearSettings.jsx';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
    const {
        apps,
        mayors,
        blocks,
        approve,
        reject,
        load,
    } = useBlocks();

    const [tab, setTab] = useState('apps');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        // Member counts change while the admin is on another tab, so reload on return.
        window.addEventListener('focus', load);

        return () => window.removeEventListener('focus', load);
    }, [load]);

    const handleApprove = async (app) => {
        const result = await approve(app);
        setNotice(result.ok ? '' : result.message);
    };

    const pendingCount = apps.filter(
        (a) => a.status === 'pending'
    ).length;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Admin Dashboard</h1>

            <p className={styles.subtitle}>
                {pendingCount} pending application
                {pendingCount === 1 ? '' : 's'}.
                Approving one creates the mayor and block.
            </p>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'term' ? styles.tabActive : ''}`} onClick={() => setTab('term')}>School Year</button>
                <button
                    className={`${styles.tab} ${tab === 'apps' ? styles.tabActive : ''}`}
                    onClick={() => setTab('apps')}
                >
                    Mayor Applications
                </button>

                <button
                    className={`${styles.tab} ${tab === 'list' ? styles.tabActive : ''}`}
                    onClick={() => setTab('list')}
                >
                    Mayors &amp; Blocks
                </button>
            </div>

            {notice && (
                <div className={styles.notice} role="alert">
                    {notice}
                </div>
            )}

            {tab === 'term' ? <SchoolYearSettings onUpdated={load} /> : tab === 'apps' ? (
                <MayorApplications
                    apps={apps}
                    onApprove={handleApprove}
                    onReject={reject}
                />
            ) : (
                <MayorsAndBlocks
                    mayors={mayors}
                    blocks={blocks}
                />
            )}
        </div>
    );
}
