import { useMemo, useState } from 'react';
import TaskCalendarLink from './TaskCalendarLink.jsx';
import styles from './Calendar.module.css';
import DatePicker from '../../components/DatePicker';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import { Pencil, Trash } from '../../components/icons.jsx';
import { useTasks } from '../../context/TaskContext.jsx';
import { useSubjectChoices } from '../block/useSubjectChoices.js';
import { errorMessage } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PLATFORMS } from '../../data/mockData';
import { useCalendarEvents } from './useCalendarEvents.js';
import { gridRange } from './calendarMapper.js';
import { useOffline } from '../../offline/useOffline.js';
import { requireOnline } from '../../offline/runtime.js';
import GoogleCalendarButtons from './GoogleCalendarButton.jsx';
import { useToday } from '../dashboard/useToday.js';

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
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtShort = (key) =>
  fromKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GENERAL_SUBJECT = 'All block subjects';
const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
];

// The date is always set when a panel opens, so '' is never shown.
const EMPTY_FORM = { title: '', date: '', time: '23:59', start: '09:00', end: '10:00', subject: GENERAL_SUBJECT, platform: PLATFORMS[0], shareWithBlock: false, editingId: null };

function chipClass(item) {
  if (item.kind === 'task') return item.personal ? styles.chipPersonal : styles.chipTask;
  return item.type === 'personal' ? styles.chipPersonal : styles.chipClass;
}

export default function Calendar({ user }) {
  const { online } = useOffline();
  const todayKey = toKey(useToday());
  const { choices } = useSubjectChoices(user);
  const offered = choices.filter((choice) => choice.blockId === user.block_id);
  const subjectOptions = [GENERAL_SUBJECT, ...offered.map((choice) => choice.label)];
  const isMayor = user?.role === 'mayor';

  const [view, setView] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? 'agenda' : 'month'
  );
  const [cursor, setCursor] = useState(startOfDay);
  const [selected, setSelected] = useState(() => toKey(new Date()));

  // Tasks come from the store shared with the Dashboard. Class tasks and the
  // student's own tasks both show on the calendar.
  const { tasks: allTasks, error: taskError, addTask, toggleTask, updateTask, removeTask } = useTasks();
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [addingPersonal, setAddingPersonal] = useState(false);

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
    enabled: online && user.role !== 'admin',
  });

  const itemsByDay = useMemo(() => {
    const map = {};
    const push = (key, item) => {
      (map[key] = map[key] || []).push(item);
    };
    (online ? events : []).forEach((e) => push(e.date, { ...e, kind: 'event' }));
    allTasks.forEach((t) => push(t.date, { ...t, kind: 'task' }));
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'))
    );
    return map;
  }, [events, allTasks, online]);

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
  const today = todayKey;

  const nowDate = new Date();
  const openTasks = allTasks.filter((t) => !t.done);
  const overdue = openTasks.filter((t) => t.due < nowDate).sort((a, b) => a.due - b.due);
  const upcoming = openTasks.filter((t) => t.due >= nowDate).sort((a, b) => a.due - b.due).slice(0, 3);
  const jumpTo = (key) => { setSelected(key); setCursor(fromKey(key)); };

  /* ---------- actions ---------- */
  const shift = (dir) => {
    if (view === 'week') setCursor(addDays(cursor, 7 * dir));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  const goToday = () => {
    setCursor(startOfDay());
    setSelected(toKey(new Date()));
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
        time: form.time,
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

  const canDelete = (item) => (item.kind === 'event' ? item.canEdit : !item.personal && isMayor);

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
            ? `Due${item.time ? ` ${fmtTime(item.time)}` : ''}${item.subject ? ` · ${item.subject}` : ''}${item.platform ? ` · ${item.platform}` : ''}`
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
      {item.kind === 'task' && !item.personal && isMayor && (
        <button type="button" className={styles.iconBtn} data-online-only
          onClick={() => setEditingTask(item)} aria-label={`Edit ${item.title}`}><Pencil /></button>
      )}
      {item.kind === 'event' && item.canEdit && (
        <button type="button" className={styles.iconBtn} data-online-only
          onClick={() => startEditEvent(item)} aria-label={`Edit ${item.title}`}><Pencil /></button>
      )}
      {canDelete(item) && (
        <button type="button" className={`${styles.iconBtn} ${styles.iconDanger}`} data-online-only
          onClick={() => deleteItem(item)} aria-label={`Delete ${item.title}`}><Trash /></button>
      )}
      {(user.role === 'student' || isMayor) && (item.kind === 'event' || (item.kind === 'task' && !item.personal)) && (
        <div className={styles.studentCalendarAction}>
          <TaskCalendarLink task={item} email={user.email} className="btn ghost" />
        </div>
      )}
    </li>
  );

  const tools = (
    <>
        <div className={styles.actions}>
        <button type="button" className="btn alt" data-online-only onClick={() => { requireOnline(); openPanel('event'); }}>
            + Event
        </button>
        <button type="button" className="btn alt" onClick={() => setAddingPersonal(true)}>
            + Personal task
        </button>
        {isMayor && (
            <button type="button" className="btn" data-online-only onClick={() => { requireOnline(); openPanel('task'); }}>
            + Create task
            </button>
        )}
        </div>
        <div data-online-only><GoogleCalendarButtons user={user} choices={choices} /></div>
        {eventsError && <p className={styles.error} role="alert">Could not load events. {errorMessage(eventsError)}</p>}
        {eventsLoading && <p className={styles.rowMeta}>Loading events…</p>}
        {taskError && <p className={styles.error} role="alert">{taskError}</p>}
        {panel === 'event' && (
        <form className={styles.form} onSubmit={submitEvent}>
            <label className={styles.field}>
            Title
            <input value={form.title} onChange={setField('title')} placeholder="e.g. Study session"
                autoCapitalize="sentences" autoComplete="off" enterKeyHint="next" />
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
            <input value={form.title} onChange={setField('title')} placeholder="e.g. Problem Set 5"
                autoCapitalize="sentences" autoComplete="off" enterKeyHint="next" />
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
            <label className={styles.field}>Deadline time
            <input type="time" value={form.time} required onChange={setField('time')} />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formBtns}>
            <button type="submit" className="btn">Create task</button>
            <button type="button" className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
            </div>
        </form>
        )}
</>
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

      <div className={`${styles.layout} ${view === 'agenda' ? styles.layoutSingle : ''}`}>
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
                        key === todayKey && styles.today,
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
                      className={`${styles.weekHead} ${key === todayKey ? styles.weekHeadToday : ''}`}
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
            <div className={styles.agendaTools}>{tools}</div>
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
                    {key === todayKey && <span className={styles.todayTag}>Today</span>}
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
        {view !== 'agenda' && (
        <aside className={styles.side}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>
                {fromKey(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
            </div>

            {tools}

            {(overdue.length > 0 || upcoming.length > 0) && (
              <div className={styles.deadlines}>
                {overdue.length > 0 && (
                  <button type="button" className={styles.overdueChip} onClick={() => jumpTo(overdue[0].date)}>
                    {overdue.length} overdue
                  </button>
                )}
                {upcoming.length > 0 && (
                  <>
                    <h3 className={styles.sectionLabel}>Next deadlines</h3>
                    <ul className={styles.nextList}>
                      {upcoming.map((t) => (
                        <li key={t.id}>
                          <button type="button" className={styles.nextItem} onClick={() => jumpTo(t.date)}>
                            <span>{t.title}</span>
                            <span className={styles.nextDate}>{fmtShort(t.date)}{t.time ? ` · ${fmtTime(t.time)}` : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <h3 className={styles.sectionLabel}>Schedule</h3>
            {selectedItems.length === 0 ? (
              <PlannerEmpty>A little breathing room. Nothing scheduled for this day.</PlannerEmpty>
            ) : (
              <ul className={styles.list}>{selectedItems.map(renderRow)}</ul>
            )}
          </div>
        </aside>
        )} </div>

      {editingTask && (
        <Modal
          title="Edit task"
          description="Change the title, deadline or platform. To change the subject, delete this task and assign it again."
          submitLabel="Save changes"
          fields={[
            { key: 'title', label: 'Task title', required: true },
            { key: 'due', label: 'Deadline date', type: 'date', required: true },
            { key: 'time', label: 'Deadline time', type: 'time', required: true },
            { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
          ]}
          initialValues={{ title: editingTask.title, due: editingTask.date, time: editingTask.time, platform: editingTask.platform || PLATFORMS[0] }}
          onSave={async (values) => {
            await updateTask(editingTask.id, { title: values.title, date: values.due, time: values.time, platform: values.platform });
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

      {addingPersonal && (
        <Modal
          title="Add a personal task"
          description="Keep your own deadlines alongside your class tasks."
          submitLabel="Add task"
          fields={[
            { key: 'title', label: 'Task title', required: true, autoCapitalize: 'sentences' },
            { key: 'due', label: 'Deadline date', type: 'date', required: true, disallowPast: true },
            { key: 'time', label: 'Deadline time', type: 'time', required: true },
            { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
          ]}
          initialValues={{ due: selected < today ? today : selected, time: '23:59', platform: PLATFORMS[0] }}
          onSave={async (values) => {
            await addTask({ title: values.title, date: values.due, time: values.time, platform: values.platform, personal: true });
            jumpTo(values.due);
            setAddingPersonal(false);
          }}
          onClose={() => setAddingPersonal(false)}
        />
      )}
    </div>
  );
}