import { useState } from 'react';

const today = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
const daysLeft = (d) => Math.ceil((d - new Date()) / 864e5);

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
  { id: 1, name: 'Marco Santos', block: 'BSIT 3-A' },
  { id: 2, name: 'Liza Cruz', block: 'BSED 2-B' },
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
      <span className="tag platform">{t.platform || 'StepS'}</span>
      <span className="due">{left <= 0 ? 'Due today' : left === 1 ? 'Tomorrow' : fmt(t.due)}</span>
    </div>
  );
}

function Modal({ title, fields, onSave, onClose }) {
  const initialVals = fields.reduce((acc, f) => {
    if (f.type === 'select' && f.options?.length) acc[f.key] = f.options[0];
    return acc;
  }, {});

  const [vals, setVals] = useState(initialVals);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {fields.map((f) => (
          f.type === 'select' ? (
            <select key={f.key} aria-label={f.label} value={vals[f.key] || f.options[0]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
              {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input key={f.key} type={f.type || 'text'} placeholder={f.label} aria-label={f.label} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
          )
        ))}
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={() => onSave(vals)}>Save</button>
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
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const pending = tasks.filter((t) => !t.done);
  const assigned = tasks.filter((t) => !t.personal);
  const personal = tasks.filter((t) => t.personal);

  const addTask = (v, personalTask) => {
    if (!v.title) return;
    const dueDate = v.due ? new Date(v.due) : new Date();
    setTasks([...tasks, { id: Date.now(), title: v.title, due: dueDate, platform: v.platform || 'StepS', by: user.name, done: false, personal: personalTask }]);
    setModal(null);
  };

  const taskFormFields = [
    { key: 'title', label: 'Task title' },
    { key: 'due', label: 'Deadline', type: 'date' },
    { key: 'platform', label: 'Platform / Location', type: 'select', options: PLATFORMS }
  ];

  return (
    <div className="app-layout">
      {/* Sticky Compact Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <div className="brand">e<b>Panunot</b></div>
            <nav className="desktop-nav">
              <button className={`nav-tab ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
                Dashboard
              </button>
              <button className={`nav-tab ${activeTab === 'Calendar' ? 'active' : ''}`} onClick={() => setActiveTab('Calendar')}>
                {user.role === 'admin' ? 'Applications' : 'Calendar'}
              </button>
            </nav>
          </div>

          <div className="header-right">
            {/* Notification Bell */}
            <button className="icon-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notif-badge">3</span>
            </button>

            {/* Profile Dropdown */}
            <div className="profile-wrapper">
              <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
                <div className="avatar">{user.name.charAt(0)}</div>
                <div className="user-info-text">
                  <span className="user-name">{user.name}</span>
                  <span className="user-badge">{user.role}{user.block !== '-' ? ` · ${user.block}` : ''}</span>
                </div>
                <svg className={`chevron ${profileOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <strong>{user.name}</strong>
                    <span>{user.role}{user.block !== '-' ? ` · ${user.block}` : ''}</span>
                  </div>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={onLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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
                  {[...assigned].sort((a, b) => a.due - b.due).map((t) => (
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span>Dashboard</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'Calendar' ? 'active' : ''}`} onClick={() => setActiveTab('Calendar')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>{user.role === 'admin' ? 'Apps' : 'Calendar'}</span>
        </button>
      </nav>

      {modal === 'task' && <Modal title="Assign task" fields={taskFormFields} onSave={(v) => addTask(v, false)} onClose={() => setModal(null)} />}
      {modal === 'mine' && <Modal title="Add personal task" fields={taskFormFields} onSave={(v) => addTask(v, true)} onClose={() => setModal(null)} />}
      {modal === 'ann' && <Modal title="New announcement" fields={[{ key: 'title', label: 'Title' }, { key: 'body', label: 'Message' }]} onSave={(v) => { if (v.title) setAnns([{ id: Date.now(), ...v }, ...anns]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}