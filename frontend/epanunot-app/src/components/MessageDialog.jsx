import { useEffect, useId, useRef } from 'react';
import styles from './Modal.module.css';

export default function MessageDialog({ title, message, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}><h2 id={`${id}-title`}>{title}</h2></header>
    <p id={`${id}-message`} className={styles.description}>{message}</p>
    <footer className={styles.actions}><button type="button" className="btn" onClick={onClose}>OK</button></footer>
  </dialog>;
}
