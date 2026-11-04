import AnimatedList from '../../components/AnimatedList.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal.jsx';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import ApplyMayorModal from '../navigation/ApplyMayorModal.jsx';
import TaskItem from './TaskItem.jsx';
import { daysLeft } from './dateUtils';
import { PLATFORMS } from '../../data/mockData';
import { useApiQuery } from '../../api/useApiQuery.js';
import { api } from '../../api/client.js';
import { useTasks } from '../../context/TaskContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import styles from './Dashboard.module.css';
import { useSubjectChoices } from '../block/useSubjectChoices.js';
import { applicationEligibility } from '../block/enrollmentRules.js';
import AnnouncementDialog from './AnnouncementDialog.jsx';
import DailyQuote from './DailyQuote.jsx';
import { useOffline } from '../../offline/useOffline.js';
import { blockLabel, shortDate, readSeen, writeSeen } from './announcementUtils.js';

export default function Dashboard({ user }) {
  const { online } = useOffline();
  const { tasks, error: taskError, addTask: saveTask, toggleTask: toggle, updateTask, removeTask } = useTasks();
  const annQuery = useApiQuery('/announcements', { enabled: online && Boolean(user.block_id) });
  const anns = annQuery.data?.data ?? [];
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('open');
  const [editingAnn, setEditingAnn] = useState(null);
  const [deletingAnn, setDeletingAnn] = useState(null);
  const [viewingAnn, setViewingAnn] = useState(null);
  const [seenAnns, setSeenAnns] = useState(() => readSeen(user.id));
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const isMayor = user.role === 'mayor';
  // Announcements this user hasn't seen yet (excluding their own) pop up one at a time.
  const nextNewAnn = anns.find((a) => !seenAnns.has(a.id) && !(a.created_by?.id != null && a.created_by.id === user.id));
  const noOtherDialog = !modal && !editingAnn && !deletingAnn && !editingTask && !deletingTask;
  const dialogAnn = viewingAnn ?? (noOtherDialog ? nextNewAnn : null);
  const closeAnnDialog = () => {
    if (dialogAnn) {
      const next = new Set(seenAnns).add(dialogAnn.id);
      setSeenAnns(next);
      writeSeen(user.id, next);
    }
    setViewingAnn(null);
  };
  const eligibility = applicationEligibility(user);
  const { choices } = useSubjectChoices(user);
  const offered = choices.filter((choice) => choice.blockId === user.block_id);
  const needsBlock = user.role === 'student' && !user.block_id;
  const pendingJoin = user.pending_join_request;
  const pending = tasks.filter((task) => !task.done);
  const completed = tasks.length - pending.length;
  const dueSoon = pending.filter((task) => daysLeft(task.due) <= 1).length;
  const matchesFilter = (task) => filter === 'all' || (filter === 'open' ? !task.done : task.done);
  const assigned = tasks.filter((task) => !task.personal && matchesFilter(task))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const personal = tasks.filter((task) => task.personal && matchesFilter(task));

  const addTask = async (values, personalTask) => {
    await saveTask({
      title: values.title, date: values.due, platform: values.platform,
      personal: personalTask,
      subjectId: offered.find((choice) => choice.label === values.subject)?.subjectId,
      allSubjects: !personalTask && values.subject === 'All block subjects',
    });
    setFilter('open');
    setModal(null);
  };
  const taskFields = [
    { key: 'title', label: 'Task title', placeholder: 'e.g. Submit your laboratory report', required: true },
    { key: 'due', label: 'Deadline', type: 'date', required: true, disallowPast: true },
    { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
    ...(isMayor && modal !== 'mine' ? [{ key: 'subject', label: 'Subject', type: 'select', options: ['All block subjects', ...offered.map((choice) => choice.label)] }] : []),
  ];

  return (
    <div className={styles.page}>
      {modal === 'apply' && <ApplyMayorModal user={user} onClose={() => setModal(null)} />}
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{user.block && user.block !== '-' ? user.block : 'Your workspace'} <span> / </span> Overview</p>
          <DailyQuote userId={user.id} heading />
        </div>
        <div className={styles.headerActions}>
          {isMayor && <button data-online-only className="btn alt" onClick={() => setModal('ann')}>New Announcement</button>}
          <button className="btn" onClick={() => setModal(isMayor && online ? 'task' : 'mine')}>{isMayor && online ? 'Assign a Task' : 'Add personal task'}</button>
        </div>
      </header>

      {taskError && <p role="alert" className={styles.error}>{taskError}</p>}

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
            <h3>{needsBlock ? pendingJoin ? 'Join request' : 'Find your block' : isMayor ? 'Assigned to your block' : 'From your mayor'} {!needsBlock && <span>{assigned.length}</span>}</h3>
            {needsBlock ? (
              <PlannerEmpty>
                {pendingJoin ? <>
                  <h4 className={styles.blockTitle}>Waiting for mayor approval.</h4>
                  <p>Your request to join {pendingJoin.block_code} is pending. Your ledger will open after approval.</p>
                  <Link className="btn" to="/join-block">View request</Link>
                </> : <>
                <h4 className={styles.blockTitle}>Join your class block.</h4>
                <p>Request to join your class block, or apply as mayor to create a block.</p>
                <div className={styles.blockActions}>
                  <Link className="btn" to="/join-block">Join a Block</Link>
                  <button data-online-only type="button" className="btn alt" disabled={!eligibility.allowed} title={eligibility.reason || undefined} onClick={() => setModal('apply')}>Apply as Mayor</button>
                </div>
                {!eligibility.allowed && <p>{eligibility.reason}</p>}
                </>}
              </PlannerEmpty>
            ) : assigned.length ? <AnimatedList className={styles.list}>{assigned.map((task) => <TaskItem key={task.id} t={task} onToggle={toggle} onEdit={isMayor ? setEditingTask : undefined} onDelete={isMayor ? setDeletingTask : undefined} />)}</AnimatedList> : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'All caught up. A little breathing room.'}</PlannerEmpty>}
          </section>
          {(!isMayor || !online) && <section className={styles.section}>
            <h3>Personal tasks <span>{personal.length}</span></h3>
            {personal.length ? <AnimatedList className={styles.list}>{personal.map((task) => <TaskItem key={task.id} t={task} onToggle={toggle} />)}</AnimatedList> : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'A fresh page for your own plans.'}{filter !== 'done' && <button className={styles.inlineAction} onClick={() => setModal('mine')}>Add your first task</button>}</PlannerEmpty>}
          </section>}
        </div>

        {online && <aside className={styles.noticePanel}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The block board</p><h2>Announcements</h2></div><span className={styles.count}>{anns.length}</span></div>
          {anns.length ? anns.map((announcement, index) => (
            <article className={styles.ann} key={announcement.id} onClick={() => setViewingAnn(announcement)}>
              <span className={styles.annIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.annMeta}>
                <span className={announcement.subject ? styles.annTag : `${styles.annTag} ${styles.annTagBlock}`}>
                  {announcement.subject ? announcement.subject.code : 'Whole block'}
                </span>
                {announcement.block && <span className={styles.annBlock}>{blockLabel(announcement.block)}</span>}
              </div>
              <h3><button type="button" className={styles.annTitle}>{announcement.title}</button></h3>
              <p className={styles.annText}>{announcement.description}</p>
              <small className={styles.annBy}>
                {announcement.created_by?.name && `${announcement.created_by.name} · `}{shortDate(announcement.created_at)}
              </small>
              {isMayor && (
                <div className={styles.annActions}>
                  <button type="button" className={styles.inlineAction} onClick={(e) => { e.stopPropagation(); setEditingAnn(announcement); }}>Edit</button>
                  <button type="button" className={styles.inlineAction} onClick={(e) => { e.stopPropagation(); setDeletingAnn(announcement); }}>Delete</button>
                </div>
              )}
            </article>
          )) : <div className="empty">No announcements yet.</div>}
          <div className={styles.note}><strong>Stay in the loop.</strong><p>Check your block board for updates before planning your day.</p><Link className={styles.textLink} to="/concerns">{isMayor ? 'Review student concerns' : 'Have a concern? Let’s talk'}</Link></div>
        </aside>}
      </div>

      {(modal === 'task' || modal === 'mine') && <Modal title={modal === 'task' ? 'Assign a Task' : 'Add a personal task'} description={modal === 'task' ? 'Give your block a clear task and deadline.' : 'Keep your own deadlines alongside your class tasks.'} submitLabel={modal === 'task' ? 'Assign task' : 'Add task'} fields={taskFields} onSave={(values) => addTask(values, modal === 'mine')} onClose={() => setModal(null)} />}
      {modal === 'ann' && (
      <Modal
        title="New Announcement"
        description="Share an update with your block."
        submitLabel="Post announcement"
        fields={[
          { key: 'title', label: 'Title', required: true },
          { key: 'description', label: 'Message', type: 'textarea', required: true },
          { key: 'audience', label: 'Audience', type: 'select', options: ['Whole block', ...offered.map((c) => c.label)] },
        ]}
        onSave={async (values) => {
          const subjectId = offered.find((c) => c.label === values.audience)?.subjectId;
          await api('/announcements', {
            method: 'POST',
            body: {
              title: values.title,
              description: values.description,
              ...(subjectId ? { subject_id: subjectId } : {}),
            },
          });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
    )}
    {dialogAnn && <AnnouncementDialog key={dialogAnn.id} announcement={dialogAnn} onClose={closeAnnDialog} />}
      {editingAnn && (
        <Modal
          title="Edit Announcement"
          description="Update what your block sees."
          submitLabel="Save changes"
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'description', label: 'Message', type: 'textarea', required: true },
          ]}
          initialValues={{ title: editingAnn.title, description: editingAnn.description }}
          onSave={async (values) => {
            await api(`/announcements/${editingAnn.id}`, { method: 'PUT', body: values });
            setEditingAnn(null);
          }}
          onClose={() => setEditingAnn(null)}
        />
      )}

      {deletingAnn && (
        <ConfirmDialog
          title="Delete this announcement?"
          message={`"${deletingAnn.title}" will be removed for everyone in your block.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingAnn(null)}
          onConfirm={async () => {
            await api(`/announcements/${deletingAnn.id}`, { method: 'DELETE' });
            setDeletingAnn(null);
          }}
        />
      )}

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
