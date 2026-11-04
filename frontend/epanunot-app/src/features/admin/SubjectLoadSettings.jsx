import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import MessageDialog from '../../components/MessageDialog.jsx';
import { api, errorMessage } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import SubjectLoadEditor from '../subjects/SubjectLoadEditor.jsx';
import { makeSubjectRows, scopeKey, subjectPayload, subjectRowsError } from '../subjects/subjectLoadForm.js';
import styles from './SubjectLoadSettings.module.css';

function LoadForm({ snapshot, program, yearLevel, reload }) {
  const [rows, setRows] = useState(() => makeSubjectRows(snapshot.load?.subjects ?? snapshot.existing_subjects, { allowEmpty: true }));
  const [revision, setRevision] = useState(snapshot.load?.revision ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [message, setMessage] = useState(null);
  const baseline = snapshot.load?.subjects ?? snapshot.existing_subjects;
  const removed = baseline.filter(subject => !rows.some(row => row.id === subject.id));
  const invalid = subjectRowsError(rows, { allowEmpty: true });
  const changedElsewhere = (snapshot.load?.revision ?? 0) > revision;
  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await reload();
      if (result.error) throw result.error;
      const next = result.data.data;
      if (next.term.id !== snapshot.term.id) throw new Error('The school term changed. Choose the load again.');
      setRows(makeSubjectRows(next.load?.subjects ?? next.existing_subjects, { allowEmpty: true }));
      setRevision(next.load?.revision ?? 0);
      setNotice('Latest load loaded. Review the subjects before saving.');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api('/admin/subject-loads/current', { method: 'PUT', body: {
        term_id: snapshot.term.id, program, year_level: yearLevel, expected_revision: revision, subjects: subjectPayload(rows, { includeIds: true, allowEmpty: true }),
      } });
      setRows(makeSubjectRows(response.data.load.subjects, { allowEmpty: true }));
      setRevision(response.data.load.revision);
      setNotice('Shared load saved. All matching blocks now use these subjects.');
      setMessage({ title: 'Subject load saved', text: 'Your changes are saved to the database and applied to all matching blocks.' });
    } catch (e) { setError(errorMessage(e)); setMessage({ title: 'Could not save subject load', text: errorMessage(e) }); }
    finally { setBusy(false); }
  };
  const submit = event => {
    event.preventDefault();
    if (removed.length) setConfirmation('remove');
    else void save();
  };
  return <form onSubmit={submit} className={styles.loadForm} aria-busy={busy}>
    {confirmation && <ConfirmDialog title={confirmation === 'reload' ? 'Reload latest load?' : 'Remove subjects from this load?'}
      message={confirmation === 'reload' ? 'Replace your unsaved draft with the latest saved subject load?' : `Saving removes ${removed.map(subject => subject.code).join(', ')} and their enrollments from every affected block. Task history is preserved.`}
      confirmLabel="OK" onCancel={() => setConfirmation(null)} onConfirm={async () => { const action = confirmation; setConfirmation(null); if (action === 'reload') await reset(); else await save(); }} />}
    {message && <MessageDialog title={message.title} message={message.text} onClose={() => setMessage(null)} />}
    <h3>{program} · Year {yearLevel}</h3>
    <p className={styles.hint}>{snapshot.term.school_year} · Semester {snapshot.term.semester} · {snapshot.load ? `Approved revision ${snapshot.load.revision}` : 'No approved shared load yet'}</p>
    <div className={styles.impact}><strong>Affected blocks</strong><p>{snapshot.blocks.length ? snapshot.blocks.map((block) => block.code).join(', ') : 'No matching blocks yet. This load will be used by future matching blocks.'}</p></div>
    {!snapshot.load && snapshot.existing_subjects.length > 0 && <p className={styles.hint}>Existing block subjects are shown for your review. No shared load will be established until you save.</p>}
    <SubjectLoadEditor value={rows} onChange={setRows} disabled={busy} allowEmpty idPrefix="admin-load" />
    {invalid && <p className={styles.error} role="status">{invalid}</p>}
    <p className={styles.hint}>Changes remain a draft until you save. Removing a subject also removes its enrollments from affected blocks; task history is kept. Editing its code or name updates the shared catalog wherever it is used.</p>
    {changedElsewhere && <p className={styles.error} role="status">A newer load is available. Your draft is preserved; reload and reconcile it before saving.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.actions}><button className="btn" type="submit" disabled={busy || changedElsewhere || Boolean(invalid)}>{busy ? 'Saving…' : 'Save shared load'}</button><button className="btn ghost" type="button" onClick={() => setConfirmation('reload')} disabled={busy}>Reload latest load</button></div>
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
    <form className={styles.scope} onSubmit={(event) => { event.preventDefault(); setSelected({ program: program.trim().toUpperCase(), yearLevel: Number(year) }); }}>
      <label>Program code<input required maxLength={20} pattern="[A-Za-z0-9]+" value={program} onChange={(event) => setProgram(event.target.value.toUpperCase())} placeholder="ITE" /></label>
      <label>Year level<select value={year} onChange={(event) => setYear(event.target.value)}>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>Year {value}</option>)}</select></label>
      <button className="btn ghost" type="submit">View load</button>
    </form>
    {selected && <SelectedLoad key={scopeKey(selected.program, selected.yearLevel)} {...selected} />}
  </section>;
}
