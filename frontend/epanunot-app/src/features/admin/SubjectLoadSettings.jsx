import { useState } from 'react';
import { api, errorMessage } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import SubjectLoadEditor from '../subjects/SubjectLoadEditor.jsx';
import { makeSubjectRows, scopeKey, subjectPayload, subjectRowsError } from '../subjects/subjectLoadForm.js';
import styles from './SubjectLoadSettings.module.css';

function LoadForm({ snapshot, program, yearLevel, reload }) {
  const [rows, setRows] = useState(() => makeSubjectRows(snapshot.load?.subjects ?? snapshot.existing_subjects));
  const [revision, setRevision] = useState(snapshot.load?.revision ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const changedElsewhere = revision !== (snapshot.load?.revision ?? 0);
  const reset = async () => {
    if (!window.confirm('Replace your draft with the latest approved load or existing block subjects?')) return;
    setBusy(true);
    setError('');
    try {
      const result = await reload();
      if (result.error) throw result.error;
      const next = result.data.data;
      if (next.term.id !== snapshot.term.id) throw new Error('The school term changed. Choose the load again.');
      setRows(makeSubjectRows(next.load?.subjects ?? next.existing_subjects));
      setRevision(next.load?.revision ?? 0);
      setNotice('Latest load loaded. Review the subjects before saving.');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api('/admin/subject-loads/current', { method: 'PUT', body: {
        term_id: snapshot.term.id, program, year_level: yearLevel, expected_revision: revision, subjects: subjectPayload(rows),
      } });
      setRows(makeSubjectRows(response.data.load.subjects));
      setRevision(response.data.load.revision);
      setNotice('Shared load saved. All matching blocks now use these subjects.');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className={styles.loadForm} aria-busy={busy}>
    <h3>{program} · Year {yearLevel}</h3>
    <p className={styles.hint}>{snapshot.term.school_year} · Semester {snapshot.term.semester} · {snapshot.load ? `Approved revision ${snapshot.load.revision}` : 'No approved shared load yet'}</p>
    <div className={styles.impact}><strong>Affected blocks</strong><p>{snapshot.blocks.length ? snapshot.blocks.map((block) => block.code).join(', ') : 'No matching blocks yet. This load will be used by future matching blocks.'}</p></div>
    {!snapshot.load && snapshot.existing_subjects.length > 0 && <p className={styles.hint}>Existing block subjects are shown for your review. No shared load will be established until you save.</p>}
    <SubjectLoadEditor value={rows} onChange={setRows} disabled={busy} idPrefix="admin-load" />
    {subjectRowsError(rows) && <p className={styles.error} role="status">{subjectRowsError(rows)}</p>}
    <p className={styles.hint}>Saving updates every matching block. Subjects with enrolled students cannot be removed.</p>
    {changedElsewhere && <p className={styles.error} role="status">A newer load is available. Your draft is preserved; reload and reconcile it before saving.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.actions}><button className="btn" type="submit" disabled={busy || changedElsewhere || Boolean(subjectRowsError(rows))}>{busy ? 'Saving…' : 'Save shared load'}</button><button className="btn ghost" type="button" onClick={reset} disabled={busy}>Reload latest load</button></div>
  </form>;
}

function SelectedLoad({ program, yearLevel }) {
  const query = useApiQuery('/subject-loads/current', { query: { program, year_level: yearLevel } });
  if (query.isPending) return <p role="status">Loading subject load…</p>;
  if (query.error) return <p className={styles.error} role="alert">{errorMessage(query.error)} <button className="btn ghost" onClick={() => query.refetch()}>Retry</button></p>;
  const snapshot = query.data.data;
  return <LoadForm key={`${snapshot.term.id}:${scopeKey(program, yearLevel)}`} snapshot={snapshot} program={program} yearLevel={yearLevel} reload={() => query.refetch()} />;
}

export default function SubjectLoadSettings() {
  const [program, setProgram] = useState('ITE');
  const [year, setYear] = useState('3');
  const [selected, setSelected] = useState(null);
  return <section className={styles.section} aria-labelledby="shared-load-title">
    <h2 id="shared-load-title">Shared subject loads</h2>
    <p className={styles.hint}>Only admins can change loads. Blocks with the same program, year level, and term share one approved load.</p>
    <form className={styles.scope} onSubmit={(event) => { event.preventDefault(); setSelected({ program: program.trim().toUpperCase(), yearLevel: Number(year) }); }}>
      <label>Program code<input required maxLength={20} pattern="[A-Za-z0-9]+" value={program} onChange={(event) => setProgram(event.target.value.toUpperCase())} placeholder="ITE" /></label>
      <label>Year level<select value={year} onChange={(event) => setYear(event.target.value)}>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>Year {value}</option>)}</select></label>
      <button className="btn ghost" type="submit">View load</button>
    </form>
    {selected && <SelectedLoad key={scopeKey(selected.program, selected.yearLevel)} {...selected} />}
  </section>;
}
