import { useEffect, useId, useRef, useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { errorMessage } from '../../api/client.js';
import modal from '../../components/Modal.module.css';
import styles from './AdminDashboard.module.css';

export default function BlockMembersDialog({ block, onClose }) {
  const ref = useRef(null);
  const id = useId();
  const [search, setSearch] = useState('');
  const query = useApiQuery(`/blocks/${block.id}/members`);
  const members = query.data?.data ?? [];
  const visible = members.filter(member => `${member.name} ${member.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={`${modal.modal} ${styles.membersDialog}`} aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={modal.header}><div><h2 id={`${id}-title`}>{block.name} members</h2>
      <p className={modal.description}>{members.length} member{members.length === 1 ? '' : 's'} · Includes students enrolled in this block’s subjects.</p></div></header>
    <label className={styles.memberSearch} htmlFor={`${id}-search`}>Find a member
      <input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" />
    </label>
    {query.isPending && <p role="status">Loading members…</p>}
    {query.error && <p role="alert">{errorMessage(query.error)} <button type="button" className="btn ghost" onClick={() => query.refetch()}>Retry</button></p>}
    {!query.isPending && !query.error && <div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>Name</th><th>Email</th><th>Membership</th></tr></thead>
      <tbody>{visible.map(member => <tr key={member.id}><td>{member.name}{member.is_mayor && <strong className={styles.mayorBadge}>Mayor</strong>}</td>
        <td>{member.email}</td><td>{Number(member.block_id) === Number(block.id) || member.is_mayor ? 'Primary block' : 'Subject enrollment'}</td></tr>)}</tbody>
    </table>{!visible.length && <p className={styles.empty}>{members.length ? 'No members match your search.' : 'No members in this block yet.'}</p>}</div>}
    <footer className={modal.actions}><button type="button" className="btn ghost" onClick={() => query.refetch()} disabled={query.isFetching}>Refresh</button><button type="button" className="btn" onClick={onClose}>OK</button></footer>
  </dialog>;
}
