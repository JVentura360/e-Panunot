import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './Concerns.module.css';
import {
DEMO_STUDENT_ID,
SUBJECTS,
CATEGORIES,
STATUS_LABEL,
STATUS_KEYS,
} from './concernsData.js';

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
function ConcernList({ concerns, selectedId, viewerRole }) {
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
        {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
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
        <div className="empty">
        {concerns.length === 0
            ? isMayor
            ? 'No concerns from your block yet.'
            : "You haven't raised any concerns yet. Use New concern to start one."
            : 'No concerns match these filters.'}
        </div>
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

// ======================= ConcernThread =======================
function Actions({ concern, viewerRole, onStatus }) {
const { status } = concern;

const close = (note) => {
    if (window.confirm("Close this concern? You won't be able to reply afterward.")) {
    onStatus('closed', note);
    }
};

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
        <button type="button" className="btn alt" onClick={() => close('Student confirmed the fix and closed this concern.')}>
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
    <button type="button" className="btn ghost" onClick={() => close('Student closed this concern.')}>
        Close concern
    </button>
    </>
);
}

function ConcernThread({ concern, viewerRole, onReply, onStatus }) {
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
            {concern.attachments.map((name) => (
            <li key={name} className={styles.file}>{name}</li>
            ))}
        </ul>
        )}
    </header>

    <div className={styles.actions}>
        <Actions concern={concern} viewerRole={viewerRole} onStatus={onStatus} />
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
    </>
);
}

// ======================= NewConcernModal =======================
function NewConcernModal({ onClose, onCreate }) {
const [title, setTitle] = useState('');
const [subject, setSubject] = useState('');
const [category, setCategory] = useState('');
const [description, setDescription] = useState('');
const [files, setFiles] = useState([]); // file names only: no real upload in the prototype
const fileInput = useRef(null);

useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
}, [onClose]);

const addFiles = (e) => {
    const names = Array.from(e.target.files).map((f) => f.name);
    setFiles((prev) => [...prev, ...names.filter((n) => !prev.includes(n))]);
    e.target.value = '';
};

const submit = (e) => {
    e.preventDefault();
    onCreate({
    title: title.trim(),
    subject,
    category,
    description: description.trim(),
    attachments: files,
    });
};

return (
    <div
    className={styles.overlay}
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
    <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-concern-title" onSubmit={submit}>
        <h2 id="new-concern-title">New concern</h2>

        <div className={styles.field}>
        <label htmlFor="nc-title">Title</label>
        <input id="nc-title" className={styles.input} value={title} maxLength={100} required autoFocus
            placeholder="Short summary of the issue" onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className={styles.row2}>
        <div className={styles.field}>
            <label htmlFor="nc-subject">Subject</label>
            <select id="nc-subject" className={styles.input} value={subject} required onChange={(e) => setSubject(e.target.value)}>
            <option value="" disabled>Select a subject</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
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
            {files.map((name) => (
                <li key={name} className={styles.file}>
                {name}
                <button type="button" className={styles.chipRemove} aria-label={`Remove ${name}`}
                    onClick={() => setFiles((prev) => prev.filter((n) => n !== name))}>×</button>
                </li>
            ))}
            </ul>
        )}
        <div>
            <button type="button" className="btn ghost" onClick={() => fileInput.current?.click()}>Add attachment</button>
            <input ref={fileInput} type="file" multiple hidden onChange={addFiles} />
        </div>
        </div>

        <div className={styles.modalActions}>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn">Send concern</button>
        </div>
    </form>
    </div>
);
}

// ======================= Page =======================
// Mounted at path="/concerns/*": the splat holds the concern id, if any.
// Desktop shows list + thread side by side; mobile shows one at a time (see CSS).
export default function Concerns({ user, concerns, setConcerns }) {
const navigate = useNavigate();
const { '*': splat } = useParams();
const selectedId = splat ? splat.replace(/\/$/, '') : null;

const isMayor = user.role === 'mayor';
const viewerRole = isMayor ? 'mayor' : 'student';
const uid = user.id ?? DEMO_STUDENT_ID;
const displayName = user.name ?? (isMayor ? 'Block mayor' : 'Student');

// Students only see their own concerns; the mayor sees the whole block's.
const visible = useMemo(
    () => (isMayor ? concerns : concerns.filter((c) => c.studentId === uid || c.studentId === DEMO_STUDENT_ID)),
    [concerns, isMayor, uid]
);
const selected = visible.find((c) => c.id === selectedId) ?? null;

const [creating, setCreating] = useState(false);

// Opening a concern marks it as read for the current viewer.
useEffect(() => {
    if (selected && selected.unread[viewerRole]) {
    setConcerns((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, unread: { ...c.unread, [viewerRole]: false } } : c))
    );
    }
}, [selected, viewerRole, setConcerns]);

const sendReply = (id, text) => {
    const now = new Date().toISOString();
    const other = isMayor ? 'student' : 'mayor';
    setConcerns((prev) =>
    prev.map((c) =>
        c.id !== id || c.status === 'closed'
        ? c
        : {
            ...c,
            updatedAt: now,
            messages: [...c.messages, { id: `m-${Date.now()}`, role: viewerRole, authorName: displayName, text, at: now }],
            unread: { ...c.unread, [other]: true },
            }
    )
    );
};

const changeStatus = (id, status, note) => {
    const now = new Date().toISOString();
    const other = isMayor ? 'student' : 'mayor';
    setConcerns((prev) =>
    prev.map((c) =>
        c.id !== id
        ? c
        : {
            ...c,
            status,
            updatedAt: now,
            messages: [...c.messages, { id: `m-${Date.now()}`, role: 'system', text: note, at: now }],
            unread: { ...c.unread, [other]: true },
            }
    )
    );
};

const createConcern = (form) => {
    const now = new Date().toISOString();
    const id = `c-${Date.now()}`;
    setConcerns((prev) => [
    {
        id,
        ...form,
        status: 'open',
        studentId: uid,
        studentName: displayName,
        createdAt: now,
        updatedAt: now,
        messages: [],
        unread: { student: false, mayor: true },
    },
    ...prev,
    ]);
    setCreating(false);
    navigate(`/concerns/${id}`);
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

    <div className={`${styles.shell} ${selectedId ? styles.hasSelection : ''}`}>
        <section className={styles.listPane} aria-label="Concerns list">
        <ConcernList concerns={visible} selectedId={selectedId} viewerRole={viewerRole} />
        </section>

        <section className={styles.threadPane} aria-label="Concern details">
        {selected ? (
            <ConcernThread
            key={selected.id}
            concern={selected}
            viewerRole={viewerRole}
            onReply={(text) => sendReply(selected.id, text)}
            onStatus={(status, note) => changeStatus(selected.id, status, note)}
            />
        ) : (
            <div className={styles.paneEmpty}>
            <div className="empty">
                {selectedId
                ? "This concern doesn't exist or isn't available to you."
                : 'Select a concern to read the conversation.'}
            </div>
            {selectedId && (
                <button type="button" className={`btn ghost ${styles.back}`} onClick={() => navigate('/concerns')}>
                Back to concerns
                </button>
            )}
            </div>
        )}
        </section>
    </div>

    {creating && <NewConcernModal onClose={() => setCreating(false)} onCreate={createConcern} />}
    </div>
    );
}