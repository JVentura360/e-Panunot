import { useCallback, useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api, errorMessage } from '../../api/client.js';
import styles from './JoinBlock.module.css';

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Not approved',
};

// The API sends UTC timestamps like "2026-10-30 11:24:00".
const formatDate = (value) =>
  value ? new Date(`${String(value).replace(' ', 'T')}Z`).toLocaleDateString() : '';

export default function JoinBlock({ user }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null); // the block found by the search
  const requestsQuery = useApiQuery('/join-requests/mine', { enabled: !user.block_id });
  const mine = requestsQuery.data?.data ?? [];
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');


  const lookup = useCallback(async (value) => {
    const response = await api('/blocks/lookup', { query: { code: value } });
    setResult(response.data);
  }, []);



  const handleSearch = async (event) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return;

    setSearching(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      await lookup(value);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/blocks/${result.id}/join-requests`, { method: 'POST' });
      setNotice('Request sent. You will be added once the mayor approves it.');
      await lookup(result.code);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (requestId) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/join-requests/${requestId}`, { method: 'DELETE' });
      setNotice('Request cancelled.');
      if (result) await lookup(result.code);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (user.block_id) {
    return (
      <div className={styles.page}>
        <header className={styles.top}>
          <h1>Join a block</h1>
          <p>
            You are already a member of block <strong>{user.block}</strong>.
          </p>
        </header>
      </div>
    );
  }

  const myPending = result?.my_request?.status === 'pending' ? result.my_request : null;
  const pendingElsewhere = result
    ? mine.find((r) => r.status === 'pending' && r.block_id !== result.id)
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <h1>Join a block</h1>
        <p>Enter your block code (for example 31-ITE-04) and send a request. Your mayor decides.</p>
      </header>

      <form className={styles.search} onSubmit={handleSearch}>
        <label className={styles.srOnly} htmlFor="block-code">Block code</label>
        <input
          id="block-code"
          className={styles.input}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          placeholder="31-ITE-04"
          maxLength={30}
          autoComplete="off"
        />
        <button className="btn" type="submit" disabled={searching || !code.trim()}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div aria-live="polite">
        {error && <div className={styles.error} role="alert">{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}
      </div>

      {result && (
        <section className={styles.result} aria-label="Search result">
          <div className={styles.resultHead}>
            <div>
              <div className={styles.code}>{result.code}</div>
              <div className={styles.meta}>
                Mayor: {result.mayor_name ?? 'Not assigned'} · {result.member_count}{' '}
                {result.member_count === 1 ? 'member' : 'members'} · {result.school_year}
              </div>
            </div>
            {myPending && <span className={`${styles.pill} ${styles.pending}`}>Pending</span>}
          </div>

          <div className={styles.actions}>
            {result.already_member ? (
              <p className={styles.hint}>You are already in this block.</p>
            ) : myPending ? (
              <button className="btn ghost" onClick={() => handleCancel(myPending.id)} disabled={busy}>
                Cancel request
              </button>
            ) : (
              <>
                <button className="btn" onClick={handleJoin} disabled={busy || Boolean(pendingElsewhere)}>
                  {busy ? 'Sending...' : 'Join block'}
                </button>
                {pendingElsewhere && (
                  <p className={styles.hint}>
                    You already have a pending request for {pendingElsewhere.block_code}. Cancel it first.
                  </p>
                )}
                {result.my_request?.status === 'rejected' && (
                  <p className={styles.hint}>Your last request was not approved. You can ask again.</p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2>My requests</h2>
        <button type="button" className="btn ghost" disabled={requestsQuery.isFetching} onClick={() => requestsQuery.refetch()}>Refresh</button>
        {requestsQuery.isPending ? <p role="status">Loading requests…</p> : requestsQuery.error && !requestsQuery.data ? <div role="alert">Couldn’t load your requests. <button className="btn ghost" onClick={() => requestsQuery.refetch()}>Retry</button></div> : mine.length === 0 ? (
          <p className={styles.muted}>You have not requested to join a block yet.</p>
        ) : (
          <ul className={styles.list}>
            {mine.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.grow}>
                  <div className={styles.name}>{r.block_code}</div>
                  <div className={styles.meta}>
                    Mayor: {r.mayor_name ?? '-'} · Requested {formatDate(r.created_at)}
                  </div>
                </div>
                <span className={`${styles.pill} ${styles[r.status] ?? ''}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                {r.status === 'pending' && (
                  <button className="btn ghost" onClick={() => handleCancel(r.id)} disabled={busy}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
