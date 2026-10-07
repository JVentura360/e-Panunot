import { useState } from 'react';
import styles from './Modal.module.css';

// Reusable popup form. fields = [{ key, label, type?, options? }]
export default function Modal({ title, fields, onSave, onClose }) {
    const initialVals = fields.reduce((acc, f) => {
        if (f.type === 'select' && f.options?.length) acc[f.key] = f.options[0];
        return acc;
    }, {});

    const [vals, setVals] = useState(initialVals);

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                {fields.map((f) =>
                f.type === 'select' ? (
                    <select
                    key={f.key}
                    aria-label={f.label}
                    value={vals[f.key] || f.options[0]}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                    >
                        {f.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input
                    key={f.key}
                    type={f.type || 'text'}
                    placeholder={f.label}
                    aria-label={f.label}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                    />
                )
                )}
                
                <div className={styles.actions}>
                <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
                <button type="button" className="btn" onClick={() => onSave(vals)}>Save</button>
                </div>
            </div>
        </div>
    );
}
