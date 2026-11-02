import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api, errorMessage } from '../../api/client.js';
import EnrollmentStatus from './EnrollmentStatus.jsx';
import { isRegularStudent, mayWithdrawSubjects, enrollmentReadiness } from './enrollmentRules.js';
import styles from './JoinBlock.module.css';

export default function JoinBlock({ user }) {
  const ledgerQuery = useApiQuery('/subject-enrollments/mine');
  const profileQuery = useApiQuery('/enrollment-profile');
  const ledger = ledgerQuery.data?.data ?? [];
  const profile = profileQuery.data?.data?.profile;
  const primaryBlockId = profileQuery.data ? profileQuery.data.data.primary_block_id : user.block_id;
  const joined = Boolean(primaryBlockId || user.role === 'mayor');
  const currentType = profileQuery.data ? profile?.student_type ?? (user.role === 'mayor' ? 'regular' : '') : user.student_type ?? '';
  const effectiveUser = { ...user, student_type: currentType };
  const regular = isRegularStudent(effectiveUser);
  const [choice, setChoice] = useState('');
  const type = currentType || choice;
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const subjectsQuery = useApiQuery('/subjects', { query: { block_id: result?.id }, enabled: Boolean(result) });
  const subjects = subjectsQuery.data?.data ?? [];
  const readiness = enrollmentReadiness(joined, profileQuery, ledgerQuery);
  const unavailable = readiness.unavailable;

  const search = async (event) => {
    event.preventDefault(); setSearching(true); setError(''); setNotice(''); setResult(null); setSelected([]); setChoice('');
    try { const response = await api('/blocks/lookup', { query: { code: code.trim().toUpperCase() } }); setResult(response.data); }
    catch (e) { setError(errorMessage(e)); }
    finally { setSearching(false); }
  };
  const enroll = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/blocks/${result.id}/${joined ? 'enrollment' : 'join'}`, { method: 'POST', body: {
        student_type: type, ...(joined && type === 'irregular' ? { subject_ids: selected } : {}),
      } });
      setSelected([]);
      setNotice(!joined ? type === 'regular' ? 'You joined the block. Its subjects are now in your ledger.' : 'You joined the block. Search for blocks below and select the subjects you take.' : 'Your selected subjects are enrolled.');
      if (!joined) setResult(null);
      await Promise.all([profileQuery.refetch(), ledgerQuery.refetch()]);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const withdraw = async (entry) => {
    if (!window.confirm(`Withdraw from ${entry.code} in ${entry.block_code}? This removes it from your current ledger.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api(`/subject-enrollments/${entry.id}`, { method: 'DELETE' }); setNotice(`Withdrawn from ${entry.code}.`); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const anotherRegularBlock = joined && regular && result && Number(primaryBlockId) !== result.id;
  const alreadyRegular = joined && regular && result && Number(primaryBlockId) === result.id;
  const canEnroll = result && result.mayor_name && !subjectsQuery.error && !subjectsQuery.isPending
    && !unavailable && !busy && !anotherRegularBlock && !alreadyRegular
    && (!joined ? type === 'irregular' || type === 'regular' && subjects.length > 0 : type === 'irregular' && selected.length > 0);

  return <div className={styles.page}>
    <header className={styles.top}><h1>{joined ? 'My Ledger' : 'Join a Block'}</h1><p>{joined ? `Your block${user.block ? `: ${user.block}` : ''}. Manage the subjects you take below.` : 'Enter your block code, then confirm whether you are a regular or irregular student.'}</p></header>
    {joined && <EnrollmentStatus user={user} />}
    {!joined && profileQuery.isPending && <p role="status">Checking your block membership…</p>}
    {!joined && profileQuery.error && <p className={styles.error} role="alert">{errorMessage(profileQuery.error)} <button className="btn ghost" onClick={() => profileQuery.refetch()}>Retry membership check</button></p>}
    <div aria-live="polite">{error && <div className={styles.error} role="alert">{error}</div>}{notice && <div className={styles.notice} role="status">{notice}</div>}</div>
    {joined && <section className={styles.section} aria-labelledby="ledger-heading" aria-busy={ledgerQuery.isFetching}>
      <div className={styles.sectionHead}><h2 id="ledger-heading">Enrolled subjects <span className={styles.count}>{ledger.length}</span></h2>
        <button className="btn ghost" disabled={ledgerQuery.isFetching || busy} onClick={() => Promise.all([ledgerQuery.refetch(), profileQuery.refetch()])}>Refresh</button>
      </div>
      {ledgerQuery.isPending ? <p role="status">Loading your ledger…</p> : ledgerQuery.error ? <p className={styles.error} role="alert">{errorMessage(ledgerQuery.error)} <button className="btn ghost" onClick={() => ledgerQuery.refetch()}>Retry</button></p>
        : ledger.length === 0 ? <div className="empty">No subjects enrolled. You still belong to your block.{!regular && ' Find a block below to select the subjects you take.'}</div>
          : <ul className={styles.subjectGrid}>{ledger.map((entry) => <li className={styles.subjectCard} key={entry.id}>
            <div className={styles.subjectContent}>
              <div className={styles.subjectIdentifiers}><span className={styles.subjectCode}>{entry.code}</span><span className={styles.subjectBlock}>{entry.block_code}</span></div>
              <h3 className={styles.subjectTitle}>{entry.name}</h3>
              <p className={styles.subjectTerm}>{entry.school_year}<span aria-hidden="true"> · </span>Semester {entry.semester}</p>
            </div>
            <div className={styles.subjectFooter}>
              <p className={styles.subjectMayor}><span>Mayor</span><strong>{entry.mayor_name ?? 'Not assigned'}</strong></p>
              {mayWithdrawSubjects(effectiveUser) && <button className={styles.withdrawButton} disabled={busy || unavailable} onClick={() => withdraw(entry)} aria-label={`Withdraw from ${entry.code} in ${entry.block_code}`}>Withdraw</button>}
            </div>
          </li>)}</ul>}
      {regular && ledger.length > 0 && <p className={styles.explanation}>Your block subjects are enrolled automatically. You can withdraw individual subjects without leaving your block{user.role === 'mayor' ? ' or losing your mayor role' : ''}.</p>}
    </section>}
    {(!joined || !regular) && <>
    <section className={styles.section} aria-labelledby="find-subjects-heading">
      <h2 id="find-subjects-heading">{joined ? 'Find subjects by block' : 'Find your block'}</h2>
      <p className={styles.explanation}>{joined ? 'Search for the blocks where you take subjects. Enrolling here will not change your primary block.' : 'Joining sets your displayed class block. Regular students receive its full subject load; irregular students choose subjects afterward in My Ledger.'}</p>
      <form className={styles.search} onSubmit={search}>
        <label className={styles.srOnly} htmlFor="block-code">Block code</label><input id="block-code" className={styles.input} value={code} onChange={(event) => setCode(event.target.value)} placeholder="31-ITE-04" required maxLength={30} autoComplete="off" />
        <button className="btn" type="submit" disabled={searching || busy || !code.trim()}>{searching ? 'Searching…' : 'Find block'}</button>
      </form>
      {result && <div className={styles.result}>
        <h3 className={styles.code}>{result.code}</h3><p className={styles.meta}>{result.school_year} · Semester {result.semester} · Mayor: {result.mayor_name ?? 'Not assigned'}</p>
        {!result.mayor_name && <p className={styles.error}>An appointed mayor is required before this block can accept enrollment.</p>}
        {!joined && <fieldset className={styles.typeChoice} disabled={busy || unavailable || Boolean(currentType)}>
          <legend>Are you a regular or irregular student?</legend>
          <label><input type="radio" name="student-type" value="regular" checked={type === 'regular'} onChange={() => { setChoice('regular'); setSelected([]); }} />Regular — enroll in every subject in this block</label>
          <label><input type="radio" name="student-type" value="irregular" checked={type === 'irregular'} onChange={() => setChoice('irregular')} />Irregular — join first, then choose subjects in My Ledger</label>
        </fieldset>}
        {!joined && currentType && <p className={styles.explanation}>Your confirmed status for this term is {currentType}.</p>}
        {subjectsQuery.isPending ? <p role="status">Loading offered subjects…</p> : subjectsQuery.error ? <p role="alert">{errorMessage(subjectsQuery.error)} <button className="btn ghost" onClick={() => subjectsQuery.refetch()}>Retry</button></p>
          : !subjects.length ? <p className={styles.explanation}>The admin has not assigned a subject load to this block yet. Ask the admin to set its subjects before enrolling.</p>
            : <ul className={styles.offerings}>{subjects.map((subject) => {
              const enrolled = ledger.find((entry) => entry.subject_id === subject.id);
              const checked = Boolean(enrolled && enrolled.block_id === result.id) || selected.includes(subject.id);
              return <li className={styles.item} key={subject.id}>
                {joined && type === 'irregular' && <input type="checkbox" id={`select-subject-${subject.id}`} checked={checked} disabled={busy || Boolean(enrolled) || unavailable}
                  onChange={(event) => setSelected((old) => event.target.checked ? [...old, subject.id] : old.filter((id) => id !== subject.id))} aria-label={`Select ${subject.code} in ${result.code}`} />}
                <div className={styles.grow}><div className={styles.meta}>{subject.code}</div><h4 className={styles.name}>{subject.name}</h4>
                  {enrolled && <p className={styles.meta}>Enrolled in {enrolled.block_code}{enrolled.block_id !== result.id && '. Withdraw there first to switch blocks.'}</p>}
                  {type === 'regular' && !enrolled && <p className={styles.meta}>{alreadyRegular ? 'Not currently enrolled' : 'Enrolled automatically when you join'}</p>}
                </div>
              </li>;
            })}</ul>}
        {anotherRegularBlock ? <p className={styles.explanation}>Regular enrollment is limited to your own block.</p> : alreadyRegular ? <p className={styles.explanation}>You belong to this block.</p>
          : <div className={styles.actions}><button className="btn" disabled={!canEnroll} onClick={enroll}>{busy ? 'Saving…' : !joined ? 'Join Block' : `Enroll selected subjects (${selected.length})`}</button></div>}
      </div>}
    </section>
    </>}
  </div>;
}
