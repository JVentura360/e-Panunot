import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import SubjectLoadEditor, { SubjectLoadList } from '../subjects/SubjectLoadEditor.jsx';
import { makeSubjectRows, proposalForScope, scopeKey, subjectPayload, subjectRowsError } from '../subjects/subjectLoadForm.js';
import styles from './ApplyMayorModal.module.css';
import { applicationEligibility } from '../block/enrollmentRules.js';

export default function ApplyMayorModal({ user, onClose }) {
  const [form, setForm] = useState({ year_level: '1', program: '', block_number: '', motivation: '' });
  const [lookupProgram, setLookupProgram] = useState('');
  const validProgram = /^[A-Z0-9]{1,20}$/.test(form.program);
  const programReady = validProgram && lookupProgram === form.program;
  useEffect(() => {
    const timer = setTimeout(() => setLookupProgram(form.program), 350);
    return () => clearTimeout(timer);
  }, [form.program]);
  const scope = scopeKey(form.program, form.year_level);
  const [draft, setDraft] = useState(() => ({ scope, rows: makeSubjectRows() }));
  const proposal = proposalForScope(draft, scope);
  const lookup = useApiQuery('/subject-loads/current', { query: { program: lookupProgram, year_level: Number(form.year_level) }, enabled: programReady });
  const current = programReady ? lookup.data?.data : null;
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regularDeclaration, setRegularDeclaration] = useState(false);
  const eligibility = applicationEligibility(user);
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement) previous.focus(); };
  }, []);

  const change = (key) => (event) => {
    const value = key === 'program' ? event.target.value.toUpperCase().replace(/\s/g, '') : event.target.value;
    const next = { ...form, [key]: value };
    setForm(next);
    if (key === 'program' || key === 'year_level') setDraft({ scope: scopeKey(next.program, next.year_level), rows: makeSubjectRows() });
    setError('');
  };
  const rowError = current?.load ? '' : subjectRowsError(proposal);
  const canSubmit = eligibility.allowed && regularDeclaration && Boolean(current) && !lookup.isPending && !lookup.error && !rowError
    && form.motivation.trim() && Number(form.block_number) >= 1 && Number(form.block_number) <= 99 && Number.isInteger(Number(form.block_number)) && !busy;
  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await api('/mayor-applications', { method: 'POST', body: {
        program: form.program, year_level: Number(form.year_level), block_number: Number(form.block_number), motivation: form.motivation.trim(),
        expected_term_id: current.term.id, expected_load_revision: current.load?.revision ?? 0,
        is_regular_student: regularDeclaration,
        ...(!current.load ? { proposed_subjects: subjectPayload(proposal) } : {}),
      } });
      setSubmitted(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="apply-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    {submitted ? <div className={styles.modal}>
      <h2 id="apply-title">Application submitted</h2>
      <p className={styles.hint}>The admin will review your application and subject load. Your block and its subjects become available after approval.</p>
      <div className={styles.actions}><button className="btn" onClick={onClose}>Done</button></div>
    </div> : <form className={styles.modal} onSubmit={submit}>
      <h2 id="apply-title">Apply as Mayor</h2>
      <p className={styles.hint}>Enter your block details and review its subjects. The admin approves your block and manages its shared subject load.</p>
      {!eligibility.allowed && <p role="alert" className={styles.error}>{eligibility.reason}</p>}
      <label className={styles.declaration}><input type="checkbox" required checked={regularDeclaration} onChange={(event) => setRegularDeclaration(event.target.checked)} disabled={busy} />
        I am a regular student and will take this block’s complete subject load if appointed mayor.
      </label>
      <fieldset disabled={busy} className={styles.details}>
        <label>Program code<input className={styles.programCode} value={form.program} onChange={change('program')} aria-label="Program code" aria-describedby="program-code-example" required maxLength={20} pattern="[A-Z0-9]+" autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="ITE" /></label>
        <label>Year level<select value={form.year_level} onChange={change('year_level')} aria-label="Year level">{[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
        <label>Block number<input type="number" min="1" max="99" step="1" value={form.block_number} onChange={change('block_number')} required placeholder="4" /></label>
      </fieldset>
      {current && <p className={styles.hint}>{current.term.school_year} · Semester {current.term.semester} · {form.program} · Year {form.year_level}</p>}
      <p id="program-code-example" className={styles.hint}>Example: <strong>31-ITE-04</strong> — Year 3 · Semester 1 · Program code ITE · Block 04.</p>
      {!validProgram ? <p className={styles.hint}>Enter your program code to look up its subject load.</p> : !programReady || lookup.isPending ? <p role="status">Loading approved subject load…</p> : lookup.error ? <div className={styles.error} role="alert">{errorMessage(lookup.error)} <button type="button" className="btn ghost" onClick={() => lookup.refetch()}>Retry</button></div>
        : current?.load ? <section aria-label="Approved subject load"><h3>Approved subject load</h3><p className={styles.hint}>Shared with matching blocks. Only the admin can change these subjects.</p><SubjectLoadList subjects={current.load.subjects} /></section>
          : <><p className={styles.hint}>No approved load exists for this program and year this term. Propose the subjects for admin review; they will not be published until approved.</p>
            <SubjectLoadEditor value={proposal} onChange={(rows) => setDraft({ scope, rows })} disabled={busy} idPrefix="proposal" /></>}
      {programReady && !current?.load && rowError && !lookup.isPending && !lookup.error && <p className={styles.hint} role="status">{rowError}</p>}
      <label>Why do you want to be mayor?<textarea rows={3} value={form.motivation} onChange={change('motivation')} required maxLength={10000} disabled={busy} /></label>
      {error && <div className={styles.error} role="alert">{error} <button type="button" className="btn ghost" onClick={() => lookup.refetch()}>Reload approved load</button></div>}
      <div className={styles.actions}><button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="btn" type="submit" disabled={!canSubmit}>{busy ? 'Submitting…' : 'Submit application'}</button></div>
    </form>}
  </dialog>;
}
