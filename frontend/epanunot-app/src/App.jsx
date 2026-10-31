import { TaskProvider } from './context/TaskContext.jsx';
import { useState, useEffect } from 'react';
import { useApiQuery } from './api/useApiQuery.js';
import { BlockProvider } from './context/BlockContext.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { apiQueryOptions, queryClient, logout, errorMessage } from './api/client.js';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Login from './features/auth/Login.jsx';
import Dashboard from './features/dashboard/Dashboard.jsx';
import Profile from './features/profile/Profile.jsx';
import AdminDashboard from './features/admin/AdminDashboard.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import BlockManagement from './features/block/BlockManagement.jsx';
import JoinBlock from './features/block/JoinBlock.jsx';
import Concerns from './features/concerns/Concerns.jsx';
import Calendar from './features/calendar/Calendar.jsx';

export default function App() {
    const [loggedOut, setLoggedOut] = useState(false);
    const [, renderSession] = useState(0);
    const identity = useApiQuery('/me', { enabled: !loggedOut });
    const user = loggedOut ? null : identity.data?.data;
    const navigate = useNavigate();

    useEffect(() => {
        const expired = () => setLoggedOut(true);
        window.addEventListener('auth:expired', expired);
        return () => window.removeEventListener('auth:expired', expired);
    }, []);

    const handleLogin = (account) => {
        queryClient.setQueryData(apiQueryOptions('/me').queryKey, { data: account });
        setLoggedOut(false);
        renderSession((value) => value + 1);
    };
    const handleLogout = async () => {
        try {
            await logout();
            setLoggedOut(true);
            navigate('/');
        } catch (error) {
            window.alert(errorMessage(error));
        }
    };

    if (identity.isPending && !loggedOut) return <LoadingScreen />;
    if (!user) {
        const message = identity.error && identity.error.status !== 401 ? errorMessage(identity.error) : '';
        return <Login error={message} onLogin={handleLogin} />;
    }
    const isAdmin = user.role === 'admin';

    // Student/mayor pages: admins get sent to /admin instead.
    const member = (page) =>
        isAdmin ? <Navigate to="/admin" replace /> : page;

    const handleUpdateUser = (changes) =>
        queryClient.setQueryData(apiQueryOptions('/me').queryKey, { data: { ...user, ...changes } });

    return (
        <BlockProvider user={user} key={`${user.id}:${user.role}:${user.block_id ?? 'none'}`}><TaskProvider user={user}><Routes>
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
                            <Concerns user={user} />
                    )}
                />

                <Route
                    path="/block"
                    element={
                        user.role === 'mayor'
                            ? <BlockManagement user={user} />
                            : <Navigate to="/" replace />
                    }
                />

                <Route
                    path="/join-block"
                    element={member(<JoinBlock user={user} />)}
                />

                <Route
                    path="/admin/*"
                    element={
                        isAdmin
                            ? <AdminDashboard />
                            : <Navigate to="/" replace />
                    }
                />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></TaskProvider></BlockProvider>
    );
}
