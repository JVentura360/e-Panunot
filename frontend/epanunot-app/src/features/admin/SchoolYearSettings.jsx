import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api, errorMessage } from '../../api/client.js';
import styles from './SchoolYearSettings.module.css';

const valuesFor = (term) => ({
  school_year: term?.school_year ?? '2026-2027',
  semester: String(term?.semester ?? 1),
  starts_on: term?.starts_on?.slice(0, 10) ?? '2026-08-01',
  ends_on: term?.ends_on?.slice(0, 10) ?? '2027-01-31',
});

export default function SchoolYearSettings({ onUpdated }) {
  const termQuery = useApiQuery('/admin/terms/current');
  const current = termQuery.data?.data ?? null;
  const [draft, setValues] = useState(null);
  const values = draft ?? valuesFor(current);
  const loading = termQuery.isPending;
  const ready = Boolean(termQuery.data);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [actionError, setError] = useState('');
  const error = actionError || (termQuery.error ? errorMessage(termQuery.error) : '');
  const [notice, setNotice] = useState('');
  const changesTerm = current && (values.school_year !== current.school_year || Number(values.semester) !== current.semester);
  const change = (event) => {
    setValues((previous) => ({ ...(previous ?? valuesFor(current)), [event.target.name]: event.target.value }));
    setConfirmed(false);
    setNotice('');
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api('/admin/terms/current', {
        method: 'PUT', body: { ...values, semester: Number(values.semester), previous_term_id: current?.id ?? null },
      });

      setValues(valuesFor(data));
      setConfirmed(false);
      setNotice(changesTerm ? 'New term started. Students can now apply as mayor or join a new block.' : 'School term saved.');
      await onUpdated();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="school-year-title" aria-busy={loading || busy}>
      <h2 id="school-year-title">School year &amp; term</h2>
      <p className={styles.description}>Manage the term used for new mayor applications and block enrollment.</p>
      {loading ? <p role="status">Loading school term…</p> : <>
        <p className={styles.current}>Current: <strong>{!ready ? 'Could not load settings' : current ? `${current.school_year} · ${current.semester === 3 ? 'Summer' : `Semester ${current.semester}`}` : 'No active term'}</strong></p>
        {error && <div className={styles.error} role="alert">{error} <button type="button" className="btn ghost" onClick={() => { setError(''); termQuery.refetch(); }}>Reload settings</button></div>}
        {notice && <p className={styles.success} role="status">{notice}</p>}
        <form onSubmit={save}>
          <fieldset disabled={busy || !ready} className={styles.fields}>
            <label>School year<input required name="school_year" pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" value={values.school_year} onChange={change} /></label>
            <label>Term<select name="semester" value={values.semester} onChange={change}><option value="1">First semester</option><option value="2">Second semester</option><option value="3">Summer</option></select></label>
            <label>Starts on<input required type="date" name="starts_on" value={values.starts_on} onChange={change} /></label>
            <label>Ends on<input required type="date" name="ends_on" min={values.starts_on} value={values.ends_on} onChange={change} /></label>
          </fieldset>
          {changesTerm && <div className={styles.warning}>
            <p>Starting a new term removes existing blocks from current lists and clears all block memberships. Mayors return to student accounts and must apply again. Previous blocks and their records stay in history.</p>
            <label className={styles.confirm}><input type="checkbox" required checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />I understand that students must enroll in new blocks.</label>
          </div>}
          <button className="btn" disabled={busy || !ready || (changesTerm && !confirmed)}>{busy ? 'Saving…' : changesTerm ? 'Start new term' : 'Save school term'}</button>
        </form>
      </>}
    </section>
  );
}
