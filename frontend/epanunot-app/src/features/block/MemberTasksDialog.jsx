import { useEffect, useId, useRef } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { errorMessage } from '../../api/client.js';
import modal from '../../components/Modal.module.css';
import styles from './BlockManagement.module.css';

export default function MemberTasksDialog({ blockId, member, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const query = useApiQuery(`/blocks/${blockId}/members/${member.id}/unfinished-tasks`, { staleTime: 0 });
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);

  return <dialog ref={dialogRef} className={modal.modal} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={modal.header}><h2 id={titleId}>{member.name}</h2></header>
    <h3>Unfinished class tasks</h3>
    {query.isPending ? <p role="status">Loading tasks…</p> : query.error ?
      <div role="alert"><p>{errorMessage(query.error)}</p><button className="btn ghost" onClick={() => query.refetch()}>Retry</button></div> :
      query.data?.data?.length ? <ul className={styles.memberTasks}>
        {query.data.data.map(task => <li key={task.id}>
          <strong>{task.title}</strong>
          {task.subject && <span>{task.subject_code} · {task.subject}</span>}
          <span>{task.due_date ? `Due ${new Date(task.due_date).toLocaleString()}` : 'No deadline'}</span>
        </li>)}
      </ul> : <p>No unfinished class tasks.</p>}
    <footer className={modal.actions}><button type="button" className="btn" onClick={onClose}>Close</button></footer>
  </dialog>;
}
