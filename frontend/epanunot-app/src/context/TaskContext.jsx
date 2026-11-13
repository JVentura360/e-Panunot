import { createContext, useContext, useMemo, useState } from 'react';
import { api, apiQueryOptions, errorMessage, queryClient } from '../api/client.js';
import { useApiQuery } from '../api/useApiQuery.js';
import { deadlinePayload } from '../components/deadline.js';
import { unfinishedFirst, validDeadline } from '../components/taskListUtils.js';
import { toClassTask, toPersonalTask } from './taskMapper.js';
import { createOfflinePersonal, completeOfflineTask, getOfflineState, requireOnline } from '../offline/runtime.js';

const TaskContext = createContext(null);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Instantly change one row in the cached list so checkboxes feel immediate.
const mark = (path, rawId, changes) => {
  queryClient.setQueryData(apiQueryOptions(path).queryKey, (old) =>
    old ? { ...old, data: old.data.map((row) => (row.id === rawId ? { ...row, ...changes } : row)) } : old
  );
};

export function TaskProvider({ user, children }) {
  const enabled = user.role !== 'admin';
  const classQuery = useApiQuery('/tasks', { enabled });
  const personalQuery = useApiQuery('/personal-todos', { enabled });
  const [error, setError] = useState('');
  const canSaveOffline = () => {
    const state = getOfflineState();
    return state.available && state.accountId != null && String(state.accountId) === String(user.id);
  };

  const tasks = useMemo(
    () => unfinishedFirst([
      ...(classQuery.data?.data ?? []).map(toClassTask),
      ...(personalQuery.data?.data ?? []).map(toPersonalTask),
    ]),
    [classQuery.data, personalQuery.data]
  );

  // For checkbox and delete actions: show the error on the page and undo any instant change.
  const attempt = async (fn, refreshPath) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      if (refreshPath) queryClient.invalidateQueries({ queryKey: apiQueryOptions(refreshPath).queryKey });
      setError(errorMessage(e));
    }
  };

  // Throws on failure, so the pop-up or form that called it can show the message.
  const addTask = async (values) => {
    const title = values.title.trim();
    if (!title) throw new Error('Please add a title.');
    if (!validDeadline(values.date, today())) throw new Error('Choose today or a future date for the deadline.');
    const deadline = deadlinePayload(`${values.date}T${values.time || '23:59'}`);
    if (new Date(deadline) <= new Date()) throw new Error('Choose a future deadline date and time.');

    if (values.personal) {
      if (canSaveOffline()) {
        await createOfflinePersonal({ title, due_date: values.date, due_at: deadline });
        return;
      }
      requireOnline();
      await api('/personal-todos', { method: 'POST', body: { title, due_date: values.date, due_at: deadline } });
      return;
    }
    requireOnline();
    await api('/tasks', {
      method: 'POST',
      body: {
        title,
        due_date: deadline,
        platform: values.platform || null,
        ...(values.allSubjects ? { all_subjects: true } : { subject_id: values.subjectId }),
      },
    });
  };

  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const done = !task.done;
    const path = task.personal ? '/personal-todos' : '/tasks';
    return attempt(async () => {
      if (canSaveOffline()) {
        await completeOfflineTask(task.rawId, task.personal, done);
        return;
      }
      requireOnline();
      if (task.personal) {
        mark(path, task.rawId, { is_done: done });
        await api(`/personal-todos/${task.rawId}`, { method: 'PATCH', body: { is_done: done } });
      } else {
        mark(path, task.rawId, { completed_at: done ? new Date().toISOString() : null });
        await api(`/tasks/${task.rawId}/complete`, { method: done ? 'POST' : 'DELETE' });
      }
    }, path);
  };

  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!task.personal && user.role !== 'mayor') return;
    return attempt(async () => {
      requireOnline();
      if (task.pendingSync) throw new Error('Wait for this task to sync before deleting it.');
      await api(task.personal ? `/personal-todos/${task.rawId}` : `/tasks/${task.rawId}`, { method: 'DELETE' });
    });
  };

  // Mayor only. Throws on failure so the pop-up can show the message.
  const updateTask = async (id, values) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.personal || user.role !== 'mayor') return;
    requireOnline();
    const title = values.title.trim();
    if (!title) throw new Error('Please add a title.');
    const dateChanged = values.date !== task.date || (values.time || task.time) !== task.time;
    if (dateChanged && !validDeadline(values.date, today())) {
      throw new Error('Choose today or a future date for the deadline.');
    }
    const deadline = dateChanged ? deadlinePayload(`${values.date}T${values.time || task.time || '23:59'}`) : null;
    if (deadline && new Date(deadline) <= new Date()) throw new Error('Choose a future deadline date and time.');
    await api(`/tasks/${task.rawId}`, {
      method: 'PUT',
      body: {
        title,
        platform: values.platform || null,
        ...(dateChanged ? { due_date: deadline } : {}),
      },
    });
  };

  // Mayor only. Throws on failure, for the confirm pop-up.
  const removeTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.personal || user.role !== 'mayor') return;
    requireOnline();
    if (task.pendingSync) throw new Error('Wait for this task to sync before deleting it.');
    await api(`/tasks/${task.rawId}`, { method: 'DELETE' });
  };

  return (
    <TaskContext.Provider value={{ tasks, error, addTask, toggleTask, deleteTask, updateTask, removeTask }}>
      {children}
    </TaskContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks requires TaskProvider');
  return context;
}
