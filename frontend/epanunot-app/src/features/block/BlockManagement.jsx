import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../../api/client.js';
import styles from './BlockManagement.module.css';

// The API sends UTC timestamps like "2026-10-30 11:24:00".
const formatDate = (value) =>
  value ? new Date(`${String(value).replace(' ', 'T')}Z`).toLocaleDateString() : '';

export default function BlockManagement({ user }) {
  const blockId = user.block_id;

  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!blockId) {
      return;
    }

    try {
      const [memberList, requestList, subjectList] = await Promise.all([
        api(`/blocks/${blockId}/members`),
        api(`/blocks/${blockId}/join-requests`, { query: { status: 'pending', per_page: 100 } }),
        api('/subjects', { query: { block_id: blockId } }),
      ]);
      setMembers(memberList.data);
      setRequests(requestList.data);
      setSubjects(subjectList.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates follow the asynchronous API requests.
    load();
  }, [load]);

  useEffect(() => {
    // New join requests may arrive while the mayor is on another tab.
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  const review = async (request, action) => {
    setBusyId(`request-${request.id}`);
    setError('');
    try {
      await api(`/blocks/${blockId}/join-requests/${request.id}/${action}`, { method: 'POST' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      await load();
      setBusyId(null);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from your block?`)) return;

    setBusyId(`member-${member.id}`);
    setError('');
    try {
      await api(`/blocks/${blockId}/members/${member.id}`, { method: 'DELETE' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      await load();
      setBusyId(null);
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!blockId) {
    return (
      <div className={styles.page}>
        <header className={styles.top}>
          <div>
            <h1>Block Management</h1>
            <p>You are not assigned to a block yet.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <h1>Block Management ({user.block})</h1>
          <p>Manage your blockmates, join requests, and subjects.</p>
        </div>
      </header>

      {error && <div className={styles.alert} role="alert">{error}</div>}

      <section className={styles.cards}>
        <button className={styles.card} onClick={() => scrollTo('blockmates')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{loading ? '-' : members.length}</strong>
            <span>Blockmates</span>
          </div>
        </button>

        <button className={styles.card} onClick={() => scrollTo('applications')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4,8 L14,8 C15.1045695,8 16,8.8954305 16,10 L16,20 C16,21.1045695 15.1045695,22 14,22 L4,22 C2.8954305,22 2,21.1045695 2,20 L2,10 C2,8.8954305 2.8954305,8 4,8 Z M4,10 L4,20 L14,20 L14,10 L4,10 Z M17,19 L17,8 C17,7.44771525 16.5522847,7 16,7 L5,7 C5,5.8954305 5.8954305,5 7,5 L17,5 C18.1045695,5 19,5.8954305 19,7 L19,17 C19,18.1045695 18.1045695,19 17,19 Z M20,16 L20,5 C20,4.44771525 19.5522847,4 19,4 L8,4 C8,2.8954305 8.8954305,2 10,2 L20,2 C21.1045695,2 22,2.8954305 22,4 L22,14 C22,15.1045695 21.1045695,16 20,16 Z" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{loading ? '-' : requests.length}</strong>
            <span>Join requests</span>
          </div>
        </button>

        <button className={styles.card} onClick={() => scrollTo('subjects')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 10.4V20M12 10.4C12 8.15979 12 7.03969 11.564 6.18404C11.1805 5.43139 10.5686 4.81947 9.81596 4.43597C8.96031 4 7.84021 4 5.6 4H4.6C4.03995 4 3.75992 4 3.54601 4.10899C3.35785 4.20487 3.20487 4.35785 3.10899 4.54601C3 4.75992 3 5.03995 3 5.6V16.4C3 16.9601 3 17.2401 3.10899 17.454C3.20487 17.6422 3.35785 17.7951 3.54601 17.891C3.75992 18 4.03995 18 4.6 18H7.54668C8.08687 18 8.35696 18 8.61814 18.0466C8.84995 18.0879 9.0761 18.1563 9.29191 18.2506C9.53504 18.3567 9.75977 18.5065 10.2092 18.8062L12 20M12 10.4C12 8.15979 12 7.03969 12.436 6.18404C12.8195 5.43139 13.4314 4.81947 14.184 4.43597C15.0397 4 16.1598 4 18.4 4H19.4C19.9601 4 20.2401 4 20.454 4.10899C20.6422 4.20487 20.7951 4.35785 20.891 4.54601C21 4.75992 21 5.03995 21 5.6V16.4C21 16.9601 21 17.2401 20.891 17.454C20.7951 17.6422 20.6422 17.7951 20.454 17.891C20.2401 18 19.9601 18 19.4 18H16.4533C15.9131 18 15.643 18 15.3819 18.0466C15.15 18.0879 14.9239 18.1563 14.7081 18.2506C14.465 18.3567 14.2402 18.5065 13.7908 18.8062L12 20" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{loading ? '-' : subjects.length}</strong>
            <span>Subjects</span>
          </div>
        </button>
      </section>

      <section className={styles.section} id="blockmates">
        <h3>Blockmates</h3>
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : (
          <div className={styles.list}>
            {members.map((m) => (
              <div className={styles.item} key={m.id}>
                <div className={styles.grow}>
                  <div className={styles.name}>
                    {m.name}
                    {m.is_mayor && <span className={styles.badge}>Mayor</span>}
                  </div>
                  <div className={styles.meta}>{m.email}</div>
                </div>
                {!m.is_mayor && (
                  <button
                    className={styles.rejectBtn}
                    disabled={busyId === `member-${m.id}`}
                    onClick={() => removeMember(m)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} id="applications">
        <h3>Join requests</h3>
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : requests.length === 0 ? (
          <div className="empty">No pending join requests.</div>
        ) : (
          <div className={styles.list}>
            {requests.map((r) => (
              <div className={styles.item} key={r.id}>
                <div className={styles.grow}>
                  <div className={styles.name}>{r.student_name}</div>
                  <div className={styles.meta}>
                    {r.student_email} · Requested {formatDate(r.created_at)}
                  </div>
                </div>
                <button
                  className={styles.rejectBtn}
                  disabled={busyId === `request-${r.id}`}
                  onClick={() => review(r, 'reject')}
                >
                  Reject
                </button>
                <button
                  className={styles.acceptBtn}
                  disabled={busyId === `request-${r.id}`}
                  onClick={() => review(r, 'approve')}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} id="subjects">
        <h3>Subjects</h3>
        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : subjects.length === 0 ? (
          <div className="empty">No subjects have been assigned to this block yet.</div>
        ) : (
          <div className={styles.list}>
            {subjects.map((s) => (
              <div className={styles.item} key={s.id}>
                <div className={styles.grow}>
                  <div className={styles.name}>{s.name}</div>
                  <div className={styles.meta}>{s.code}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
