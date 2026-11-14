import styles from './Dashboard.module.css';
import { blockLabel, shortDate } from './announcementUtils.js';
import { Pencil, Trash } from '../../components/icons.jsx';

export default function AnnouncementCard({ announcement, isMayor, onOpen, onEdit, onDelete }) {
  return (
    <article className={`${styles.ann} ${announcement.subject ? styles.annSubject : ''}`} onClick={() => onOpen(announcement)}>
      <div className={styles.annMeta}>
        <span className={announcement.subject ? styles.annTag : `${styles.annTag} ${styles.annTagBlock}`}>
          {announcement.subject ? announcement.subject.code : 'Whole block'}
        </span>
        {announcement.block && <span className={styles.annBlock}>{blockLabel(announcement.block)}</span>}
        {isMayor && (
          <div className={styles.annTools}>
            <button type="button" className={styles.iconBtn} aria-label={`Edit ${announcement.title}`} title="Edit"
              onClick={(e) => { e.stopPropagation(); onEdit(announcement); }}><Pencil /></button>
            <button type="button" className={`${styles.iconBtn} ${styles.iconDanger}`} aria-label={`Delete ${announcement.title}`} title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(announcement); }}><Trash /></button>
          </div>
        )}
      </div>
      <h3><button type="button" className={styles.annTitle}>{announcement.title}</button></h3>
      <p className={styles.annText}>{announcement.description}</p>
      <small className={styles.annBy}>
        {announcement.created_by?.name && `${announcement.created_by.name} · `}{shortDate(announcement.created_at)}
      </small>
    </article>
  );
}