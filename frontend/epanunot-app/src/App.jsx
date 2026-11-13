import { TaskProvider } from './context/TaskContext.jsx';
import MessageDialog from './components/MessageDialog.jsx';
import { useApiQuery } from './api/useApiQuery.js';
import { BlockProvider } from './context/BlockContext.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { api, apiQueryOptions, queryClient, logout, errorMessage, refreshSyncQueries, clearApiCache } from './api/client.js';
import { startClientSync } from './api/clientSync.js';
import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import SkeletonList from './components/Skeleton.jsx';

import Login from './features/auth/Login.jsx';
import Dashboard from './features/dashboard/Dashboard.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import BlockRequiredDialog from './features/concerns/BlockRequiredDialog.jsx';
import { canUseConcerns } from './features/block/enrollmentRules.js';
import { activateOfflineAccount, getOfflineState, syncOffline } from './offline/runtime.js';
import { useDialogDismiss } from './components/useDialogDismiss.js';

const Profile = lazy(() => import('./features/profile/Profile.jsx'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard.jsx'));
const BlockManagement = lazy(() => import('./features/block/BlockManagement.jsx'));
const JoinBlock = lazy(() => import('./features/block/JoinBlock.jsx'));
const Concerns = lazy(() => import('./features/concerns/Concerns.jsx'));
const Calendar = lazy(() => import('./features/calendar/Calendar.jsx'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage.jsx'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage.jsx'));

// Lives inside MainLayout's <main>, so the navigation stays on screen while a page loads.
function PageBoundary() {
    return (
        <Suspense fallback={<SkeletonList rows={5} label="Loading page" />}>
            <Outlet />
        </Suspense>
    );
}

export default function App() {
    useDialogDismiss();
    const [loggedOut, setLoggedOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const [, renderSession] = useState(0);
    const identity = useApiQuery('/me', { enabled: !loggedOut });
    const user = loggedOut ? null : identity.data?.data;
    const accountId = user?.id;
    const navigate = useNavigate();

    useEffect(() => {
        const expired = () => setLoggedOut(true);
        window.addEventListener('auth:expired', expired);
        return () => window.removeEventListener('auth:expired', expired);
    }, []);

    useEffect(() => {
        if (!accountId) return;
        void syncOffline().catch(() => {});
        return startClientSync({ accountId,
            available: () => getOfflineState().online && document.visibilityState === 'visible' && navigator.onLine !== false,
            read: async () => (await api('/sync', { force: true })).data,
            refresh: refreshSyncQueries,
            accountChanged: () => {
                clearApiCache();
                window.dispatchEvent(new Event('auth:expired'));
            },
        });
    }, [accountId]);

    const handleLogin = async (account) => {
        await activateOfflineAccount(account);
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
            if (error.code === 'OFFLINE_ONLY') return;
            setLogoutError(errorMessage(error));
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
                <Route element={<PageBoundary />}>
                    {/* Admins land on /admin, everyone else gets the dashboard */}
                    <Route path="/" element={member(<Dashboard user={user} />)} />

                    <Route
                        path="/profile"
                        element={<Profile user={user} onUpdateUser={handleUpdateUser} />}
                    />

                    <Route
                        path="/settings"
                        element={<SettingsPage user={user} onLogout={handleLogout} />}
                    />

                    <Route path="/calendar" element={member(<Calendar user={user} />)} />

                    <Route path="/notifications" element={member(<NotificationsPage user={user} />)} />

                    <Route
                        path="/concerns/*"
                        element={member(
                            canUseConcerns(user) ? <Concerns user={user} /> : <BlockRequiredDialog onClose={() => navigate('/')} />
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

                    <Route path="/join-block" element={member(<JoinBlock user={user} />)} />

                    <Route
                        path="/admin/*"
                        element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />}
                    />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>{logoutError && <MessageDialog title="Could not sign out" message={logoutError} onClose={() => setLogoutError('')} />}</TaskProvider></BlockProvider>
    );
}
