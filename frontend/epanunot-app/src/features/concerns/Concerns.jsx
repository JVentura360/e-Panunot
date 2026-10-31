import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './Concerns.module.css';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import { CATEGORIES, STATUS_LABEL, STATUS_KEYS } from './concernsData.js';
import { api, errorMessage, queryClient, API_BASE } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import { toConcern, toMessage } from './concernMapper.js';

// Single-file Concerns feature (prototype). Sections, in order:
// helpers, StatusTag, ConcernList, ConcernThread, NewConcernModal, Concerns (page).
// Sample data lives in concernsData.js.

// ======================= Helpers =======================
const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-PH', {
month: 'short',
day: 'numeric',
hour: 'numeric',
minute: '2-digit',
});

const formatDate = (iso) => dateFmt.format(new Date(iso));
const formatDateTime = (iso) => dateTimeFmt.format(new Date(iso));

// ======================= StatusTag =======================
function StatusTag({ status }) {
return (
    <span className={styles.tag} data-status={status}>
    {STATUS_LABEL[status]}
    </span>
);
}

// ======================= ConcernList =======================
function ConcernList({ concerns, selectedId, viewerRole, subjects }) {
const [status, setStatus] = useState('all');
const [subject, setSubject] = useState('all');
const [sort, setSort] = useState('activity');
const isMayor = viewerRole === 'mayor';

const shown = useMemo(() => {
    const key = sort === 'newest' ? 'createdAt' : 'updatedAt';
    return concerns
    .filter((c) => status === 'all' || c.status === status)
    .filter((c) => subject === 'all' || c.subject === subject)
    .sort((a, b) => new Date(b[key]) - new Date(a[key]));
}, [concerns, status, subject, sort]);

const unreadCount = concerns.filter((c) => c.unread[viewerRole]).length;

return (
    <>
    <div className={styles.filters}>
        <select className={`${styles.input} ${styles.filterSelect}`} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All statuses</option>
        {STATUS_KEYS.map((k) => (
            <option key={k} value={k}>{STATUS_LABEL[k]}</option>
        ))}
        </select>
        <select className={`${styles.input} ${styles.filterSelect}`} aria-label="Filter by subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
        <option value="all">All subjects</option>
        {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
        ))}
        </select>
        <select className={`${styles.input} ${styles.filterSelect}`} aria-label="Sort concerns" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="activity">Latest activity</option>
        <option value="newest">Newest first</option>
        </select>
    </div>

    <p className={styles.count} aria-live="polite">
        Showing {shown.length} of {concerns.length}
        {unreadCount > 0 ? `, ${unreadCount} unread` : ''}
    </p>

    {shown.length === 0 ? (
        <PlannerEmpty>
        {concerns.length === 0
            ? isMayor
            ? 'No concerns from your block yet.'
            : "You haven't raised any concerns yet. Use New concern to start one."
            : 'No concerns match these filters.'}
        </PlannerEmpty>
    ) : (
        <ul className={styles.list}>
        {shown.map((c) => {
            const unread = c.unread[viewerRole];
            const selected = c.id === selectedId;
            return (
            <li key={c.id}>
                <Link
                to={`/concerns/${c.id}`}
                className={`${styles.item} ${selected ? styles.selected : ''}`}
                data-status={c.status}
                aria-current={selected ? 'true' : undefined}
                >
                <span className={styles.itemTop}>
                    {unread && (
                    <>
                        <span className={styles.dot} aria-hidden="true" />
                        <span className={styles.srOnly}>Unread. </span>
                    </>
                    )}
                    <span className={`${styles.itemTitle} ${unread ? styles.unreadTitle : ''}`}>{c.title}</span>
                    <StatusTag status={c.status} />
                </span>
                <span className={styles.itemMeta}>{c.subject}</span>
                <span className={styles.itemBottom}>
                    <span className={styles.itemMeta}>{isMayor ? c.studentName : c.category}</span>
                    <span className={`${styles.itemDate} ${unread ? styles.itemDateUnread : ''}`}>{formatDate(c.updatedAt)}</span>
                </span>
                </Link>
            </li>
            );
        })}
        </ul>
    )}
    </>
);
}


// ==================== Attachment Preview ========================
function AttachmentPreview({ attachment, onClose }) {
const ref = useRef(null);
useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
}, []);

const url = `${API_BASE}/attachments/${attachment.id}`;
const mime = attachment.mime_type ?? '';

return (
    <dialog
    ref={ref}
    className={styles.dialog}
    aria-label={attachment.name}
    onCancel={(e) => { e.preventDefault(); onClose(); }}
    onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const b = e.currentTarget.getBoundingClientRect();
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) onClose();
    }}
    >
    <div className={`${styles.modal} ${styles.preview}`}>
        <h2>{attachment.name}</h2>
        {mime.startsWith('image/') ? (
        <img src={url} alt={attachment.name} />
        ) : mime === 'application/pdf' ? (
        <iframe src={url} title={attachment.name} />
        ) : (
        <p>No preview is available for this file type. Use Download instead.</p>
        )}
        <div className={styles.modalActions}>
        <a className="btn ghost" href={`${url}?download=1`}>Download</a>
        <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
    </div>
    </dialog>
);
}

// ======================= ConfirmDialog =======================
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
const ref = useRef(null);
useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
}, []);

return (
    <dialog
    ref={ref}
    className={styles.dialog}
    aria-labelledby="confirm-title"
    onCancel={(e) => { e.preventDefault(); onCancel(); }}
    >
    <div className={styles.modal}>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.modalActions}>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
    </div>
    </dialog>
);
}

// ======================= ConcernThread =======================
function Actions({ concern, viewerRole, onStatus, onAskClose }) {
const { status } = concern;

const close = () => onAskClose();

if (status === 'closed') {
    return <span className={styles.actionNote}>This concern is closed. Replies are turned off.</span>;
}

if (viewerRole === 'mayor') {
    if (status === 'resolved') {
    return <span className={styles.actionNote}>Waiting for the student to confirm the fix or reopen it.</span>;
    }
    return (
    <>
        <span className={styles.actionNote}>Update the status as you make progress.</span>
        {status === 'open' && (
        <button type="button" className="btn alt" onClick={() => onStatus('in_progress', 'Mayor marked this as in progress.')}>
            Mark in progress
        </button>
        )}
        <button type="button" className="btn" onClick={() => onStatus('resolved', 'Mayor marked this as resolved.')}>
        Mark resolved
        </button>
    </>
    );
}

if (status === 'resolved') {
    return (
    <>
        <span className={styles.actionNote}>The mayor marked this as resolved. Is it fixed?</span>
        <button type="button" className="btn alt" onClick={close}>
        Yes, close it
        </button>
        <button type="button" className="btn ghost" onClick={() => onStatus('in_progress', "Student reopened this concern: it isn't fixed yet.")}>
        Not fixed, reopen
        </button>
    </>
    );
}

return (
    <>
    <span className={styles.actionNote}>Reply below, or close this if you no longer need help.</span>
    <button type="button" className="btn ghost" onClick={close}>
        Close concern
    </button>
    </>
);
}

function ConcernThread({ concern, viewerRole, onReply, onStatus }) {
const [preview, setPreview] = useState(null);
const [confirmingClose, setConfirmingClose] = useState(false);
const isMayor = viewerRole === 'mayor';
const closed = concern.status === 'closed';
const [text, setText] = useState('');
const endRef = useRef(null);
const prevCount = useRef(concern.messages.length);

// Scroll to the newest message, but only when one is added (not on first open).
useEffect(() => {
    if (concern.messages.length > prevCount.current) {
    endRef.current?.scrollIntoView({ block: 'nearest' });
    }
    prevCount.current = concern.messages.length;
}, [concern.messages.length]);

const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || closed) return;
    onReply(trimmed);
    setText('');
};

const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
};

return (
    <>
    <Link to="/concerns" className={styles.back}>Back to concerns</Link>

    <header className={styles.threadHead}>
        <div className={styles.threadTitleRow}>
        <h2>{concern.title}</h2>
        <StatusTag status={concern.status} />
        </div>
        <div className={styles.facts}>
        <span><strong>Subject:</strong> {concern.subject}</span>
        <span><strong>Category:</strong> {concern.category}</span>
        {isMayor && <span><strong>Raised by:</strong> {concern.studentName}</span>}
        <span><strong>Sent:</strong> {formatDateTime(concern.createdAt)}</span>
        </div>
        <p className={styles.desc}>{concern.description}</p>
        {concern.attachments.length > 0 && (
        <ul className={styles.files} aria-label="Attachments">
            {concern.attachments.map((a) => (
            <li key={a.id} className={styles.file}>
                <button type="button" className={styles.fileLink} onClick={() => setPreview(a)}>{a.name}</button>
            </li>
            ))}
        </ul>
        )}
    </header>

    <div className={styles.actions}>
        <Actions concern={concern} viewerRole={viewerRole} onStatus={onStatus}
            onAskClose={() => setConfirmingClose(true)} />
    </div>

    <div className={styles.messages} role="log" aria-label="Replies">
        {concern.messages.length === 0 && (
        <p className={styles.noReplies}>
            {isMayor ? 'No replies yet. Send the first one below.' : "No replies yet. You'll be notified when the mayor responds."}
        </p>
        )}
        {concern.messages.map((m) =>
        m.role === 'system' ? (
            <p key={m.id} className={styles.system}>
            {m.text} <time dateTime={m.at}>{formatDateTime(m.at)}</time>
            </p>
        ) : (
            <div key={m.id} className={`${styles.msg} ${m.role === viewerRole ? styles.mine : ''}`}>
            <div className={styles.msgMeta}>
                {m.role === viewerRole ? 'You' : m.authorName}
                {m.role === 'mayor' && m.role !== viewerRole ? ' (Mayor)' : ''}
                {' – '}
                <time dateTime={m.at}>{formatDateTime(m.at)}</time>
            </div>
            <div className={styles.msgText}>{m.text}</div>
            </div>
        )
        )}
        <div ref={endRef} />
    </div>

    {!closed && (
        <form className={styles.composer} onSubmit={submit}>
        <textarea
            className={styles.input}
            aria-label="Write a reply"
            placeholder="Write a reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
        />
        <div className={styles.composerRow}>
            <span className={styles.hint}>Press Ctrl+Enter to send</span>
            <button type="submit" className="btn" disabled={!text.trim()}>Send reply</button>
        </div>
        </form>
    )}

    {preview && <AttachmentPreview attachment={preview} onClose={() => setPreview(null)} />}
    {confirmingClose && (
        <ConfirmDialog
        title="Close this concern?"
        message="You won't be able to reply afterward."
        confirmLabel="Close concern"
        onCancel={() => setConfirmingClose(false)}
        onConfirm={() => { setConfirmingClose(false); onStatus('closed'); }}
        />
    )}
    </>
);
}

// ======================= NewConcernModal =======================
function NewConcernModal({ onClose, onCreate, subjects }) {
    const MAX_FILES = 5;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
const [title, setTitle] = useState('');
const [subject, setSubject] = useState('');
const [category, setCategory] = useState('');
const [description, setDescription] = useState('');
const [files, setFiles] = useState([]);
const [error, setError] = useState('');
const [sending, setSending] = useState(false);
const fileInput = useRef(null);
const dialogRef = useRef(null);

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

const addFiles = (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = '';

    const problems = [];
    const accepted = [];
    for (const f of picked) {
        const ext = f.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) {
            problems.push(`${f.name}: only JPG, PNG, PDF, DOC and DOCX files are allowed.`);
        } else if (f.size > MAX_BYTES) {
            problems.push(`${f.name}: larger than 2 MB.`);
        } else if (!files.some((p) => p.name === f.name)) {
            accepted.push(f);
        }
    }
    if (files.length + accepted.length > MAX_FILES) {
        accepted.splice(MAX_FILES - files.length);
        problems.push(`You can attach up to ${MAX_FILES} files.`);
    }

    setFiles((prev) => [...prev, ...accepted]);
    setError(problems.join(' '));
};

const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
        await onCreate({
            title: title.trim(),
            subjectId: subject,
            category,
            description: description.trim(),
            files,
        });
    } catch (err) {
        setError(errorMessage(err));
        setSending(false);
    }
};

return (
    <dialog
    ref={dialogRef}
    className={styles.dialog}
    aria-labelledby="new-concern-title"
    onCancel={(e) => { e.preventDefault(); onClose(); }}
    onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) onClose();
    }}
    >
    <form className={styles.modal} onSubmit={submit}>
        <h2 id="new-concern-title">New concern</h2>

        <div className={styles.field}>
        <label htmlFor="nc-title">Title</label>
        <input id="nc-title" className={styles.input} value={title} maxLength={100} required
            placeholder="Short summary of the issue" onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className={styles.row2}>
        <div className={styles.field}>
            <label htmlFor="nc-subject">Subject</label>
            <select id="nc-subject" className={styles.input} value={subject} required onChange={(e) => setSubject(e.target.value)}>
            <option value="" disabled>Select a subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
        <div className={styles.field}>
            <label htmlFor="nc-category">Category</label>
            <select id="nc-category" className={styles.input} value={category} required onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        </div>

        <div className={styles.field}>
        <label htmlFor="nc-desc">Description</label>
        <textarea id="nc-desc" className={`${styles.input} ${styles.textarea}`} value={description} required
            placeholder="What happened, and what would you like the mayor to do?" onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className={styles.field}>
        <span className={styles.fieldLabel}>Attachments (optional)</span>
        {files.length > 0 && (
            <ul className={styles.files}>
            {files.map((f) => (
                <li key={f.name} className={styles.file}>
                {f.name}
                <button type="button" className={styles.chipRemove} aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((p) => p !== f))}>×</button>
                </li>
            ))}
            </ul>
        )}
        <div>
            <button type="button" className="btn ghost" onClick={() => fileInput.current?.click()}>Add attachment</button>
            <input ref={fileInput} type="file" multiple hidden onChange={addFiles} />
        </div>
        </div>

        {error && <p role="alert" className={styles.error}>{error}</p>}

        <div className={styles.modalActions}>
        <button type="button" className="btn ghost" onClick={onClose} disabled={sending}>Cancel</button>
        <button type="submit" className="btn" disabled={sending}>
            {sending ? 'Sending...' : 'Send concern'}
        </button>
        </div>
    </form>
    </dialog>
);
}

// ======================= Page =======================
// Mounted at path="/concerns/*": the splat holds the concern id, if any.
// Desktop shows list + thread side by side; mobile shows one at a time (see CSS).
export default function Concerns({ user }) {
const navigate = useNavigate();
const { '*': splat } = useParams();
const selectedId = splat ? splat.replace(/\/$/, '') : null;

const isMayor = user.role === 'mayor';
const viewerRole = isMayor ? 'mayor' : 'student';

const [creating, setCreating] = useState(false);
const [error, setError] = useState('');

// 1. Ask the backend for the concerns and subjects
const concernsQuery = useApiQuery('/concerns');
const subjectsQuery = useApiQuery('/subjects', {
    query: { block_id: user.block_id },
    enabled: !!user.block_id,
});
const subjects = subjectsQuery.data?.data ?? [];

// 2. Convert them to the shape this page uses
const concerns = useMemo(
    () => (concernsQuery.data?.data ?? []).map((row) => toConcern(row, viewerRole)),
    [concernsQuery.data, viewerRole]
);
const selected = concerns.find((c) => c.id === selectedId) ?? null;

// 3. When a concern is open, load its messages (the server also marks it read)
const messagesQuery = useApiQuery(`/concerns/${selectedId}/messages`, {
    enabled: !!selected, staleTime: 0, refetchOnMount: 'always',
});
const messages = useMemo(
    () => (messagesQuery.data?.data ?? []).map((m) => toMessage(m, selected?.studentId)),
    [messagesQuery.data, selected?.studentId]
);

// 4. Refresh the list once so the unread dot disappears
const unreadNow = selected?.unread[viewerRole];
useEffect(() => {
    if (messagesQuery.isSuccess && unreadNow) {
    queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'api' && q.queryKey[2] === '/concerns',
    });
    }
}, [messagesQuery.isSuccess, unreadNow]);

// Runs an action and shows any error from the server
const run = async (fn) => {
    setError('');
    try { return await fn(); } catch (e) { setError(errorMessage(e)); }
};

const sendReply = (id, text) =>
    run(() => api(`/concerns/${id}/messages`, { method: 'POST', body: { message_text: text } }));

const changeStatus = (id, status) =>
    run(() => api(`/concerns/${id}/status`, { method: 'PATCH', body: { status } }));

const createConcern = async (form) => {
    const body = new FormData();
    body.append('title', form.title);
    body.append('category', form.category.toLowerCase());
    body.append('description', form.description);
    if (form.subjectId) body.append('subject_id', form.subjectId);
    form.files.forEach((f) => body.append('attachments[]', f));

    const res = await api('/concerns', { method: 'POST', body });
    setCreating(false);                 // closes the pop-up
    navigate(`/concerns/${res.data.id}`);
};

return (
    <div className={styles.page}>
    <div className={styles.top}>
        <div>
        <h1>{isMayor ? 'All concerns' : 'My concerns'}</h1>
        <p>
            {isMayor
            ? 'Concerns raised by your blockmates. Reply and update their status here.'
            : 'Raise an issue with your block mayor and follow up on it here.'}
        </p>
        </div>
        {!isMayor && (
        <button type="button" className="btn" onClick={() => setCreating(true)}>New concern</button>
        )}
    </div>

    {error && <p role="alert">{error}</p>}

    <div className={`${styles.shell} ${selectedId ? styles.hasSelection : ''}`}>
        <section className={styles.listPane} aria-label="Concerns list">
        {concernsQuery.isPending ? (
            <p>Loading...</p>
        ) : (
            <ConcernList concerns={concerns} selectedId={selectedId} viewerRole={viewerRole} subjects={subjects} />
        )}
        </section>

        <section className={styles.threadPane} aria-label="Concern details">
        {selected ? (
            <ConcernThread
            key={selected.id}
            concern={{ ...selected, messages }}
            viewerRole={viewerRole}
            onReply={(text) => sendReply(selected.id, text)}
            onStatus={(status) => changeStatus(selected.id, status)}
            />
        ) : (
            <div className={styles.paneEmpty}>
            <PlannerEmpty>
                {selectedId
                ? "This concern doesn't exist or isn't available to you."
                : 'Select a concern to read the conversation.'}
            </PlannerEmpty>
            {selectedId && (
                <button type="button" className={`btn ghost ${styles.back}`} onClick={() => navigate('/concerns')}>
                Back to concerns
                </button>
            )}
            </div>
        )}
        </section>
    </div>

    {creating && <NewConcernModal subjects={subjects} onClose={() => setCreating(false)} onCreate={createConcern} />}
    </div>
);
}