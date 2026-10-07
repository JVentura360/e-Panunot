import { useState } from 'react';
import { useBlocks } from '../../context/BlockContext';
import MayorApplications from './MayorApplications.jsx';
import MayorsAndBlocks from './MayorsAndBlocks.jsx';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const { apps, mayors, blocks, approve, reject } = useBlocks();
  const [tab, setTab] = useState('apps');
  const [notice, setNotice] = useState('');

  const handleApprove = (app) => {
    const result = approve(app);
    setNotice(result.ok ? '' : result.message);
  };

  const pendingCount = apps.filter((a) => a.status === 'pending').length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <p className={styles.subtitle}>
        {pendingCount} pending application{pendingCount === 1 ? '' : 's'}. Approving one creates the mayor and block.
      </p>

      <div className={styles.tabs}>
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

      {notice && <div className={styles.notice} role="alert">{notice}</div>}

      {tab === 'apps' ? (
        <MayorApplications apps={apps} onApprove={handleApprove} onReject={reject} />
      ) : (
        <MayorsAndBlocks mayors={mayors} blocks={blocks} />
      )}
    </div>
  );
}