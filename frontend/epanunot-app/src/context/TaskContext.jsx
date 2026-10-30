import { TASK_STORAGE_KEY as KEY, readTasks, saveTasks } from './taskStorage.js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { initialTasks } from '../data/mockData';
import { validDeadline, unfinishedFirst } from '../components/taskListUtils.js';


const TaskContext = createContext(null);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function read() {
  try { return readTasks(localStorage); } catch { return {}; }
}

export function TaskProvider({ user, children }) {
  const [store, setStore] = useState(read);
  const current = useRef(store);
  const account = user.email || String(user.id);
  const block = user.block_id || user.block || account;
  const classKey = `block:${block}`;
  const personalKey = `personal:${account}`;
  const completionKey = `completed:${account}`;
  const seeds = (personal) => initialTasks.filter((t) => t.personal === personal);
  const classTasks = store[classKey] || seeds(false);
  const personalTasks = store[personalKey] || seeds(true);
  const completions = store[completionKey] || {};

  const update = (change) => {
    const next = change(current.current);
    current.current = next;
    try { saveTasks(localStorage, next); } catch { /* Keep working in memory. */ }
    setStore(next);
  };
  useEffect(() => {
    const sync = (event) => {
      if (event.key !== KEY && event.key !== null) return;
      const next = read();
      current.current = next;
      setStore(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const tasks = unfinishedFirst([...classTasks, ...personalTasks].map((task) => ({
    ...task, done: completions[task.id] ?? task.done,
    due: new Date(`${task.date}T23:59:00`),
  })));

  const addTask = (values) => {
    if (!values.title.trim() || !validDeadline(values.date, today())) return;
    if (!values.personal && user.role !== 'mayor') return;
    const key = values.personal ? personalKey : classKey;
    const task = { ...values, id: crypto.randomUUID(), title: values.title.trim(), personal: Boolean(values.personal), done: false };
    update((prev) => ({ ...prev, [key]: [task, ...(prev[key] || seeds(task.personal))] }));
  };
  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    update((prev) => ({ ...prev, [completionKey]: { ...prev[completionKey], [id]: !task.done } }));
  };
  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || (!task.personal && user.role !== 'mayor')) return;
    const key = task.personal ? personalKey : classKey;
    update((prev) => ({ ...prev, [key]: (prev[key] || seeds(task.personal)).filter((t) => t.id !== id) }));
  };
  return <TaskContext.Provider value={{ tasks, addTask, toggleTask, deleteTask }}>{children}</TaskContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks requires TaskProvider');
  return context;
}
