import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../components/Modal.module.css';

export default function BlockRequiredDialog({ onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby="block-required-title" aria-describedby="block-required-message"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}><h2 id="block-required-title">Join a block first</h2></header>
    <p id="block-required-message" className={styles.description}>Join a block or become a mayor before using Concerns. You can join with your block code or apply as mayor from the dashboard.</p>
    <footer className={styles.actions}>
      <button type="button" className="btn ghost" onClick={onClose}>Got it</button>
      <button type="button" className="btn" onClick={() => { onClose(); navigate('/join-block'); }}>Join a Block</button>
    </footer>
  </dialog>;
}
