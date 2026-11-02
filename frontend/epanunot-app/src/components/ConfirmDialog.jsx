import { useEffect, useRef, useState } from 'react';
import styles from './Modal.module.css';
import { errorMessage } from '../api/client.js';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
    const ref = useRef(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        dialog.showModal();
        return () => dialog.close();
    }, []);

    const confirm = async () => {
        setError('');
        setBusy(true);
        try {
        await onConfirm();          // on success the parent closes this dialog
        } catch (e) {
        setError(errorMessage(e));
        setBusy(false);
        }
    };

    return (
        <dialog
        ref={ref}
        className={styles.modal}
        aria-labelledby="confirm-title"
        onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
        >
        <header className={styles.header}>
            <div><h2 id="confirm-title">{title}</h2></div>
        </header>
        <p className={styles.description}>{message}</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <footer className={styles.actions}>
            <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="button" className="btn" onClick={confirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
            </button>
        </footer>
        </dialog>
    );
}