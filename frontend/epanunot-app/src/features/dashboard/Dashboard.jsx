import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import TaskItem from './TaskItem.jsx';
import { daysLeft } from './dateUtils';
import { mayorTasks, announcements, PLATFORMS } from '../../data/mockData';
import BlockManagement from '../block/BlockManagement.jsx';
import styles from './Dashboard.module.css';

// Student + Mayor dashboard. (Admins use /admin instead.)
export default function Dashboard({ user }) {
  const [tasks, setTasks] = useState(mayorTasks);
  const [anns, setAnns] = useState(announcements);
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('dashboard');

  const toggle = (id) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const pending = tasks.filter((t) => !t.done);
  const assigned = tasks.filter((t) => !t.personal);
  const personal = tasks.filter((t) => t.personal);

  const addTask = (v, personalTask) => {
    if (!v.title) return;
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
        personal: personalTask,
      },
    ]);
    setModal(null);
  };

  const taskFormFields = [
    { key: 'title', label: 'Task title' },
    { key: 'due', label: 'Deadline', type: 'date' },
    { key: 'platform', label: 'Platform / Location', type: 'select', options: PLATFORMS },
  ];

  const isMayor = user.role === 'mayor';
  const isStudent = user.role === 'student';

  return (
    <div className={styles.page}>
      {view === 'block' ? (
        <BlockManagement onBack={() => setView('dashboard')} />
      ) : (
        <>
          <header className={styles.top}>
            <div>
              <h1>Hello, {user.name.split(' ')[0]}</h1>
              <p>{pending.length} tasks still open.</p>
            </div>
            {isMayor && (
              <div className={styles.headerActions}>
                <button className="btn alt" onClick={() => setModal('ann')}>New announcement</button>
                <button className="btn" onClick={() => setModal('task')}>Assign task</button>
                <button className="btn alt" onClick={() => setView('block')}>Manage block</button>
              </div>
            )}
            {isStudent && (
              <button className="btn" onClick={() => setModal('mine')}>Add personal task</button>
            )}
          </header>

          <div className={styles.stats}>
            <div className={styles.stat}><strong>{pending.length}</strong>open tasks</div>
            <div className={styles.stat}><strong>{tasks.filter((t) => t.done).length}</strong>completed</div>
            <div className={styles.stat}><strong>{pending.filter((t) => daysLeft(t.due) <= 1).length}</strong>due within a day</div>
          </div>

          <section className={styles.section}>
            <h3>{isMayor ? 'Tasks you assigned' : 'Tasks from your mayor'}</h3>
            {assigned.length === 0 ? (
              <div className="empty">Nothing assigned yet.</div>
            ) : (
              <div className={styles.list}>
                {[...assigned].sort((a, b) => a.due - b.due).map((t) => (
                  <TaskItem key={t.id} t={t} onToggle={isStudent ? toggle : null} />
                ))}
              </div>
            )}
          </section>

          {isStudent && (
            <section className={styles.section}>
              <h3>My personal tasks</h3>
              {personal.length === 0 ? (
                <div className="empty">No personal tasks. Add one to track your own work.</div>
              ) : (
                <div className={styles.list}>
                  {personal.map((t) => <TaskItem key={t.id} t={t} onToggle={toggle} />)}
                </div>
              )}
            </section>
          )}

          <section className={styles.section}>
            <h3>Announcements</h3>
            {anns.map((a) => (
              <div className={styles.ann} key={a.id}>
                <strong>{a.title}</strong>
                <div>{a.body}</div>
              </div>
            ))}
          </section>

          {modal === 'task' && (
            <Modal title="Assign task" fields={taskFormFields} onSave={(v) => addTask(v, false)} onClose={() => setModal(null)} />
          )}
          {modal === 'mine' && (
            <Modal title="Add personal task" fields={taskFormFields} onSave={(v) => addTask(v, true)} onClose={() => setModal(null)} />
          )}
          {modal === 'ann' && (
            <Modal
              title="New announcement"
              fields={[{ key: 'title', label: 'Title' }, { key: 'body', label: 'Message' }]}
              onSave={(v) => {
                if (v.title) setAnns([{ id: Date.now(), ...v }, ...anns]);
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          )}
        </>
      )}
    </div>
  );
}