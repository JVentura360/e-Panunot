import { useCallback, useEffect, useState } from 'react';
import { initialConcerns } from './concernsData.js';

const KEY = 'concerns-v1';

function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* ignore corrupt or unavailable storage */
    }
    return initialConcerns;
}

export default function useSyncedConcerns() {
    const [concerns, setState] = useState(load);

    // Same signature as a normal setState (value or updater function).
    // The updater runs against the latest stored data, so a change made
    // in another tab is never overwritten by a stale copy.
    const setConcerns = useCallback((updater) => {
        const base = load();
        const next = typeof updater === 'function' ? updater(base) : updater;
        try {
        localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
        /* storage full or blocked: still update this tab */
        }
        setState(next);
    }, []);

    // Fires in OTHER tabs when this key changes.
    useEffect(() => {
        const onStorage = (e) => {
        if (e.key === KEY && e.newValue) setState(JSON.parse(e.newValue));
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return [concerns, setConcerns];
}