import AnimatedList from '../../components/AnimatedList.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import TaskItem from './TaskItem.jsx';
import { daysLeft } from './dateUtils';
import { announcements, PLATFORMS } from '../../data/mockData';
import { useTasks } from '../../context/TaskContext.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard({ user }) {
  const { tasks, addTask: saveTask, toggleTask: toggle } = useTasks(); // shared with Calendar
  const [anns, setAnns] = useState(announcements);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('open');
  const isMayor = user.role === 'mayor';
  const pending = tasks.filter((task) => !task.done);
  const completed = tasks.length - pending.length;
  const dueSoon = pending.filter((task) => daysLeft(task.due) <= 1).length;
  const matchesFilter = (task) => filter === 'all' || (filter === 'open' ? !task.done : task.done);
  const assigned = tasks.filter((task) => !task.personal && matchesFilter(task))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const personal = tasks.filter((task) => task.personal && matchesFilter(task));

  const addTask = (values, personalTask) => {
    saveTask({
      title: values.title, date: values.due, platform: values.platform,
      by: user.name, personal: personalTask,
    });
    setFilter('open');
    setModal(null);
  };
  const taskFields = [
    { key: 'title', label: 'Task title', placeholder: 'e.g. Submit your laboratory report', required: true },
    { key: 'due', label: 'Deadline', type: 'date', required: true, disallowPast: true },
    { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{user.block && user.block !== '-' ? user.block : 'Your workspace'} <span> / </span> Overview</p>
          <h1>{isMayor ? 'A little clarity for your day.' : `Hello, ${user.name.split(' ')[0]}.`}</h1>
          <p>{isMayor ? 'Here’s what’s happening in your block.' : 'Let’s take today one task at a time.'}</p>
        </div>
        <div className={styles.headerActions}>
          {isMayor && <button className="btn alt" onClick={() => setModal('ann')}>New Announcement</button>}
          <button className="btn" onClick={() => setModal(isMayor ? 'task' : 'mine')}>{isMayor ? 'Assign a Task' : 'Add personal task'}</button>
        </div>
      </header>

      <div className={styles.stats} aria-label="Task summary">
        <div className={styles.stat}><span>To Do</span><strong>{pending.length.toString().padStart(2, '0')}</strong><small>One task at a time.</small></div>
        <div className={styles.stat}><span>Due Soon</span><strong>{dueSoon.toString().padStart(2, '0')}</strong><small>Overdue, today or tomorrow</small></div>
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
            {assigned.length ? <AnimatedList className={styles.list}>{assigned.map((task) => <TaskItem key={task.id} t={task} onToggle={isMayor ? null : toggle} />)}</AnimatedList> : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'All caught up. A little breathing room.'}</PlannerEmpty>}
          </section>
          {!isMayor && <section className={styles.section}>
            <h3>Personal tasks <span>{personal.length}</span></h3>
            {personal.length ? <AnimatedList className={styles.list}>{personal.map((task) => <TaskItem key={task.id} t={task} onToggle={toggle} />)}</AnimatedList> : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'A fresh page for your own plans.'}{filter !== 'done' && <button className={styles.inlineAction} onClick={() => setModal('mine')}>Add your first task</button>}</PlannerEmpty>}
          </section>}
        </div>

        <aside className={styles.noticePanel}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The block board</p><h2>Announcements</h2></div><span className={styles.count}>{anns.length}</span></div>
          {anns.length ? anns.map((announcement, index) => <article className={styles.ann} key={announcement.id}><span className={styles.annIndex}>{String(index + 1).padStart(2, '0')}</span><h3>{announcement.title}</h3><p>{announcement.body}</p></article>) : <div className="empty">No announcements yet.</div>}
          <div className={styles.note}><strong>Stay in the loop.</strong><p>Check your block board for updates before planning your day.</p><Link className={styles.textLink} to="/concerns">{isMayor ? 'Review student concerns' : 'Have a concern? Let’s talk'}</Link></div>
        </aside>
      </div>

      {(modal === 'task' || modal === 'mine') && <Modal title={modal === 'task' ? 'Assign a Task' : 'Add a personal task'} description={modal === 'task' ? 'Give your block a clear task and deadline.' : 'Keep your own deadlines alongside your class tasks.'} submitLabel={modal === 'task' ? 'Assign task' : 'Add task'} fields={taskFields} onSave={(values) => addTask(values, modal === 'mine')} onClose={() => setModal(null)} />}
      {modal === 'ann' && <Modal title="New Announcement" description="Share an update with your block." submitLabel="Post announcement" fields={[{ key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Message', type: 'textarea', required: true }]} onSave={(values) => { setAnns((previous) => [{ id: Date.now(), ...values }, ...previous]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}
