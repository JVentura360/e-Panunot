
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBlocks } from '../../context/BlockContext';
import MayorApplications from './MayorApplications.jsx';
import MayorsAndBlocks from './MayorsAndBlocks.jsx';
import SchoolYearSettings from './SchoolYearSettings.jsx';
import SubjectLoadSettings from './SubjectLoadSettings.jsx';
import ApplicationSubjectReview from './ApplicationSubjectReview.jsx';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
    const {
        apps,
        mayors,
        blocks,
        approve,
        reject,
        removeMayor,
        load,
        loading,
        error,
    } = useBlocks();

    const { pathname } = useLocation();
    const tab = pathname === '/admin/applications' ? 'apps' : pathname === '/admin/mayors' ? 'list' : 'term';
    const [notice, setNotice] = useState('');
    const [reviewing, setReviewing] = useState(null);





    return (
        <div className={styles.page}>
            {reviewing && <ApplicationSubjectReview application={reviewing} onApprove={approve} onClose={() => setReviewing(null)} />}
            <div className={styles.pageHeading}>
                <h1 className={styles.title}>{tab === 'term' ? 'School Year' : tab === 'apps' ? 'Applications' : 'Mayors'}</h1>
                {tab !== 'term' && <button type="button" className="btn ghost" onClick={() => load(true).catch((error) => setNotice(error.message))}>Refresh</button>}
            </div>


            {notice && (
                <div className={styles.notice} role="alert">
                    {notice}
                </div>
            )}
            {error && <div className={styles.notice} role="alert">{error} <button className="btn ghost" onClick={() => load(true).catch((error) => setNotice(error.message))}>Retry</button></div>}

            {tab === 'term' ? <><SchoolYearSettings onUpdated={load} /><SubjectLoadSettings /></> : loading ? <p role="status">Loading {tab === 'apps' ? 'applications' : 'mayors'}…</p> : tab === 'apps' ? (
                <MayorApplications
                    apps={apps}
                    onApprove={setReviewing}
                    onReject={reject}
                />
            ) : (
                <MayorsAndBlocks
                    mayors={mayors}
                    blocks={blocks}
                    onRemove={removeMayor}
                />
            )}
        </div>
    );
}
