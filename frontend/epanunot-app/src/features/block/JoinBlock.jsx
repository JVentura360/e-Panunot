import { useState } from 'react';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api, errorMessage } from '../../api/client.js';
import EnrollmentStatus from './EnrollmentStatus.jsx';
import PendingJoinLedger from './PendingJoinLedger.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { isRegularStudent, mayWithdrawSubjects, enrollmentReadiness } from './enrollmentRules.js';
import styles from './JoinBlock.module.css';

export default function JoinBlock({ user }) {
  const ledgerQuery = useApiQuery('/subject-enrollments/mine');
  const profileQuery = useApiQuery('/enrollment-profile');
  const ledger = ledgerQuery.data?.data ?? [];
  const profile = profileQuery.data?.data?.profile;
  const primaryBlockId = profileQuery.data ? profileQuery.data.data.primary_block_id : user.block_id;
  const joined = Boolean(primaryBlockId || user.role === 'mayor');
  const pendingJoin = profileQuery.data ? profileQuery.data.data.pending_join_request : user.pending_join_request;
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
  const [codeError, setCodeError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingLedger, setEditingLedger] = useState(false);
  const [withdrawing, setWithdrawing] = useState(null);
  const subjectsQuery = useApiQuery('/subjects', { query: { block_id: result?.id }, enabled: Boolean(result) });
  const subjects = subjectsQuery.data?.data ?? [];
  const readiness = enrollmentReadiness(joined, profileQuery, ledgerQuery);
  const unavailable = readiness.unavailable;

  const search = async (event) => {
    event.preventDefault(); setSearching(true); setError(''); setCodeError(''); setNotice(''); setResult(null); setSelected([]); setChoice('');
    try { const response = await api('/blocks/lookup', { query: { code: code.trim().toUpperCase() } }); setResult(response.data); }
    catch (e) { setCodeError(errorMessage(e)); }
    finally { setSearching(false); }
  };
  const enroll = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/blocks/${result.id}/${joined ? 'enrollment' : 'join'}`, { method: 'POST', body: {
        student_type: type, ...(joined && type === 'irregular' ? { subject_ids: selected } : {}),
      } });
      setSelected([]);
      setNotice(!joined ? 'Join request submitted. Please wait for mayor approval.' : 'Your selected subjects are enrolled.');
      if (!joined) setResult(null);
      await Promise.all([profileQuery.refetch(), ledgerQuery.refetch()]);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const withdraw = async (entry) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/subject-enrollments/${entry.id}`, { method: 'DELETE' });
      setNotice(`Withdrawn from ${entry.code}.`);
      setWithdrawing(null);
    }
    finally { setBusy(false); }
  };
  const anotherRegularBlock = joined && regular && result && Number(primaryBlockId) !== result.id;
  const alreadyRegular = joined && regular && result && Number(primaryBlockId) === result.id;
  const canEnroll = result && result.mayor_name && !subjectsQuery.error && !subjectsQuery.isPending
    && !unavailable && !busy && !anotherRegularBlock && !alreadyRegular
    && (!joined ? type === 'irregular' || type === 'regular' && subjects.length > 0 : type === 'irregular' && selected.length > 0);

  if (!joined && pendingJoin) return <PendingJoinLedger key={pendingJoin.id} request={pendingJoin} onRefresh={async () => {
    const results = await Promise.all([profileQuery.refetch(), ledgerQuery.refetch()]);
    if (results[0].error) throw results[0].error;
  }} />;

  return <div className={styles.page}>
    {withdrawing && <ConfirmDialog title={`Withdraw from ${withdrawing.code}?`}
      message={`Withdraw from ${withdrawing.name} (${withdrawing.code}) in ${withdrawing.block_code}? This removes the subject from your ledger. You will keep your block membership${user.role === 'mayor' ? ' and mayor role' : ''}.`}
      confirmLabel="Withdraw" onCancel={() => setWithdrawing(null)} onConfirm={() => withdraw(withdrawing)} />}
    <header className={styles.top}><h1>{joined ? 'My Ledger' : 'Join a Block'}</h1><p>{joined ? `Your block${user.block ? `: ${user.block}` : ''}. Manage the subjects you take below.` : 'Enter your block code, then confirm whether you are a regular or irregular student.'}</p></header>
    {joined && <EnrollmentStatus user={user} />}
    {!joined && profileQuery.isPending && <p role="status">Checking your block membership…</p>}
    {!joined && profileQuery.error && <p className={styles.error} role="alert">{errorMessage(profileQuery.error)} <button className="btn ghost" onClick={() => profileQuery.refetch()}>Retry membership check</button></p>}
    <div aria-live="polite">{error && <div className={styles.error} role="alert">{error}</div>}{notice && <div className={styles.notice} role="status">{notice}</div>}</div>
    {joined && <section className={styles.section} aria-labelledby="ledger-heading" aria-busy={ledgerQuery.isFetching}>
      <div className={styles.sectionHead}><h2 id="ledger-heading">Enrolled subjects <span className={styles.count}>{ledger.length}</span></h2>
        <div className={styles.sectionControls}>
          <button className="btn ghost" disabled={ledgerQuery.isFetching || busy} onClick={() => Promise.all([ledgerQuery.refetch(), profileQuery.refetch()])}>Refresh</button>
          {mayWithdrawSubjects(effectiveUser) && <button className="btn ghost" aria-pressed={editingLedger}
            disabled={busy || (!editingLedger && (unavailable || ledger.length === 0))}
            onClick={() => setEditingLedger((editing) => !editing)}>{editingLedger ? 'Done' : 'Edit'}</button>}
        </div>
      </div>
      {ledgerQuery.isPending ? <p role="status">Loading your ledger…</p> : ledgerQuery.error ? <p className={styles.error} role="alert">{errorMessage(ledgerQuery.error)} <button className="btn ghost" onClick={() => ledgerQuery.refetch()}>Retry</button></p>
        : ledger.length === 0 ? <div className="empty">No subjects enrolled. You still belong to your block.{!regular && ' Find a block below to select the subjects you take.'}</div>
          : <ul className={styles.subjectGrid}>{ledger.map((entry) => <li className={styles.subjectCard} key={entry.id}>
            {editingLedger && mayWithdrawSubjects(effectiveUser) && <button className={styles.withdrawButton} disabled={busy || unavailable} onClick={() => setWithdrawing(entry)} aria-label={`Withdraw from ${entry.code} in ${entry.block_code}`}>Withdraw</button>}
            <div className={styles.subjectContent}>
              <h3 className={styles.subjectTitle}>{entry.name}</h3>
              <p className={styles.subjectIdentifiers}><span className={styles.subjectCode}>{entry.code}</span><span aria-hidden="true"> · </span><span>{entry.block_code}</span></p>
              <p className={styles.subjectTerm}>{entry.school_year}<span aria-hidden="true"> · </span>Semester {entry.semester}</p>
              <p className={styles.subjectMayor}>Mayor: {entry.mayor_name ?? 'Not assigned'}</p>
            </div>
          </li>)}</ul>}
      {regular && ledger.length > 0 && <p className={styles.explanation}>Your block subjects are enrolled automatically. You can withdraw individual subjects without leaving your block{user.role === 'mayor' ? ' or losing your mayor role' : ''}.</p>}
    </section>}
    {(!joined || !regular) && <>
    <section className={styles.section} aria-labelledby="find-subjects-heading">
      <h2 id="find-subjects-heading">{joined ? 'Find subjects by block' : 'Find your block'}</h2>
      <p className={styles.explanation}>{joined ? 'Search for the blocks where you take subjects. Enrolling here will not change your primary block.' : 'Send a request to the block’s mayor. After approval, regular students receive the block’s subjects; irregular students choose subjects in My Ledger.'}</p>
      <form className={styles.search} onSubmit={search}>
        <div className={styles.codeField}>
          <label className={styles.srOnly} htmlFor="block-code">Block code</label>
          <input id="block-code" className={styles.input} value={code} onChange={(event) => { setCode(event.target.value); setCodeError(''); }} placeholder="31-ITE-04" required maxLength={30} autoComplete="off"
            aria-invalid={Boolean(codeError)} aria-describedby={codeError ? 'block-code-error' : undefined} />
        </div>
        <button className="btn" type="submit" disabled={searching || busy || !code.trim()}>{searching ? 'Searching…' : 'Find block'}</button>
        {codeError && <p id="block-code-error" className={styles.fieldError} role="alert">{codeError}</p>}
      </form>
      {result && <div className={styles.result}>
        <h3 className={styles.code}>{result.code}</h3><p className={styles.meta}>{result.school_year} · Semester {result.semester} · Mayor: {result.mayor_name ?? 'Not assigned'}</p>
        {!result.mayor_name && <p className={styles.error}>An appointed mayor is required before this block can accept enrollment.</p>}
        {!joined && <fieldset className={styles.typeChoice} disabled={busy || unavailable || Boolean(currentType)}>
          <legend>Are you a regular or irregular student?</legend>
          <label><input type="radio" name="student-type" value="regular" checked={type === 'regular'} onChange={() => { setChoice('regular'); setSelected([]); }} />Regular — subjects are assigned after mayor approval</label>
          <label><input type="radio" name="student-type" value="irregular" checked={type === 'irregular'} onChange={() => setChoice('irregular')} />Irregular — choose subjects after mayor approval</label>
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
                  {type === 'regular' && !enrolled && <p className={styles.meta}>{alreadyRegular ? 'Not currently enrolled' : 'Enrolled automatically after mayor approval'}</p>}
                </div>
              </li>;
            })}</ul>}
        {anotherRegularBlock ? <p className={styles.explanation}>Regular enrollment is limited to your own block.</p> : alreadyRegular ? <p className={styles.explanation}>You belong to this block.</p>
          : <div className={styles.actions}><button className="btn" disabled={!canEnroll} onClick={enroll}>{busy ? 'Saving…' : !joined ? 'Request to join' : `Enroll selected subjects (${selected.length})`}</button></div>}
      </div>}
    </section>
    </>}
  </div>;
}
