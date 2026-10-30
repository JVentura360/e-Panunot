import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { initialTasks } from '../data/mockData';

const KEY = 'tasks-v1';
const TaskContext = createContext(null);

// Tasks are stored with a plain 'YYYY-MM-DD' date string so they survive
// JSON/localStorage. The Dashboard wants a Date (`due`), so we derive it.
//
// Stored shape:
//   { id, title, date, subject, platform, by, done, personal }
//   personal: false = assigned by the mayor (Dashboard "From your mayor",
//                     Calendar "Class tasks" + calendar grid)
//   personal: true  = the student's own task (Dashboard "Personal tasks",
//                     Calendar "My to-dos")

export const toKey = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const withDue = (t) => ({ ...t, due: new Date(`${t.date}T23:59:00`) });

function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* ignore corrupt or unavailable storage */
    }
    return initialTasks;
}

// One shared task list for Dashboard and Calendar.
export function TaskProvider({ children }) {
    const [stored, setStored] = useState(load);

    // Same signature as a normal setState (value or updater function).
    // The updater runs against the latest stored data, so a change made
    // in another tab is never overwritten by a stale copy.
    const setTasksRaw = useCallback((updater) => {
        const base = load();
        const next = typeof updater === 'function' ? updater(base) : updater;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* storage full or blocked: still update this tab */
        }
        setStored(next);
    }, []);

    // Keep other tabs in sync.
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === KEY && e.newValue) setStored(JSON.parse(e.newValue));
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const tasks = useMemo(() => stored.map(withDue), [stored]);

    // values: { title, date: 'YYYY-MM-DD', subject?, platform?, by?, personal? }
    const addTask = useCallback((values) => {
        setTasksRaw((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: values.title.trim(),
                date: values.date,
                subject: values.subject || '',
                platform: values.platform || '',
                by: values.by || '',
                personal: Boolean(values.personal),
                done: false,
            },
        ]);
    }, [setTasksRaw]);

    const toggleTask = useCallback((id) => {
        setTasksRaw((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    }, [setTasksRaw]);

    const deleteTask = useCallback((id) => {
        setTasksRaw((prev) => prev.filter((t) => t.id !== id));
    }, [setTasksRaw]);

    return (
        <TaskContext.Provider value={{ tasks, addTask, toggleTask, deleteTask }}>
            {children}
        </TaskContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTasks must be used inside <TaskProvider>');
    return ctx;
}
