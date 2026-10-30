import { useState, useCallback, useEffect } from 'react';
import { api, getToken, setToken } from './api/client.js';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Login from './features/auth/Login.jsx';
import Dashboard from './features/dashboard/Dashboard.jsx';
import Profile from './features/profile/Profile.jsx';
import AdminDashboard from './features/admin/AdminDashboard.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import BlockManagement from './features/block/BlockManagement.jsx';
import Concerns from './features/concerns/Concerns.jsx';
import useSyncedConcerns from './features/concerns/useSyncedConcerns.js';
import Calendar from './features/calendar/Calendar.jsx';

export default function App() {
    const [user, setUser] = useState(null);
    const [booting, setBooting] = useState(() => Boolean(getToken()));
    const navigate = useNavigate();
    const [concerns, setConcerns] = useSyncedConcerns();

    const refreshUser = useCallback(async () => {
        try {
            setUser((await api('/me')).data);
        } catch {
            // A 401 is handled in api().
        }
    }, []);

    useEffect(() => {
        // Restore the session after a page refresh.
        if (!getToken()) return;

        refreshUser().finally(() => setBooting(false));
    }, [refreshUser]);

    useEffect(() => {
        // Token expired -> back to Login.
        const onExpired = () => setUser(null);

        window.addEventListener('auth:expired', onExpired);

        return () => window.removeEventListener('auth:expired', onExpired);
    }, []);

    useEffect(() => {
        // Refresh user data when returning to the browser tab.
        if (!user) return;

        window.addEventListener('focus', refreshUser);

        return () => window.removeEventListener('focus', refreshUser);
    }, [user, refreshUser]);

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        navigate('/');
    };

    if (booting) {
        return <p style={{ padding: 24 }}>Loading...</p>;
    }

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    const isAdmin = user.role === 'admin';

    // Student/mayor pages: admins get sent to /admin instead.
    const member = (page) =>
        isAdmin ? <Navigate to="/admin" replace /> : page;

    const handleUpdateUser = (changes) =>
        setUser((prev) => ({ ...prev, ...changes }));

    return (
        <Routes>
            <Route element={<MainLayout user={user} onLogout={handleLogout} />}>
                {/* Admins land on /admin, everyone else gets the dashboard */}
                <Route
                    path="/"
                    element={member(<Dashboard user={user} />)}
                />

                <Route
                    path="/profile"
                    element={
                        <Profile
                            user={user}
                            onUpdateUser={handleUpdateUser}
                        />
                    }
                />

                <Route
                    path="/calendar"
                    element={member(<Calendar user={user} />)}
                />

                <Route
                    path="/concerns/*"
                    element={member(
                        <Concerns
                            user={user}
                            concerns={concerns}
                            setConcerns={setConcerns}
                        />
                    )}
                />

                <Route
                    path="/block"
                    element={<BlockManagement user={user} />}
                />

                <Route
                    path="/admin"
                    element={
                        isAdmin
                            ? <AdminDashboard />
                            : <Navigate to="/" replace />
                    }
                />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}