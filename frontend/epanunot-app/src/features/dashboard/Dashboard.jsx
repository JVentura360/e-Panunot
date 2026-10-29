import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import TaskItem from './TaskItem.jsx';
import { daysLeft } from './dateUtils';
import { mayorTasks, announcements, PLATFORMS } from '../../data/mockData';
import styles from './Dashboard.module.css';

export default function Dashboard({ user }) {
  const [tasks, setTasks] = useState(mayorTasks);
  const [anns, setAnns] = useState(announcements);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('open');
  const isMayor = user.role === 'mayor';
  const pending = tasks.filter((task) => !task.done);
  const completed = tasks.length - pending.length;
  const dueSoon = pending.filter((task) => daysLeft(task.due) <= 1).length;
  const matchesFilter = (task) => filter === 'all' || (filter === 'open' ? !task.done : task.done);
  const assigned = tasks.filter((task) => !task.personal && matchesFilter(task))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due - b.due);
  const personal = tasks.filter((task) => task.personal && matchesFilter(task));
  const toggle = (id) => setTasks((previous) => previous.map((task) => task.id === id ? { ...task, done: !task.done } : task));

  const addTask = (values, personalTask) => {
    setTasks((previous) => [...previous, {
      id: Date.now(), title: values.title.trim(),
      due: new Date(values.due + 'T23:59:00'), platform: values.platform,
      by: user.name, done: false, personal: personalTask,
    }]);
    setFilter('open');
    setModal(null);
  };
  const taskFields = [
    { key: 'title', label: 'Task title', placeholder: 'e.g. Submit your laboratory report', required: true },
    { key: 'due', label: 'Deadline', type: 'date', required: true },
    { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{user.block && user.block !== '-' ? user.block : 'Your workspace'} <span> / </span> Overview</p>
          <h1>A little clarity for your day.</h1>
          <p>Hello, {user.name.split(' ')[0]}. Here’s what’s happening in your block.</p>
        </div>
        <div className={styles.headerActions}>
          {isMayor && <button className="btn alt" onClick={() => setModal('ann')}>New announcement</button>}
          <button className="btn" onClick={() => setModal(isMayor ? 'task' : 'mine')}>{isMayor ? 'Assign a task' : 'Add personal task'}</button>
        </div>
      </header>

      <div className={styles.stats} aria-label="Task summary">
        <div className={styles.stat}><span>To Do</span><strong>{pending.length.toString().padStart(2, '0')}</strong><small>One task at a time.</small></div>
        <div className={styles.stat}><span>Due soon</span><strong>{dueSoon.toString().padStart(2, '0')}</strong><small>Overdue, today or tomorrow</small></div>
        <div className={styles.stat}><span>Completed</span><strong>{completed.toString().padStart(2, '0')}</strong><small>{tasks.length ? Math.round(completed / tasks.length * 100) + '% of your tasks checked off' : 'Your progress starts here'}</small></div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.taskPanel}>
          <div className={styles.sectionHead}><h2>Your tasks</h2></div>
          <div className={styles.filters} role="group" aria-label="Filter tasks">
            {[['open', 'To do'], ['done', 'Completed'], ['all', 'All tasks']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? styles.activeFilter : ''} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <section className={styles.section}>
            <h3>{isMayor ? 'Assigned to your block' : 'From your mayor'} <span>{assigned.length}</span></h3>
            {assigned.length ? <div className={styles.list}>{assigned.map((task) => <TaskItem key={task.id} t={task} onToggle={isMayor ? null : toggle} />)}</div> : <div className="empty">{filter === 'done' ? 'Completed class tasks will appear here.' : 'You’re all caught up here.'}</div>}
          </section>
          {!isMayor && <section className={styles.section}>
            <h3>Personal tasks <span>{personal.length}</span></h3>
            {personal.length ? <div className={styles.list}>{personal.map((task) => <TaskItem key={task.id} t={task} onToggle={toggle} />)}</div> : <div className="empty">{filter === 'done' ? 'Your completed personal tasks will appear here.' : 'A little space for your own plans.'}{filter !== 'done' && <button className={styles.inlineAction} onClick={() => setModal('mine')}>Add your first task</button>}</div>}
          </section>}
        </div>

        <aside className={styles.noticePanel}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The block board</p><h2>Announcements</h2></div><span className={styles.count}>{anns.length}</span></div>
          {anns.length ? anns.map((announcement, index) => <article className={styles.ann} key={announcement.id}><span className={styles.annIndex}>{String(index + 1).padStart(2, '0')}</span><h3>{announcement.title}</h3><p>{announcement.body}</p></article>) : <div className="empty">No announcements yet.</div>}
          <div className={styles.note}><strong>Stay in the loop.</strong><p>Check your block board for updates before planning your day.</p><Link className={styles.textLink} to="/concerns">{isMayor ? 'Review student concerns' : 'Have a concern? Let’s talk'}</Link></div>
        </aside>
      </div>

      {(modal === 'task' || modal === 'mine') && <Modal title={modal === 'task' ? 'Assign a task' : 'Add a personal task'} description={modal === 'task' ? 'Give your block a clear task and deadline.' : 'Keep your own deadlines alongside your class tasks.'} submitLabel={modal === 'task' ? 'Assign task' : 'Add task'} fields={taskFields} onSave={(values) => addTask(values, modal === 'mine')} onClose={() => setModal(null)} />}
      {modal === 'ann' && <Modal title="New announcement" description="Share an update with your block." submitLabel="Post announcement" fields={[{ key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Message', type: 'textarea', required: true }]} onSave={(values) => { setAnns((previous) => [{ id: Date.now(), ...values }, ...previous]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}
