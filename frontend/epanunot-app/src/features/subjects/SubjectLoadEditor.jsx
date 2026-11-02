import { makeSubjectRows } from './subjectLoadForm.js';
import styles from './SubjectLoadEditor.module.css';

export function SubjectLoadList({ subjects }) {
  return <dl className={styles.subjectList}>{subjects.map((subject) => <div key={subject.id ?? subject.code}>
    <dt>{subject.code}</dt><dd>{subject.name}</dd>
  </div>)}</dl>;
}

export default function SubjectLoadEditor({ value, onChange, disabled = false, idPrefix = 'load' }) {
  const update = (key, field, text) => onChange(value.map((row) => row.key === key ? { ...row, [field]: text } : row));
  return <fieldset className={styles.editor} disabled={disabled}>
    <legend>Subject load</legend>
    <p id={`${idPrefix}-hint`} className={styles.hint}>Enter the complete subject name; avoid abbreviations. Codes and capitalization are formatted when approved.</p>
    <div className={styles.rows}>{value.map((row, index) => <div key={row.key} className={styles.row}>
      <label htmlFor={`${idPrefix}-${row.key}-code`}>Subject code {index + 1}
        <input id={`${idPrefix}-${row.key}-code`} value={row.code} onChange={(event) => update(row.key, 'code', event.target.value)} required maxLength={20} placeholder="ITE 301" autoComplete="off" />
      </label>
      <label htmlFor={`${idPrefix}-${row.key}-name`}>Complete subject name
        <input id={`${idPrefix}-${row.key}-name`} value={row.name} onChange={(event) => update(row.key, 'name', event.target.value)} required maxLength={255} placeholder="Fundamentals of Database Systems" aria-describedby={`${idPrefix}-hint`} />
      </label>
      <button type="button" className="btn ghost" aria-label={`Remove subject ${index + 1}`} disabled={value.length === 1} onClick={() => onChange(value.filter((item) => item.key !== row.key))}>Remove</button>
    </div>)}</div>
    <button type="button" className="btn ghost" disabled={value.length >= 60} onClick={() => onChange([...value, ...makeSubjectRows()])}>+ Add subject</button>
  </fieldset>;
}
