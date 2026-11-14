import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './Dashboard.module.css';
import AnimatedList from '../../components/AnimatedList.jsx';
import PlannerEmpty from '../../components/PlannerEmpty.jsx';
import TaskItem from './TaskItem.jsx';
import TaskDialogs from './TaskDialogs.jsx';
import { daysLeft } from './dateUtils';
import { useTasks } from '../../context/TaskContext.jsx';
import { useToday } from './useToday.js';

const GROUPS = [
  ['overdue', 'Overdue'], ['today', 'Today'], ['tomorrow', 'Tomorrow'],
  ['week', 'This week'], ['later', 'Later'], ['done', 'Completed'],
];

function groupOf(task, now) {
  if (task.done) return 'done';
  const left = daysLeft(task.due);
  if (left < 0 || task.due < now) return 'overdue';
  if (left === 0) return 'today';
  if (left === 1) return 'tomorrow';
  return left <= 7 ? 'week' : 'later';
}

export default function TasksPage({ user }) {
  useToday(); // re-renders at midnight so groups stay correct
  const { tasks, toggleTask } = useTasks();
  const [params, setParams] = useSearchParams();
  const filter = ['open', 'done', 'all'].includes(params.get('filter')) ? params.get('filter') : 'open';
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const isMayor = user.role === 'mayor';

  const groups = useMemo(() => {
    const now = new Date();
    const needle = search.trim().toLowerCase();
    const shown = tasks
      .filter((t) => filter === 'all' || (filter === 'open' ? !t.done : t.done))
      .filter((t) => !needle || `${t.title} ${t.subject ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => a.due - b.due);
    return GROUPS
      .map(([key, label]) => [key, label, shown.filter((t) => groupOf(t, now) === key)])
      .filter(([, , items]) => items.length);
  }, [tasks, filter, search]);

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <Link to="/" className={styles.textLink}>← Back to dashboard</Link>
      <div className={styles.sectionHead} style={{ marginTop: 16 }}>
        <h2>All tasks</h2>
        <span className={styles.count}>{tasks.length}</span>
      </div>

      <input className={styles.search} type="search" placeholder="Search tasks" aria-label="Search tasks"
        value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" enterKeyHint="search" />

      <div className={styles.filters} role="group" aria-label="Filter tasks">
        {[['open', 'To do'], ['done', 'Completed'], ['all', 'All tasks']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value}
            className={filter === value ? styles.activeFilter : ''}
            onClick={() => setParams(value === 'open' ? {} : { filter: value }, { replace: true })}>{label}</button>
        ))}
      </div>

      {groups.length === 0 ? (
        <PlannerEmpty>{search ? 'No tasks match your search.' : 'Nothing here.'}</PlannerEmpty>
      ) : groups.map(([key, label, items]) => (
        <section key={key} className={styles.section}>
          <h3>{label} <span>{items.length}</span></h3>
          <AnimatedList className={styles.list}>
            {items.map((t) => (
              <TaskItem key={t.id} t={t} onToggle={toggleTask}
                calendarEmail={t.personal ? undefined : user.email}
                onEdit={isMayor && !t.personal ? setEditing : undefined}
                onDelete={isMayor && !t.personal ? setDeleting : undefined} />
            ))}
          </AnimatedList>
        </section>
      ))}

      <TaskDialogs editing={editing} deleting={deleting}
        onCloseEdit={() => setEditing(null)} onCloseDelete={() => setDeleting(null)} />
    </div>
  );
}