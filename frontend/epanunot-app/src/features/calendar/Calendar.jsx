import { useMemo, useState } from 'react';
import styles from './Calendar.module.css';
import DatePicker from '../../components/DatePicker';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import AnimatedList from '../../components/AnimatedList.jsx';
import { unfinishedFirst, validDeadline } from '../../components/taskListUtils.js';
import { useTasks } from '../../context/TaskContext.jsx';

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
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_KEY = toKey(TODAY);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUBJECTS = ['Other'];
const VIEWS = [
{ id: 'month', label: 'Month' },
{ id: 'week', label: 'Week' },
{ id: 'agenda', label: 'Agenda' },
];

/* ---------- initial calendar state ---------- */
const SEED_EVENTS = [];

const EMPTY_FORM = { title: '', date: TODAY_KEY, start: '09:00', end: '10:00', subject: SUBJECTS[0] };

function chipClass(item) {
if (item.kind === 'task') return styles.chipTask;
return item.type === 'personal' ? styles.chipPersonal : styles.chipClass;
}

export default function Calendar({ user }) {
const isMayor = user?.role === 'mayor';

const [view, setView] = useState('month');
const [cursor, setCursor] = useState(TODAY);
const [selected, setSelected] = useState(TODAY_KEY);

const [events, setEvents] = useState(SEED_EVENTS);
// Tasks and to-dos come from the store shared with the Dashboard.
// Mayor-assigned tasks (personal: false) are the class tasks + calendar entries;
// the student's own tasks (personal: true) are the "My to-dos".
const { tasks: allTasks, addTask, toggleTask, deleteTask } = useTasks();
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

const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}, [cursor]);

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
    if (panel === type) {
    setPanel(null);
    return;
    }
    setForm({ ...EMPTY_FORM, date: type === 'task' && selected < today ? today : selected });
    setError('');
    setPanel(type);
};

const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

const finishForm = () => {
    setSelected(form.date);
    setCursor(fromKey(form.date));
    setPanel(null);
};

const submitEvent = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please add a title.');
    if (form.end <= form.start) return setError('End time must be after the start time.');
    setEvents((prev) => [
    ...prev,
    { id: uid(), title: form.title.trim(), date: form.date, start: form.start, end: form.end, subject: '', type: 'personal' },
    ]);
    finishForm();
};

const submitTask = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please add a title.');
    if (!validDeadline(form.date, toKey(new Date()))) return setError('Choose today or a future date for the deadline.');
    addTask({ title: form.title, subject: form.subject, date: form.date, by: user?.name, personal: false });
    finishForm();
};

const deleteItem = (item) => {
    if (item.kind === 'event') setEvents((p) => p.filter((x) => x.id !== item.id));
    else deleteTask(item.id);
};

const canDelete = (item) => (item.kind === 'event' ? item.type === 'personal' : isMayor);

const addTodo = (e) => {
    e.preventDefault();
    const text = todoText.trim();
    if (!text) return;
    addTask({ title: text, date: toKey(new Date()), by: user?.name, personal: true });
    setTodoText('');
};

const toggleTodo = toggleTask;

const deleteTodo = deleteTask;

/* ---------- small render helpers ---------- */
const itemLabel = (item) =>
    item.kind === 'task'
    ? `Task: ${item.title}`
    : `${fmtTime(item.start)} ${item.title}`;

const renderRow = (item) => (
    <li key={item.id} className={`${styles.row} ${item.done ? styles.rowDone : ''}`}>
    <span className={`${styles.rowBar} ${chipClass(item)}`} />
    <div className={styles.rowBody}>
        <span className={styles.rowTitle}>{item.title}</span>
        <span className={styles.rowMeta}>
        {item.kind === 'task'
            ? `Due${item.subject ? ` · ${item.subject}` : ''}`
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
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formBtns}>
                <button type="submit" className="btn alt">Save event</button>
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
                    {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
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
                        {t.subject ? `${t.subject} · ` : ''}{overdue ? 'Overdue, ' : 'Due '}{fmtShort(t.date)}
                        </span>
                    </div>
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
    </div>
);
}
