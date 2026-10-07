import { useState } from 'react';
import { useBlocks } from '../../context/BlockContext';
import styles from './ApplyMayorModal.module.css';

// Student applies to become mayor of a NEW block.
// The block name is stored with the application; the admin's approval creates the block.
export default function ApplyMayorModal({ user, onClose }) {
  const { blocks, addApplication } = useBlocks();
  const [block, setBlock] = useState('');
  const [motivation, setMotivation] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = block.trim() && motivation.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (blocks.some((b) => b.name.toLowerCase() === block.trim().toLowerCase())) {
      setError(`${block.trim()} already has a mayor.`);
      return;
    }

    // TODO: POST to /api/mayor-applications
    addApplication({
      name: user.name,
      email: user.email,
      block: block.trim(),
      motivation: motivation.trim(),
    });
    setSubmitted(true);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="apply-title" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <>
            <div className={styles.success}>
              <div className={styles.check}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 id="apply-title">Application submitted</h3>
              <p className={styles.hint}>
                Your admin will review your application and notify you of their decision.
              </p>
            </div>
            <div className={styles.actions}>
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h3 id="apply-title">Apply as Mayor</h3>
            <p className={styles.hint}>Enter the block you want to lead. It is created once the admin approves.</p>

            <input
              type="text"
              placeholder="Block name (e.g. 31-ITE-04)"
              value={block}
              onChange={(e) => { setBlock(e.target.value); setError(''); }}
              aria-label="Block name"
            />

            <textarea
              rows={4}
              placeholder="Why do you want to be mayor?"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              aria-label="Motivation"
            />

            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.actions}>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={handleSubmit} disabled={!canSubmit}>Submit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
