import { useMemo, useState } from 'react';
import styles from './Calendar.module.css';

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
const rel = (n) => toKey(addDays(TODAY, n));

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUBJECTS = ['CS 101', 'MATH 21', 'ENG 12', 'PE 2', 'NSTP 1'];
const VIEWS = [
{ id: 'month', label: 'Month' },
{ id: 'week', label: 'Week' },
{ id: 'agenda', label: 'Agenda' },
];

/* ---------- mock data (dates are relative to today) ---------- */
const SEED_EVENTS = [
{ id: 'e1', title: 'CS 101 Lecture', date: rel(0), start: '09:00', end: '10:30', subject: 'CS 101', type: 'class' },
{ id: 'e2', title: 'MATH 21 Recitation', date: rel(1), start: '13:00', end: '14:30', subject: 'MATH 21', type: 'class' },
{ id: 'e3', title: 'Group study', date: rel(2), start: '18:00', end: '19:30', subject: '', type: 'personal' },
{ id: 'e4', title: 'ENG 12 Workshop', date: rel(3), start: '10:00', end: '11:30', subject: 'ENG 12', type: 'class' },
{ id: 'e5', title: 'PE 2 Fitness test', date: rel(5), start: '07:30', end: '09:00', subject: 'PE 2', type: 'class' },
{ id: 'e6', title: 'CS 101 Lab', date: rel(-2), start: '14:00', end: '17:00', subject: 'CS 101', type: 'class' },
{ id: 'e7', title: 'Org meeting', date: rel(9), start: '16:00', end: '17:00', subject: '', type: 'personal' },
{ id: 'e8', title: 'MATH 21 Midterm review', date: rel(12), start: '15:00', end: '17:00', subject: 'MATH 21', type: 'class' },
];

const SEED_TASKS = [
{ id: 't1', title: 'Activity 3', subject: 'CS 101', date: rel(2) },
{ id: 't2', title: 'Problem Set 4', subject: 'MATH 21', date: rel(4) },
{ id: 't3', title: 'Essay draft', subject: 'ENG 12', date: rel(7) },
{ id: 't4', title: 'Reflection paper', subject: 'NSTP 1', date: rel(-1) },
];

const SEED_TODOS = [
{ id: 'd1', text: 'Buy a blue book', done: false },
{ id: 'd2', text: 'Print readings for ENG 12', done: true },
];

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
const [tasks, setTasks] = useState(SEED_TASKS);
const [doneTasks, setDoneTasks] = useState([]);
const [todos, setTodos] = useState(SEED_TODOS);
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
    tasks.forEach((t) =>
    push(t.date, { ...t, kind: 'task', done: doneTasks.includes(t.id) })
    );
    Object.values(map).forEach((list) =>
    list.sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'))
    );
    return map;
}, [events, tasks, doneTasks]);

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

const selectedItems = itemsByDay[selected] || [];
const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

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
    setForm({ ...EMPTY_FORM, date: selected });
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
    setTasks((prev) => [
    ...prev,
    { id: uid(), title: form.title.trim(), subject: form.subject, date: form.date },
    ]);
    finishForm();
};

const deleteItem = (item) => {
    if (item.kind === 'event') setEvents((p) => p.filter((x) => x.id !== item.id));
    else setTasks((p) => p.filter((x) => x.id !== item.id));
};

const canDelete = (item) => (item.kind === 'event' ? item.type === 'personal' : isMayor);

const toggleTask = (id) =>
    setDoneTasks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

const addTodo = (e) => {
    e.preventDefault();
    const text = todoText.trim();
    if (!text) return;
    setTodos((p) => [...p, { id: uid(), text, done: false }]);
    setTodoText('');
};

const toggleTodo = (id) =>
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

const deleteTodo = (id) => setTodos((p) => p.filter((t) => t.id !== id));

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
        <h1 className={styles.title}>{title}</h1>
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
                <div className="empty">Nothing scheduled this month.</div>
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
                <label className={styles.field}>
                Date
                <input type="date" value={form.date} onChange={setField('date')} />
                </label>
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
                <label className={styles.field}>
                Due date
                <input type="date" value={form.date} onChange={setField('date')} />
                </label>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formBtns}>
                <button type="submit" className="btn">Create task</button>
                <button type="button" className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
                </div>
            </form>
            )}

            <h3 className={styles.sectionLabel}>Schedule</h3>
            {selectedItems.length === 0 ? (
            <div className="empty">Nothing scheduled for this day.</div>
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
            <ul className={styles.list}>
                {sortedTasks.map((t) => {
                const done = doneTasks.includes(t.id);
                const overdue = !done && t.date < TODAY_KEY;
                return (
                    <li key={t.id} className={`${styles.todo} ${done ? styles.rowDone : ''}`}>
                    <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleTask(t.id)}
                        aria-label={`Mark ${t.title} done`}
                    />
                    <div className={styles.rowBody}>
                        <span className={styles.rowTitle}>{t.title}</span>
                        <span className={`${styles.rowMeta} ${overdue ? styles.overdue : ''}`}>
                        {t.subject} · {overdue ? 'Overdue, ' : 'Due '}{fmtShort(t.date)}
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
            </ul>
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
            <ul className={styles.list}>
                {todos.map((t) => (
                <li key={t.id} className={`${styles.todo} ${t.done ? styles.rowDone : ''}`}>
                    <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t.id)}
                    aria-label={`Mark ${t.text} done`}
                    />
                    <span className={`${styles.rowTitle} ${styles.grow}`}>{t.text}</span>
                    <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => deleteTodo(t.id)}
                    aria-label={`Delete ${t.text}`}
                    >
                    ✕
                    </button>
                </li>
                ))}
            </ul>
            )}
        </div>
        </aside>
    </div>
    </div>
);
}