
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
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
        loading,
        error,
    } = useBlocks();

    const { pathname } = useLocation();
    const tab = pathname === '/admin/applications' ? 'apps' : pathname === '/admin/mayors' ? 'list' : 'term';
    const [notice, setNotice] = useState('');



    const handleApprove = async (app) => {
        const result = await approve(app);
        setNotice(result.ok ? '' : result.message);
    };

    const pendingCount = apps.filter(
        (a) => a.status === 'pending'
    ).length;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>{tab === 'term' ? 'School Year' : tab === 'apps' ? 'Applications' : 'Mayors'}</h1>

            <p className={styles.subtitle}>
                {tab === 'term' ? 'Manage the current academic year and enrollment term.' : tab === 'list' ? 'View current mayors and their blocks.' : `${pendingCount} pending application${pendingCount === 1 ? '' : 's'}. Approving one creates the mayor and block.`}
            </p>
            {tab !== 'term' && <button type="button" className="btn ghost" onClick={() => load(true).catch((error) => setNotice(error.message))}>Refresh</button>}


            {notice && (
                <div className={styles.notice} role="alert">
                    {notice}
                </div>
            )}
            {error && <div className={styles.notice} role="alert">{error} <button className="btn ghost" onClick={() => load(true).catch((error) => setNotice(error.message))}>Retry</button></div>}

            {tab === 'term' ? <SchoolYearSettings onUpdated={load} /> : loading ? <p role="status">Loading {tab === 'apps' ? 'applications' : 'mayors'}…</p> : tab === 'apps' ? (
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
