import styles from './Dashboard.module.css';
import { blockLabel, shortDate } from './announcementUtils.js';

const Pencil = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
const Trash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>;

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