import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../api/useApiQuery.js';
import { errorMessage } from '../../api/client.js';
import SubjectLoadEditor, { SubjectLoadList } from '../subjects/SubjectLoadEditor.jsx';
import { makeSubjectRows, subjectPayload, subjectRowsError } from '../subjects/subjectLoadForm.js';
import styles from '../navigation/ApplyMayorModal.module.css';

export default function ApplicationSubjectReview({ application, onApprove, onClose }) {
  const detail = useApiQuery(`/admin/mayor-applications/${application.id}`);
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="application-review-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {detail.isPending ? <div className={styles.modal}><h2 id="application-review-title">Review application</h2><p role="status">Loading subjects…</p><button className="btn ghost" onClick={onClose}>Close</button></div>
      : detail.error ? <div className={styles.modal}><h2 id="application-review-title">Review application</h2><p role="alert">{errorMessage(detail.error)}</p><button className="btn" onClick={() => detail.refetch()}>Retry</button><button className="btn ghost" onClick={onClose}>Close</button></div>
        : <ReviewForm data={detail.data.data} application={application} onApprove={onApprove} onClose={onClose} reload={() => detail.refetch()} />}
  </dialog>;
}

function ReviewForm({ data, application, onApprove, onClose, reload }) {
  const [rows, setRows] = useState(() => makeSubjectRows(data.proposed_subjects ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [regularConfirmed, setRegularConfirmed] = useState(false);
  const declaredRegular = Boolean(data.is_regular_student);
  const declaredIrregular = data.is_regular_student != null && !declaredRegular;
  const inherited = data.subject_load;
  const legacy = !inherited && !data.proposed_subjects?.length;
  const approve = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await onApprove(application, { expected_revision: inherited?.revision ?? 0,
        ...(!declaredRegular ? { confirm_regular_student: regularConfirmed } : {}),
        ...(!inherited ? { subjects: subjectPayload(rows) } : {}) });
      if (!result.ok) setError(result.message);
      else onClose();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <form className={styles.modal} onSubmit={approve} aria-busy={busy}>
    <h2 id="application-review-title">Review {application.block}</h2>
    <p>{application.name} · {application.email}</p>
    <p className={styles.hint}>{data.school_year} · Semester {data.semester} · {data.program} · Year {data.year_level}</p>
    {application.motivation && <p>{application.motivation}</p>}
    {declaredRegular ? <p className={styles.hint}>The applicant declared they are a regular student. Approval automatically enrolls the mayor in the complete block load.</p>
      : declaredIrregular ? <p className={styles.error}>This applicant is not a regular student and cannot be appointed mayor.</p>
        : <label className={styles.declaration}><input type="checkbox" checked={regularConfirmed} onChange={(event) => setRegularConfirmed(event.target.checked)} disabled={busy} />I have verified this legacy applicant is a regular student and will take the complete block load.</label>}
    {data.eligibility && !data.eligibility.allowed && <p className={styles.error} role="alert">{data.eligibility.reason}</p>}
    {inherited ? <><h3>Approved shared load · Revision {inherited.revision}</h3><p className={styles.hint}>This block will inherit the current approved load. To change subjects for all matching blocks, use School Year → Shared subject loads.</p><SubjectLoadList subjects={inherited.subjects} /></>
      : legacy ? <p className={styles.error}>This older application has no subject proposal. Establish the load in <Link to="/admin" onClick={onClose}>School Year → Shared subject loads</Link> before approving.</p>
        : <><p className={styles.hint}>Review and correct this first proposal before approval. The approved load will apply to every {data.program} Year {data.year_level} block in this term.</p><SubjectLoadEditor value={rows} onChange={setRows} disabled={busy} idPrefix="review-load" /></>}
    {!inherited && !legacy && subjectRowsError(rows) && <p className={styles.error} role="status">{subjectRowsError(rows)}</p>}
    {error && <div role="alert" className={styles.error}>{error} <button type="button" className="btn ghost" disabled={busy} onClick={reload}>Reload review</button></div>}
    <div className={styles.actions}><button type="button" className="btn ghost" disabled={busy} onClick={onClose}>Cancel</button><button className="btn" type="submit" disabled={busy || legacy || declaredIrregular || (!declaredRegular && !regularConfirmed) || data.eligibility?.allowed === false || (!inherited && Boolean(subjectRowsError(rows)))}>{busy ? 'Approving…' : 'Approve mayor and load'}</button></div>
  </form>;
}
