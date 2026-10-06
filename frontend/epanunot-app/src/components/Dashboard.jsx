import { useState } from 'react';

const today = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
const daysLeft = (d) => Math.ceil((d - new Date()) / 864e5);

// Platform options available for selection
const PLATFORMS = ['StepS', 'GradeVision', 'Face-To-Face', 'NetAcad'];

const MAYOR_TASKS = [
  { id: 1, title: 'Submit Capstone Proposal', due: today(1), by: 'Mayor Marco', platform: 'StepS', done: false },
  { id: 2, title: 'Pay class shirt contribution', due: today(4), by: 'Mayor Marco', platform: 'Face-To-Face', done: true },
  { id: 3, title: 'Lab Report 2: Data Structures', due: today(7), by: 'Mayor Marco', platform: 'GradeVision', done: false },
];
const ANNOUNCEMENTS = [
  { id: 1, title: 'No classes on Friday', body: 'Faculty meeting all day. Online modules will be posted.' },
  { id: 2, title: 'Block meeting', body: 'Monday, 1 PM at Room 204. Attendance counts.' },
];
const APPLICANTS = [
  { id: 1, name: 'Busseng Moreno', block: '31-ITE-04' },
  { id: 2, name: 'Lyka Mangarap', block: '21-ITE-04' },
];

function TaskItem({ t, onToggle }) {
  const left = daysLeft(t.due);
  return (
    <div className={`item ${left <= 1 && !t.done ? 'urgent' : ''} ${t.done ? 'done' : ''}`}>
      {onToggle && <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} aria-label={`Mark ${t.title} done`} />}
      <div className="grow">
        <div className="t">{t.title}</div>
        <div className="m">{t.personal ? 'Personal' : `Assigned by ${t.by}`}</div>
      </div>
      {/* Platform Tag */}
      <span className="tag platform">{t.platform || 'General'}</span>
      <span className="due">{left <= 0 ? 'Due today' : left === 1 ? 'Tomorrow' : fmt(t.due)}</span>
    </div>
  );
}

function Modal({ title, fields, onSave, onClose }) {
  // Pre-fill default values for selects (e.g. first option) so saving without changing default works
  const initialVals = fields.reduce((acc, f) => {
    if (f.type === 'select' && f.options?.length) {
      acc[f.key] = f.options[0];
    }
    return acc;
  }, {});

  const [vals, setVals] = useState(initialVals);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {fields.map((f) => (
          f.type === 'select' ? (
            <select
              key={f.key}
              aria-label={f.label}
              value={vals[f.key] || f.options[0]}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
            >
              {f.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              key={f.key}
              type={f.type || 'text'}
              placeholder={f.label}
              aria-label={f.label}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
            />
          )
        ))}
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => onSave(vals)}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState(MAYOR_TASKS);
  const [anns, setAnns] = useState(ANNOUNCEMENTS);
  const [apps, setApps] = useState(APPLICANTS);
  const [modal, setModal] = useState(null);

  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const pending = tasks.filter((t) => !t.done);
  const assigned = tasks.filter((t) => !t.personal);
  const personal = tasks.filter((t) => t.personal);

  const addTask = (v, personalTask) => {
  if (!v.title) return; // Only require a title

  // Fallback to today if date input was left empty
  const dueDate = v.due ? new Date(v.due) : new Date();

  setTasks([
    ...tasks,
    {
      id: Date.now(),
      title: v.title,
      due: dueDate,
      platform: v.platform || 'StepS',
      by: user.name,
      done: false,
      personal: personalTask
    }
  ]);
  setModal(null);
};

  const taskFormFields = [
    { key: 'title', label: 'Task title' },
    { key: 'due', label: 'Deadline', type: 'date' },
    { key: 'platform', label: 'Platform / Location', type: 'select', options: PLATFORMS }
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">e<b>Panunot</b></div>
        <button className="nav on">Dashboard</button>
        <button className="nav">{user.role === 'admin' ? 'Applications' : 'Calendar'}</button>
        <button className="nav">Notifications</button>
        <div className="side-foot">
          {user.name}<br />{user.role}{user.block !== '-' && ` · ${user.block}`}
          <br /><button onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <h1>Hello, {user.name.split(' ')[0]}</h1>
            <p>{user.role === 'admin' ? `${apps.length} applications waiting for review.` : `${pending.length} tasks still open.`}</p>
          </div>
          {user.role === 'mayor' && (
            <div className="row">
              <button className="btn alt" onClick={() => setModal('ann')}>New announcement</button>
              <button className="btn" onClick={() => setModal('task')}>Assign task</button>
            </div>
          )}
          {user.role === 'Student' && <button className="btn" onClick={() => setModal('mine')}>Add personal task</button>}
        </header>

        {user.role === 'admin' ? (
          <section className="section">
            <h3>Mayor applications</h3>
            {apps.length === 0 ? <div className="empty">All caught up. No applications to review.</div> : (
              <div className="list">
                {apps.map((a) => (
                  <div className="item" key={a.id}>
                    <div className="grow"><div className="t">{a.name}</div><div className="m">Applying as mayor of {a.block}</div></div>
                    <button className="btn ghost" onClick={() => setApps(apps.filter((x) => x.id !== a.id))}>Reject</button>
                    <button className="btn alt" onClick={() => setApps(apps.filter((x) => x.id !== a.id))}>Approve</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="stats">
              <div className="stat"><strong>{pending.length}</strong>open tasks</div>
              <div className="stat"><strong>{tasks.filter((t) => t.done).length}</strong>completed</div>
              <div className="stat"><strong>{pending.filter((t) => daysLeft(t.due) <= 1).length}</strong>due within a day</div>
            </div>

            <section className="section">
              <h3>{user.role === 'mayor' ? 'Tasks you assigned' : 'Tasks from your mayor'}</h3>
              {assigned.length === 0 ? <div className="empty">Nothing assigned yet.</div> : (
                <div className="list">
                  {[...assigned]
                    .sort((a, b) => a.due - b.due)
                    .map((t) => (
                      <TaskItem key={t.id} t={t} onToggle={user.role === 'Student' ? toggle : null} />
                    ))}
                </div>
              )}
            </section>

            {user.role === 'Student' && (
              <section className="section">
                <h3>My personal tasks</h3>
                {personal.length === 0 ? <div className="empty">No personal tasks. Add one to track your own work.</div> :
                  <div className="list">{personal.map((t) => <TaskItem key={t.id} t={t} onToggle={toggle} />)}</div>}
              </section>
            )}

            <section className="section">
              <h3>Announcements</h3>
              {anns.map((a) => (<div className="ann" key={a.id}><strong>{a.title}</strong><div className="m">{a.body}</div></div>))}
            </section>
          </>
        )}
      </main>

      {modal === 'task' && <Modal title="Assign task" fields={taskFormFields} onSave={(v) => addTask(v, false)} onClose={() => setModal(null)} />}
      {modal === 'mine' && <Modal title="Add personal task" fields={taskFormFields} onSave={(v) => addTask(v, true)} onClose={() => setModal(null)} />}
      {modal === 'ann' && <Modal title="New announcement" fields={[{ key: 'title', label: 'Title' }, { key: 'body', label: 'Message' }]} onSave={(v) => { if (v.title) setAnns([{ id: Date.now(), ...v }, ...anns]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}