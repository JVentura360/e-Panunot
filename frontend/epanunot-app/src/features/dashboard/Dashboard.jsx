import AnimatedList from '../../components/AnimatedList.jsx';
import { useMemo, useState } from 'react';
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
import MessageDialog from '../../components/MessageDialog.jsx';
import styles from './Dashboard.module.css';
import { useSubjectChoices } from '../block/useSubjectChoices.js';
import { applicationEligibility } from '../block/enrollmentRules.js';
import AnnouncementDialog from './AnnouncementDialog.jsx';
import DailyQuote from './DailyQuote.jsx';
import { useOffline } from '../../offline/useOffline.js';
import { readSeen, writeSeen } from './announcementUtils.js';
import AnnouncementCard from './AnnouncementCard.jsx';
import AnnouncementDialogs from './AnnouncementDialogs.jsx';
import TaskDialogs from './TaskDialogs.jsx';
import { useToday } from './useToday.js';

const dateTitle = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

export default function Dashboard({ user }) {
  const today = useToday();
  const { online } = useOffline();
  const { tasks, error: taskError, addTask: saveTask, toggleTask: toggle } = useTasks();
  const annQuery = useApiQuery('/announcements', { enabled: online && Boolean(user.block_id) });
  const anns = useMemo(
    () => [...(annQuery.data?.data ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [annQuery.data],
  );
  const latest = anns.slice(0, 4);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('open');
  const [editingAnn, setEditingAnn] = useState(null);
  const [deletingAnn, setDeletingAnn] = useState(null);
  const [viewingAnn, setViewingAnn] = useState(null);
  const [seenAnns, setSeenAnns] = useState(() => readSeen(user.id));
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [reminderResult, setReminderResult] = useState(null);
  const isMayor = user.role === 'mayor';
  // Announcements this user hasn't seen yet (excluding their own) pop up one at a time.
  const nextNewAnn = anns.find((a) => !seenAnns.has(a.id) && !(a.created_by?.id != null && a.created_by.id === user.id));
  const noOtherDialog = !modal && !reminderResult && !editingAnn && !deletingAnn && !editingTask && !deletingTask;
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
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const dueSoon = pending.filter((task) => daysLeft(task.due) <= 1).length;
  const matchesFilter = (task) => filter === 'all' || (filter === 'open' ? !task.done : task.done);
  const LIMIT = 5;
  const byDue = (a, b) => Number(a.done) - Number(b.done) || a.due - b.due;
  const assigned = tasks.filter((task) => !task.personal && matchesFilter(task)).sort(byDue);
  const personal = tasks.filter((task) => task.personal && matchesFilter(task)).sort(byDue);

  const addTask = async (values, personalTask) => {
    await saveTask({
      title: values.title, date: values.due, time: values.time, platform: values.platform,
      personal: personalTask,
      subjectId: offered.find((choice) => choice.label === values.subject)?.subjectId,
      allSubjects: !personalTask && values.subject === 'All block subjects',
    });
    setFilter('open');
    setModal(null);
  };
  const taskFields = [
    { key: 'title', label: 'Task title', placeholder: 'e.g. Submit your laboratory report', required: true },
    { key: 'due', label: 'Deadline date', type: 'date', required: true, disallowPast: true },
    { key: 'time', label: 'Deadline time', type: 'time', required: true },
    { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
    ...(isMayor && modal !== 'mine' ? [{ key: 'subject', label: 'Subject', type: 'select', options: ['All block subjects', ...offered.map((choice) => choice.label)] }] : []),
  ];

  return (
    <div className={styles.page}>
      {modal === 'remind' && <ConfirmDialog title="Send deadline reminders?"
        message="Remind students about their unfinished class tasks due within the next 24 hours."
        confirmLabel="Send reminders" onCancel={() => setModal(null)}
        onConfirm={async () => {
          const result = await api(`/blocks/${user.block_id}/deadline-reminders`, { method: 'POST' });
          setModal(null);
            setReminderResult(`${result.sent} in-app reminder(s) sent to ${result.students} student(s).${result.failed ? ` ${result.failed} failed.` : ''} ${result.push_enabled_students ?? 0} student(s) have push enabled.${result.push_unregistered_students ? ` ${result.push_unregistered_students} need to enable Deadline alerts in Settings on this device and website address.` : ''}${result.push_configured === false ? ' Server push is not configured.' : ''}`);
        }} />}
      {reminderResult && <MessageDialog title="Deadline reminders" message={reminderResult} onClose={() => setReminderResult(null)} />}
      {modal === 'apply' && <ApplyMayorModal user={user} onClose={() => setModal(null)} />}
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{user.block && user.block !== '-' ? user.block : 'Your workspace'} <span> / </span> Overview</p>
          <div className={styles.date}>{dateTitle.format(today)}</div>
          <DailyQuote userId={user.id} heading />
        </div>
        <div className={styles.headerActions}>
          {isMayor && user.block_id && <button type="button" data-online-only className="btn alt" onClick={() => setModal('remind')}>Remind students</button>}
          {isMayor && <button data-online-only className="btn alt" onClick={() => setModal('ann')}>New Announcement</button>}
          <button className="btn" onClick={() => setModal(isMayor && online ? 'task' : 'mine')}>{isMayor && online ? 'Assign a Task' : 'Add personal task'}</button>
        </div>
      </header>

      {taskError && <p role="alert" className={styles.error}>{taskError}</p>}

      <div className={styles.summary} aria-label="Task summary">
        <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden="true">
          <circle className={styles.ringTrack} cx="18" cy="18" r="15.5" />
          <circle className={styles.ringFill} cx="18" cy="18" r="15.5" pathLength="100" strokeDasharray={`${percent} 100`} />
        </svg>
        <p className={styles.summaryText}>
          <span><strong>{pending.length}</strong> to do</span>
          <span className={dueSoon ? styles.soon : ''}><strong>{dueSoon}</strong> due soon</span>
          <span><strong>{completed}</strong> done</span>
        </p>
        <small>{tasks.length ? `${percent}% checked off` : 'Your progress starts here'}</small>
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
                ) : assigned.length ? (
                  <>
                    <AnimatedList className={styles.list}>
                      {assigned.slice(0, LIMIT).map((task) => (
                        <TaskItem key={task.id} t={task} onToggle={toggle} calendarEmail={user.email}
                          onEdit={isMayor ? setEditingTask : undefined}
                          onDelete={isMayor ? setDeletingTask : undefined} />
                      ))}
                    </AnimatedList>
                    {assigned.length > LIMIT && <Link className={styles.viewAll} to={`/tasks?filter=${filter}`}>See all {assigned.length}</Link>}
                  </>
                ) : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'All caught up. A little breathing room.'}</PlannerEmpty>}          </section>
          {(!isMayor || !online) && <section className={styles.section}>
            <h3>Personal tasks <span>{personal.length}</span></h3>
              {personal.length ? (
                <>
                  <AnimatedList className={styles.list}>
                    {personal.slice(0, LIMIT).map((task) => <TaskItem key={task.id} t={task} onToggle={toggle} />)}
                  </AnimatedList>
                  {personal.length > LIMIT && <Link className={styles.viewAll} to={`/tasks?filter=${filter}`}>See all {personal.length}</Link>}
                </>
              ) : <PlannerEmpty>{filter === 'done' ? 'Your next small win will appear here.' : 'A fresh page for your own plans.'}{filter !== 'done' && <button className={styles.inlineAction} onClick={() => setModal('mine')}>Add your first task</button>}</PlannerEmpty>}
          </section>}
        </div>

        {online && <aside className={styles.noticePanel}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The block board</p><h2>Announcements</h2></div><span className={styles.count}>{anns.length}</span></div>
            {latest.length ? (
              <div className={styles.board}>
                {latest.map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} isMayor={isMayor}
                    onOpen={setViewingAnn} onEdit={setEditingAnn} onDelete={setDeletingAnn} />
                ))}
              </div>
            ) : <div className="empty">No announcements yet.</div>}
            {anns.length > latest.length && (
              <Link className={styles.viewAll} to="/announcements">View all {anns.length}</Link>
            )}
          <div className={styles.note}><strong>Stay in the loop.</strong><p>Check your block board for updates before planning your day.</p><Link className={styles.textLink} to="/concerns">{isMayor ? 'Review student concerns' : 'Have a concern? Let’s talk'}</Link></div>
        </aside>}
      </div>

      {(modal === 'task' || modal === 'mine') && <Modal title={modal === 'task' ? 'Assign a Task' : 'Add a personal task'} description={modal === 'task' ? 'Give your block a clear task and deadline.' : 'Keep your own deadlines alongside your class tasks.'} submitLabel={modal === 'task' ? 'Assign task' : 'Add task'} fields={taskFields} onSave={(values) => addTask(values, modal === 'mine')} onClose={() => setModal(null)} />}
      {modal === 'ann' && (
      <Modal
        title="New Announcement"
        description="Share an update with your block."
        submitLabel="Post"
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
      <AnnouncementDialogs editing={editingAnn} deleting={deletingAnn}
        onCloseEdit={() => setEditingAnn(null)} onCloseDelete={() => setDeletingAnn(null)} />

      <TaskDialogs editing={editingTask} deleting={deletingTask}
        onCloseEdit={() => setEditingTask(null)} onCloseDelete={() => setDeletingTask(null)} />
    </div>
  );
}
