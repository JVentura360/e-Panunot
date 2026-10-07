import { createContext, useContext, useState } from 'react';
import { mayorApplications } from '../data/mockData';

const BlockContext = createContext(null);

// Shared state for mayor applications, mayors and blocks.
// The system starts with NO blocks: they are created when the admin
// approves a mayor application.
export function BlockProvider({ children }) {
    const [apps, setApps] = useState(mayorApplications);
    const [mayors, setMayors] = useState([]);
    const [blocks, setBlocks] = useState([]);

    // A student applies as mayor (call this from the Apply as Mayor popup)
    const addApplication = ({ name, email, block, motivation }) => {
        setApps((prev) => [...prev, { id: Date.now(), name, email, block, motivation, status: 'pending' }]);
    };

    // Returns { ok: true } or { ok: false, message }
    const approve = (app) => {
        if (blocks.some((b) => b.name === app.block)) {
        return { ok: false, message: `${app.block} already has a mayor.` };
        }

        // Approve this one, auto-reject other pending applications for the same block
        setApps((prev) =>
        prev.map((a) => {
            if (a.id === app.id) return { ...a, status: 'approved' };
            if (a.block === app.block && a.status === 'pending') return { ...a, status: 'rejected' };
            return a;
        })
        );
        setMayors((prev) => [...prev, { id: app.id, name: app.name, email: app.email, block: app.block }]);
        setBlocks((prev) => [...prev, { id: app.id, name: app.block, mayor: app.name, members: 1 }]);
        return { ok: true };
    };

    const reject = (id) => {
        setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a)));
    };

    return (
        <BlockContext.Provider value={{ apps, mayors, blocks, addApplication, approve, reject }}>
        {children}
        </BlockContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBlocks() {
    const ctx = useContext(BlockContext);
    if (!ctx) throw new Error('useBlocks must be used inside <BlockProvider>');
    return ctx;
}