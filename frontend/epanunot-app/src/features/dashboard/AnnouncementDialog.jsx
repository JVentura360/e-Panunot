import { useEffect, useRef } from 'react';
import modal from '../../components/Modal.module.css';
import styles from './Dashboard.module.css';
import { blockLabel, shortDate } from './announcementUtils.js';

export default function AnnouncementDialog({ announcement, onClose }) {
const ref = useRef(null);

useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
    dialog.close();
    document.body.style.overflow = previousOverflow;
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
}, []);

const { subject, block, created_by: author } = announcement;

return (
    <dialog
    ref={ref}
    className={modal.modal}
    aria-labelledby="ann-dialog-title"
    onCancel={(e) => { e.preventDefault(); onClose(); }}
    onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    }}
    >
    <header className={modal.header}>
        <div>
        <p className={modal.eyebrow}>Announcement</p>
        <h2 id="ann-dialog-title">{announcement.title}</h2>
        </div>
    </header>

    <div className={styles.annDialogMeta}>
        <span className={subject ? styles.annTag : `${styles.annTag} ${styles.annTagBlock}`}>
        {subject ? subject.code : 'Whole block'}
        </span>
        {block && <span className={styles.annBlock}>{blockLabel(block)}</span>}
    </div>

    <p className={styles.annDialogBody}>{announcement.description}</p>

    <div className={styles.annDialogFacts}>
        {subject && <span>Subject: {subject.name}</span>}
        {author?.name && <span>Posted by {author.name}</span>}
        <span>{shortDate(announcement.created_at)}</span>
    </div>

    <footer className={modal.actions}>
        <button type="button" className="btn" onClick={onClose}>Close</button>
    </footer>
    </dialog>
);
}