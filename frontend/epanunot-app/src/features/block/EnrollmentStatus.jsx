import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api, errorMessage } from '../../api/client.js';
import styles from './JoinBlock.module.css';

export default function EnrollmentStatus({ user }) {
  const query = useApiQuery('/enrollment-profile');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const profile = query.data?.data?.profile;
  const reconcile = query.data?.data?.mayor_needs_reconciliation;
  const confirm = async (path, body) => {
    setBusy(true); setError(''); setNotice('');
    try { await api(path, { method: path === '/enrollment-profile' ? 'PUT' : 'POST', body }); setNotice('Your enrollment classification is confirmed.'); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <section className={styles.result} aria-labelledby="enrollment-status-heading" aria-busy={busy}>
    <h2 id="enrollment-status-heading">Student enrollment</h2>
    {query.isPending ? <p role="status">Loading your enrollment classification…</p> : query.error ? <p role="alert">{errorMessage(query.error)} <button className="btn ghost" onClick={() => query.refetch()}>Retry</button></p>
      : user.role === 'mayor' ? <><p><strong>Mayor - Regular</strong></p>{reconcile && <><p>Confirm your regular enrollment to initialize your ledger before assigning tasks. Existing conflicting enrollments will be preserved and reported.</p><button className="btn" disabled={busy} onClick={() => confirm('/enrollment-profile/reconcile-mayor', {})}>{busy ? 'Confirming…' : 'Confirm regular enrollment'}</button></>}</>
        : profile ? <p><strong>{profile.student_type === 'regular' ? 'Regular student' : 'Irregular student'}</strong></p>
          : <><p className={styles.explanation}>You already belong to a block. Confirm Regular or Irregular to manage your subjects. Your classification stays in effect for this term.</p>{(user.block_id || user.enrollment_count > 0) && <div className={styles.actions}>
            {user.block_id && <button className="btn" disabled={busy} onClick={() => confirm(`/blocks/${user.block_id}/enrollment`, { student_type: 'regular' })}>Confirm regular for {user.block}</button>}
            <button className="btn ghost" disabled={busy} onClick={() => confirm('/enrollment-profile', { student_type: 'irregular' })}>Confirm irregular</button>
          </div>}</>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>;
}
