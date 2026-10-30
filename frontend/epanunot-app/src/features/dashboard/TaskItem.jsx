import { fmt, daysLeft } from './dateUtils';
import styles from './Dashboard.module.css';

export default function TaskItem({ t, onToggle }) {
  const left = daysLeft(t.due);
  return (
    <li data-sort-id={t.id} className={`${styles.item} ${left <= 1 && !t.done ? styles.urgent : ''} ${t.done ? styles.done : ''}`}>
      {onToggle && (
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => onToggle(t.id)}
          aria-label={`Mark ${t.title} ${t.done ? 'incomplete' : 'complete'}`}
        />
      )}
      <div className={styles.grow}>
        <div className={styles.itemTitle}>{t.title}</div>
        <div className={styles.itemMeta}>{t.personal ? 'Personal' : `Assigned by ${t.by}`}</div>
      </div>
      <span className={styles.tag}>{t.platform || 'StepS'}</span>
      <span className={styles.due}>{t.done ? 'Completed' : left < 0 ? `${Math.abs(left)}d overdue` : left === 0 ? 'Due today' : left === 1 ? 'Tomorrow' : fmt(t.due)}</span>
    </li>
  );
}
