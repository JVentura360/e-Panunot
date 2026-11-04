import { useState } from 'react';
import { api, errorMessage } from '../../api/client.js';
import MessageDialog from '../../components/MessageDialog.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import styles from './JoinBlock.module.css';

export default function PendingJoinLedger({ request, onRefresh }) {
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const message = `Please wait for the mayor to approve your request to join ${request.block_code}. Your ledger will be available after approval.`;
  const refresh = async () => {
    setBusy(true); setError('');
    try { await onRefresh(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <div className={styles.page}>
    {noticeOpen && <MessageDialog title="Wait for approval" message={message} onClose={() => setNoticeOpen(false)} />}
    {cancelOpen && <ConfirmDialog title="Cancel this join request?" message={`Cancel your request to ${request.block_code}? You can choose another block or apply as mayor afterward.`}
      confirmLabel="Cancel request" onCancel={() => setCancelOpen(false)} onConfirm={async () => {
        await api(`/join-requests/${request.id}`, { method: 'DELETE' });
        setCancelOpen(false); await onRefresh();
      }} />}
    <header className={styles.top}><h1>My Ledger</h1><p>Waiting for mayor approval</p></header>
    <section className={styles.section} aria-labelledby="pending-block-title">
      <h2 id="pending-block-title">{request.block_code}</h2>
      <p className={styles.notice} role="status">{message}</p>
      <p className={styles.meta}>Status: {request.student_type ?? 'Not selected'} · Mayor: {request.mayor_name ?? 'Not assigned'}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="btn" disabled={busy} onClick={refresh}>{busy ? 'Checking…' : 'Check approval status'}</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => setCancelOpen(true)}>Cancel request</button>
      </div>
    </section>
  </div>;
}
