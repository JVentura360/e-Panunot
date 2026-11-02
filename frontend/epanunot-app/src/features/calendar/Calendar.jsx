import { useMemo, useState } from 'react';
import styles from './Calendar.module.css';
import DatePicker from '../../components/DatePicker';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import AnimatedList from '../../components/AnimatedList.jsx';
import { unfinishedFirst, validDeadline } from '../../components/taskListUtils.js';
import { useTasks } from '../../context/TaskContext.jsx';
import { useSubjectChoices } from '../block/useSubjectChoices.js';
import { errorMessage } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PLATFORMS } from '../../data/mockData';
import { useCalendarEvents } from './useCalendarEvents.js';
import { gridRange } from './calendarMapper.js';

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => {
const [y, m, d] = k.split('-').map(Number);
return new Date(y, m - 1, d);
};
const addDays = (d, n) => {
const x = new Date(d);
x.setDate(x.getDate() + n);
return x;
};
const startOfWeek = (d) => addDays(d, -d.getDay());
const fmtTime = (t) => {
const [h, m] = t.split(':').map(Number);
return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtShort = (key) =>
fromKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_KEY = toKey(TODAY);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GENERAL_SUBJECT = 'All block subjects';
const VIEWS = [
{ id: 'month', label: 'Month' },
{ id: 'week', label: 'Week' },
{ id: 'agenda', label: 'Agenda' },
];

const EMPTY_FORM = { title: '', date: TODAY_KEY, start: '09:00', end: '10:00', subject: GENERAL_SUBJECT, platform: PLATFORMS[0], shareWithBlock: false, editingId: null };

function chipClass(item) {
if (item.kind === 'task') return styles.chipTask;
return item.type === 'personal' ? styles.chipPersonal : styles.chipClass;
}

export default function Calendar({ user }) {
const { choices } = useSubjectChoices(user);
const offered = choices.filter((choice) => choice.blockId === user.block_id);
const subjectOptions = [GENERAL_SUBJECT, ...offered.map((choice) => choice.label)];
const isMayor = user?.role === 'mayor';

const [view, setView] = useState('month');
const [cursor, setCursor] = useState(TODAY);
const [selected, setSelected] = useState(TODAY_KEY);

// Tasks and to-dos come from the store shared with the Dashboard.
// Mayor-assigned tasks (personal: false) are the class tasks + calendar entries;
// the student's own tasks (personal: true) are the "My to-dos".
const { tasks: allTasks, error: taskError, addTask, toggleTask, deleteTask, updateTask, removeTask } = useTasks();
const [editingTask, setEditingTask] = useState(null);
const [deletingTask, setDeletingTask] = useState(null);
const [deletingEvent, setDeletingEvent] = useState(null);
const [todoError, setTodoError] = useState('');
const tasks = useMemo(
    () => allTasks.filter((t) => !t.personal),
    [allTasks]
);
const todos = useMemo(() => allTasks.filter((t) => t.personal), [allTasks]);
const [todoText, setTodoText] = useState('');

const [panel, setPanel] = useState(null); // 'event' | 'task' | null
const [form, setForm] = useState(EMPTY_FORM);
const [error, setError] = useState('');

/* ---------- derived data ---------- */
const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}, [cursor]);

// Events come from the database (and are what Google Calendar is synced from).
const range = useMemo(() => gridRange(monthDays), [monthDays]);
const { events, loading: eventsLoading, error: eventsError, createEvent, updateEvent, removeEvent } = useCalendarEvents({
    from: range.from,
    to: range.to,
    enabled: user.role !== 'admin',
});

const itemsByDay = useMemo(() => {
    const map = {};
    const push = (key, item) => {
    (map[key] = map[key] || []).push(item);
    };
    events.forEach((e) => push(e.date, { ...e, kind: 'event' }));
    tasks.forEach((t) => push(t.date, { ...t, kind: 'task' }));
    Object.values(map).forEach((list) =>
    list.sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'))
    );
    return map;
}, [events, tasks]);

const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}, [cursor]);

const agendaDays = useMemo(() => {
    const prefix = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
    return Object.keys(itemsByDay)
    .filter((k) => k.startsWith(prefix))
    .sort();
}, [itemsByDay, cursor]);

const title =
    view === 'week'
    ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const weekStart = weekDays[0];
const weekEnd = weekDays[6];
const weekRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
const weekYear = weekStart.getFullYear() === weekEnd.getFullYear()
    ? String(weekEnd.getFullYear()) : `${weekStart.getFullYear()}–${weekEnd.getFullYear()}`;

const selectedItems = itemsByDay[selected] || [];
const sortedTasks = unfinishedFirst(tasks);
const sortedTodos = unfinishedFirst(todos);
const today = toKey(new Date());

/* ---------- actions ---------- */
const shift = (dir) => {
    if (view === 'week') setCursor(addDays(cursor, 7 * dir));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
};

const goToday = () => {
    setCursor(TODAY);
    setSelected(TODAY_KEY);
};

const openPanel = (type) => {
    if (panel === type && !form.editingId) {
    setPanel(null);
    return;
    }
    setForm({ ...EMPTY_FORM, date: type === 'task' && selected < today ? today : selected });
    setError('');
    setPanel(type);
};

const startEditEvent = (item) => {
    const choice = offered.find((c) => c.subjectId === item.subjectId);
    setForm({
    ...EMPTY_FORM,
    title: item.title,
    date: item.date,
    start: item.start,
    end: item.end,
    editingId: item.rawId,
    shareWithBlock: item.type === 'class',
    subject: choice ? choice.label : GENERAL_SUBJECT,
    });
    setError('');
    setPanel('event');
};

const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

const finishForm = () => {
    setSelected(form.date);
    setCursor(fromKey(form.date));
    setPanel(null);
};

const submitEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please add a title.');
    if (form.end <= form.start) return setError('End time must be after the start time.');
    const values = {
        title: form.title,
        date: form.date,
        start: form.start,
        end: form.end,
        shareWithBlock: isMayor && form.shareWithBlock,
        subjectId: offered.find((choice) => choice.label === form.subject)?.subjectId ?? null,
    };
    try {
        if (form.editingId) await updateEvent(form.editingId, values);
        else await createEvent(values);
    } catch (err) {
        setError(errorMessage(err));
        return;
    }
    finishForm();
};

const submitTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please add a title.');
    try {
        await addTask({
        title: form.title,
        platform: form.platform,
        subjectId: offered.find((choice) => choice.label === form.subject)?.subjectId,
        allSubjects: form.subject === GENERAL_SUBJECT,
        date: form.date,
        personal: false,
        });
    } catch (err) {
        setError(errorMessage(err));
        return;
    }
    finishForm();
};

const deleteItem = (item) => {
    if (item.kind === 'event') setDeletingEvent(item);
    else setDeletingTask(item);
};

const canDelete = (item) => (item.kind === 'event' ? item.canEdit : isMayor);

const addTodo = async (e) => {
    e.preventDefault();
    const text = todoText.trim();
    if (!text) return;
    setTodoError('');
    try {
        await addTask({ title: text, date: toKey(new Date()), personal: true });
        setTodoText('');
    } catch (err) {
        setTodoError(errorMessage(err));
    }
};

const toggleTodo = toggleTask;

const deleteTodo = deleteTask;

/* ---------- small render helpers ---------- */
const itemLabel = (item) =>
    item.kind === 'task'
    ? `Task: ${item.title}${item.platform ? ` · ${item.platform}` : ''}`
    : `${fmtTime(item.start)} ${item.title}`;

const renderRow = (item) => (
    <li key={item.id} className={`${styles.row} ${item.done ? styles.rowDone : ''}`}>
    <span className={`${styles.rowBar} ${chipClass(item)}`} />
    <div className={styles.rowBody}>
        <span className={styles.rowTitle}>{item.title}</span>
        <span className={styles.rowMeta}>
        {item.kind === 'task'
            ? `Due${item.subject ? ` · ${item.subject}` : ''}${item.platform ? ` · ${item.platform}` : ''}`
            : `${fmtTime(item.start)} – ${fmtTime(item.end)}${item.subject ? ` · ${item.subject}` : ''}`}
        </span>
    </div>
    {item.kind === 'task' && (
        <input
        type="checkbox"
        checked={item.done}
        onChange={() => toggleTask(item.id)}
        aria-label={`Mark ${item.title} done`}
        />
    )}
    {canDelete(item) && (
        <button
        type="button"
        className={styles.iconBtn}
        onClick={() => deleteItem(item)}
        aria-label={`Delete ${item.title}`}
        >
        ✕
        </button>
    )}
    {item.kind === 'task' && isMayor && (
        <button type="button" className={styles.iconBtn} onClick={() => setEditingTask(item)} aria-label={`Edit ${item.title}`}>✎</button>
    )}
    {item.kind === 'event' && item.canEdit && (
        <button type="button" className={styles.iconBtn} onClick={() => startEditEvent(item)} aria-label={`Edit ${item.title}`}>✎</button>
    )}
    </li>
);

return (
    <div className={styles.page}>
    {/* ---------- toolbar ---------- */}
    <div className={styles.toolbar}>
        <div className={styles.titleRow}>
        <div className={styles.navBtns}>
            <button type="button" className={styles.navBtn} onClick={() => shift(-1)} aria-label="Previous">‹</button>
            <button type="button" className={styles.todayBtn} onClick={goToday}>Today</button>
            <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label="Next">›</button>
        </div>
        <h1 className={`${styles.title} ${view === 'week' ? styles.weekTitle : ''}`} aria-label={view === 'week' ? `${weekRange}, ${weekYear}` : undefined}>
            {view === 'week' ? `${weekRange}, ${weekYear}` : title}
        </h1>
        </div>

        <div className={styles.viewToggle} role="group" aria-label="Calendar view">
        {VIEWS.map((v) => (
            <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            className={`${styles.viewBtn} ${view === v.id ? styles.viewBtnActive : ''}`}
            onClick={() => setView(v.id)}
            >
            {v.label}
            </button>
        ))}
        </div>
    </div>

    <div className={styles.layout}>
        {/* ---------- main calendar ---------- */}
        <section className={styles.main}>
        {view === 'month' && (
            <>
            <div className={styles.weekdays}>
                {DAY_NAMES.map((n) => (
                <span key={n}>{n}</span>
                ))}
            </div>
            <div className={styles.grid}>
                {monthDays.map((d) => {
                const key = toKey(d);
                const items = itemsByDay[key] || [];
                const inMonth = d.getMonth() === cursor.getMonth();
                return (
                    <button
                    key={key}
                    type="button"
                    aria-pressed={key === selected}
                    aria-label={`${d.toDateString()}, ${items.length} items`}
                    className={[
                        styles.cell,
                        !inMonth && styles.outside,
                        key === selected && styles.selected,
                        key === TODAY_KEY && styles.today,
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelected(key)}
                    >
                    <span className={styles.dayNum}>{d.getDate()}</span>
                    <span className={styles.chips}>
                        {items.slice(0, 2).map((it) => (
                        <span key={it.id} className={`${styles.chip} ${chipClass(it)}`}>
                            {it.title}
                        </span>
                        ))}
                        {items.length > 2 && <span className={styles.more}>+{items.length - 2} more</span>}
                    </span>
                    <span className={styles.dots}>
                        {items.slice(0, 4).map((it) => (
                        <i key={it.id} className={`${styles.dot} ${chipClass(it)}`} />
                        ))}
                    </span>
                    </button>
                );
                })}
            </div>
            </>
        )}

        {view === 'week' && (
            <div className={styles.weekGrid}>
            {weekDays.map((d) => {
                const key = toKey(d);
                const items = itemsByDay[key] || [];
                return (
                <div
                    key={key}
                    className={`${styles.weekCol} ${key === selected ? styles.weekColSelected : ''}`}
                >
                    <button
                    type="button"
                    className={`${styles.weekHead} ${key === TODAY_KEY ? styles.weekHeadToday : ''}`}
                    onClick={() => setSelected(key)}
                    aria-pressed={key === selected}
                    >
                    <span>{DAY_NAMES[d.getDay()]}</span>
                    <strong>{d.getDate()}</strong>
                    </button>
                    <div className={styles.weekItems}>
                    {items.length === 0 && <span className={styles.weekEmpty}>Nothing scheduled</span>}
                    {items.map((it) => (
                        <button
                        type="button"
                        key={it.id}
                        className={`${styles.weekItem} ${chipClass(it)} ${it.done ? styles.rowDone : ''}`}
                        onClick={() => setSelected(key)}
                        >
                        {itemLabel(it)}
                        </button>
                    ))}
                    </div>
                </div>
                );
            })}
            </div>
        )}

        {view === 'agenda' && (
            <div className={styles.agenda}>
            {agendaDays.length === 0 && (
                <PlannerEmpty>A fresh month, room for new plans.</PlannerEmpty>
            )}
            {agendaDays.map((key) => (
                <div key={key} className={styles.agendaDay}>
                <button
                    type="button"
                    className={`${styles.agendaHead} ${key === selected ? styles.agendaHeadActive : ''}`}
                    onClick={() => setSelected(key)}
                >
                    {fromKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    {key === TODAY_KEY && <span className={styles.todayTag}>Today</span>}
                </button>
                <ul className={styles.list}>{itemsByDay[key].map(renderRow)}</ul>
                </div>
            ))}
            </div>
        )}

        <div className={styles.legend}>
            <span><i className={`${styles.dot} ${styles.chipClass}`} /> Class</span>
            <span><i className={`${styles.dot} ${styles.chipPersonal}`} /> Personal</span>
            <span><i className={`${styles.dot} ${styles.chipTask}`} /> Task due</span>
        </div>
        </section>

        {/* ---------- side panel ---------- */}
        <aside className={styles.side}>
        <div className={styles.card}>
            <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
                {fromKey(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            </div>

            <div className={styles.actions}>
            <button type="button" className="btn alt" onClick={() => openPanel('event')}>
                + Event
            </button>
            {isMayor && (
                <button type="button" className="btn" onClick={() => openPanel('task')}>
                + Create task
                </button>
            )}
            </div>
            {eventsError && <p className={styles.error} role="alert">Could not load events. {errorMessage(eventsError)}</p>}
            {eventsLoading && <p className={styles.rowMeta}>Loading events…</p>}

            {panel === 'event' && (
            <form className={styles.form} onSubmit={submitEvent}>
                <label className={styles.field}>
                Title
                <input value={form.title} onChange={setField('title')} placeholder="e.g. Study session" />
                </label>
                <div className={styles.field}>
                <label htmlFor="calendar-event-date">Date</label>
                <DatePicker id="calendar-event-date" value={form.date} onChange={setField('date')} />
                </div>
                <div className={styles.fieldRow}>
                <label className={styles.field}>
                    Start
                    <input type="time" value={form.start} onChange={setField('start')} />
                </label>
                <label className={styles.field}>
                    End
                    <input type="time" value={form.end} onChange={setField('end')} />
                </label>
                </div>
                {isMayor && !form.editingId && (
                <label className={styles.check}>
                    <input
                    type="checkbox"
                    checked={form.shareWithBlock}
                    onChange={(e) => setForm((f) => ({ ...f, shareWithBlock: e.target.checked }))}
                    />
                    Class event (share with the whole block and Google Calendar)
                </label>
                )}
                {isMayor && form.shareWithBlock && (
                <label className={styles.field}>
                    Subject
                    <select value={form.subject} onChange={setField('subject')}>
                    {subjectOptions.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                    </select>
                </label>
                )}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formBtns}>
                <button type="submit" className="btn alt">{form.editingId ? 'Save changes' : 'Save event'}</button>
                <button type="button" className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
                </div>
            </form>
            )}

            {panel === 'task' && isMayor && (
            <form className={styles.form} onSubmit={submitTask}>
                <label className={styles.field}>
                Task title
                <input value={form.title} onChange={setField('title')} placeholder="e.g. Problem Set 5" />
                </label>
                <label className={styles.field}>
                Subject
                <select value={form.subject} onChange={setField('subject')}>
                    {subjectOptions.map((s) => (
                    <option key={s}>{s}</option>
                    ))}
                </select>
                </label>
                <label className={styles.field}>
                Platform or location
                <select value={form.platform} onChange={setField('platform')}>
                    {PLATFORMS.map((p) => (
                    <option key={p}>{p}</option>
                    ))}
                </select>
                </label>
                <div className={styles.field}>
                <label htmlFor="calendar-task-date">Due date</label>
                <DatePicker id="calendar-task-date" value={form.date} min={today} required onChange={setField('date')} />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formBtns}>
                <button type="submit" className="btn">Create task</button>
                <button type="button" className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
                </div>
            </form>
            )}

            <h3 className={styles.sectionLabel}>Schedule</h3>
            {selectedItems.length === 0 ? (
            <PlannerEmpty>A little breathing room. Nothing scheduled for this day.</PlannerEmpty>
            ) : (
            <ul className={styles.list}>{selectedItems.map(renderRow)}</ul>
            )}
        </div>

        <div className={styles.card}>
            <h2 className={styles.cardTitle}>To do list</h2>

            <h3 className={styles.sectionLabel}>Class tasks</h3>
            {sortedTasks.length === 0 ? (
            <div className="empty">No class tasks yet.</div>
            ) : (
            <AnimatedList className={styles.list}>
                {sortedTasks.map((t) => {
                const done = t.done;
                const overdue = !done && t.date < TODAY_KEY;
                return (
                    <li key={t.id} data-sort-id={t.id} className={`${styles.todo} ${done ? styles.rowDone : ''}`}>
                    <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleTask(t.id)}
                        aria-label={`Mark ${t.title} done`}
                    />
                    <div className={styles.rowBody}>
                        <span className={styles.rowTitle}>{t.title}</span>
                        <span className={`${styles.rowMeta} ${overdue ? styles.overdue : ''}`}>
                        {t.subject ? `${t.subject} · ` : ''}{t.platform ? `${t.platform} · ` : ''}{overdue ? 'Overdue, ' : 'Due '}{fmtShort(t.date)}
                        </span>
                    </div>
                    {isMayor && (
                        <button type="button" className={styles.iconBtn} onClick={() => setEditingTask(t)} aria-label={`Edit ${t.title}`}>✎</button>
                    )}
                    {isMayor && (
                        <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => deleteItem({ ...t, kind: 'task' })}
                        aria-label={`Delete ${t.title}`}
                        >
                        ✕
                        </button>
                    )}
                    </li>
                );
                })}
            </AnimatedList>
            )}

            <h3 className={styles.sectionLabel}>My to-dos</h3>
            <form className={styles.todoForm} onSubmit={addTodo}>
            <input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="Add a to-do…"
                aria-label="New to-do"
            />
            <button type="submit" className="btn alt">Add</button>
            </form>
            {todoError && <p className={styles.error}>{todoError}</p>}
            {taskError && <p className={styles.error} role="alert">{taskError}</p>}
            {todos.length === 0 ? (
            <div className="empty">You're all caught up.</div>
            ) : (
            <AnimatedList className={styles.list}>
                {sortedTodos.map((t) => (
                <li key={t.id} data-sort-id={t.id} className={`${styles.todo} ${t.done ? styles.rowDone : ''}`}>
                    <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t.id)}
                    aria-label={`Mark ${t.title} done`}
                    />
                    <span className={`${styles.rowTitle} ${styles.grow}`}>{t.title}</span>
                    <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => deleteTodo(t.id)}
                    aria-label={`Delete ${t.title}`}
                    >
                    ✕
                    </button>
                </li>
                ))}
            </AnimatedList>
            )}
        </div>
        </aside>
    </div>
        {editingTask && (
            <Modal
                title="Edit task"
                description="Change the title, deadline or platform. To change the subject, delete this task and assign it again."
                submitLabel="Save changes"
                fields={[
                { key: 'title', label: 'Task title', required: true },
                { key: 'due', label: 'Deadline', type: 'date', required: true },
                { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
                ]}
                initialValues={{ title: editingTask.title, due: editingTask.date, platform: editingTask.platform || PLATFORMS[0] }}
                onSave={async (values) => {
                await updateTask(editingTask.id, { title: values.title, date: values.due, platform: values.platform });
                setEditingTask(null);
                }}
                onClose={() => setEditingTask(null)}
            />
        )}

        {deletingEvent && (
            <ConfirmDialog
                title="Delete this event?"
                message={deletingEvent.type === 'class'
                    ? `"${deletingEvent.title}" will be removed for everyone in your block and from the block's Google Calendar.`
                    : `"${deletingEvent.title}" will be deleted.`}
                confirmLabel="Delete"
                onCancel={() => setDeletingEvent(null)}
                onConfirm={async () => {
                await removeEvent(deletingEvent.rawId);
                setDeletingEvent(null);
                }}
            />
        )}

        {deletingTask && (
            <ConfirmDialog
                title="Delete this task?"
                message={`"${deletingTask.title}" will be removed for everyone in your block, including their completion records.`}
                confirmLabel="Delete"
                onCancel={() => setDeletingTask(null)}
                onConfirm={async () => {
                await removeTask(deletingTask.id);
                setDeletingTask(null);
                }}
            />
        )}
    </div>
);
}
