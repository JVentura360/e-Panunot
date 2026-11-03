import { fmt, daysLeft } from './dateUtils';
import styles from './Dashboard.module.css';

export default function TaskItem({ t, onToggle, onEdit, onDelete }) {
  const left = daysLeft(t.due);
  return (
    <li data-sort-id={t.id} className={`${styles.item} ${left <= 1 && !t.done ? styles.urgent : ''} ${t.done ? styles.done : ''}`}>
      {onToggle && (
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => onToggle(t.id)}
          aria-label={`Mark ${t.title}${t.subject ? ` for ${t.subject}` : ''} ${t.done ? 'incomplete' : 'complete'}`}
        />
      )}
      <div className={styles.grow}>
        <div className={styles.itemTitle}>{t.title}</div>
        <div className={styles.itemMeta}>{t.personal ? 'Personal' : `${t.subject ? `${t.subject} · ` : ''}Assigned by ${t.by}`}{t.pendingSync ? ' · Pending sync' : ''}</div>
      </div>
      <span className={styles.tag}>{t.platform || 'StepS'}</span>
      <span className={styles.due}>{t.done ? 'Completed' : left < 0 ? `${Math.abs(left)}d overdue` : left === 0 ? 'Due today' : left === 1 ? 'Tomorrow' : fmt(t.due)}</span>
      {(onEdit || onDelete) && (
        <div className={styles.itemActions}>
          {onEdit && <button data-online-only type="button" className={styles.inlineAction} onClick={() => onEdit(t)} aria-label={`Edit ${t.title}`}>Edit</button>}
          {onDelete && <button data-online-only type="button" className={styles.inlineAction} onClick={() => onDelete(t)} aria-label={`Delete ${t.title}`}>Delete</button>}
        </div>
      )}
    </li>
  );
}
