import { useEffect, useId, useRef, useState } from 'react';
import styles from './Modal.module.css';
import DatePicker from './DatePicker';
import { dateKey } from './datePickerUtils.js';
import { validDeadline } from './taskListUtils.js';

export default function Modal({ title, description, fields, onSave, onClose, submitLabel = 'Save' }) {
  const id = useId();
  const dialogRef = useRef(null);
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map((field) => [field.key, field.type === 'select' ? field.options[0] : ''])));
  useEffect(() => {
    const dialog = dialogRef.current;
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

  const submit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([key, value]) => [key, value.trim()]));
    const missing = fields.find((field) => field.required && !values[field.key]);
    if (missing) {
      const input = event.currentTarget.elements.namedItem(missing.key);
      input.setCustomValidity('Please complete this field.');
      input.reportValidity();
      return;
    }
    const invalidDeadline = fields.find((field) => field.disallowPast && !validDeadline(values[field.key], dateKey(new Date())));
    if (invalidDeadline) {
      const input = event.currentTarget.elements.namedItem(invalidDeadline.key);
      input.setCustomValidity('Choose today or a future date for the deadline.');
      input.reportValidity();
      return;
    }
    onSave(values);
  };
  return (
    <dialog ref={dialogRef} className={styles.modal} aria-labelledby={id + '-title'} aria-describedby={description ? id + '-description' : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
      <form onSubmit={submit}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Your workspace</p><h2 id={id + '-title'}>{title}</h2></div>
          <button type="button" className={styles.close} aria-label="Close dialog" onClick={onClose}>×</button>
        </header>
        {description && <p id={id + '-description'} className={styles.description}>{description}</p>}
        <div className={styles.fields}>
          {fields.map((field) => {
            const common = {
              id: id + '-field-' + field.key, name: field.key,
              required: field.required, value: vals[field.key],
              onChange: (event) => { event.target.setCustomValidity(''); setVals({ ...vals, [field.key]: event.target.value }); },
              onInput: (event) => event.target.setCustomValidity(''),
            };
            return <div className={styles.field} key={field.key}>
              <label htmlFor={common.id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
              {field.type === 'select' ? <select {...common}>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                : field.type === 'date' ? <DatePicker {...common} min={field.disallowPast ? dateKey(new Date()) : field.min} />
                : field.type === 'textarea' ? <textarea {...common} placeholder={field.placeholder} rows={4} maxLength={5000} />
                  : <input {...common} type={field.type || 'text'} placeholder={field.placeholder} maxLength={field.type === 'date' ? undefined : 255} />}
            </div>;
          })}
        </div>
        <footer className={styles.actions}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">{submitLabel}</button>
        </footer>
      </form>
    </dialog>
  );
}
