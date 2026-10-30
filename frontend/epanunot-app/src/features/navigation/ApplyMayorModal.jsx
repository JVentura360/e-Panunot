
import { useState } from 'react';
import { api, errorMessage } from '../../api/client.js';
import styles from './ApplyMayorModal.module.css';

const PROGRAMS = ['ITE']; // Add other programs when available.

export default function ApplyMayorModal({ onClose }) {
    const [form, setForm] = useState({
        year_level: '1',
        program: PROGRAMS[0],
        block_number: '',
        motivation: '',
    });

    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);

    const setField = (key) => (e) => {
        setForm((f) => ({
            ...f,
            [key]: e.target.value,
        }));
        setError('');
    };

    const canSubmit =
        form.block_number &&
        form.motivation.trim() &&
        Number(form.block_number) >= 1 &&
        Number(form.block_number) <= 99 &&
        Number.isInteger(Number(form.block_number)) &&
        !busy;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setBusy(true);

        try {
            await api('/mayor-applications', {
                method: 'POST',
                body: {
                    program: form.program,
                    year_level: Number(form.year_level),
                    block_number: Number(form.block_number),
                    motivation: form.motivation.trim(),
                },
            });

            setSubmitted(true);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="apply-title"
                onClick={(e) => e.stopPropagation()}
            >
                {submitted ? (
                    <>
                        <div className={styles.success}>
                            <div className={styles.check}>
                                <svg
                                    width="26"
                                    height="26"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>

                            <h3 id="apply-title">Application submitted</h3>

                            <p className={styles.hint}>
                                Your admin will review your application and
                                notify you of their decision.
                            </p>
                        </div>

                        <div className={styles.actions}>
                            <button className="btn" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 id="apply-title">Apply as Mayor</h3>

                        <p className={styles.hint}>
                            Enter your program, year level, and block number.
                            Your block will be created once the admin approves
                            your application.
                        </p>

                        {/* Program */}
                        <select
                            value={form.program}
                            onChange={setField('program')}
                            aria-label="Program"
                        >
                            {PROGRAMS.map((program) => (
                                <option key={program} value={program}>
                                    {program}
                                </option>
                            ))}
                        </select>

                        {/* Year Level */}
                        <select
                            value={form.year_level}
                            onChange={setField('year_level')}
                            aria-label="Year level"
                        >
                            {[1, 2, 3, 4].map((year) => (
                                <option key={year} value={String(year)}>
                                    Year {year}
                                </option>
                            ))}
                        </select>

                        {/* Block Number */}
                        <input
                            type="number"
                            min="1"
                            max="99"
                            step="1"
                            placeholder="Block number (e.g. 4)"
                            value={form.block_number}
                            onChange={setField('block_number')}
                            aria-label="Block number"
                        />

                        {/* Motivation */}
                        <textarea
                            rows={4}
                            placeholder="Why do you want to be mayor?"
                            value={form.motivation}
                            onChange={setField('motivation')}
                            aria-label="Motivation"
                        />

                        {error && (
                            <div className={styles.error} role="alert">
                                {error}
                            </div>
                        )}

                        <div className={styles.actions}>
                            <button
                                className="btn ghost"
                                onClick={onClose}
                                disabled={busy}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                            >
                                {busy ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
