import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './features/auth/Login.jsx';
import Dashboard from './features/dashboard/Dashboard.jsx';
import Profile from './features/profile/Profile.jsx';
import AdminDashboard from './features/admin/AdminDashboard.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import BlockManagement from './features/block/BlockManagement.jsx';

// Temporary stand-in until the Calendar page is built (features/calendar).
function ComingSoon({ title }) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div className="empty">{title} is coming soon.</div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  // Not logged in: always show the login page.
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isAdmin = user.role === 'admin';
  // student/mayor pages: admins get sent to /admin instead
  const member = (page) => (isAdmin ? <Navigate to="/admin" replace /> : page);

  const handleUpdateUser = (changes) => setUser((prev) => ({...prev, ...changes}));

  return (
    <Routes>
      <Route element={<MainLayout user={user} onLogout={handleLogout} />}>
        {/* Admins land on /admin, everyone else gets the dashboard */}
        <Route path="/" element={member(<Dashboard user={user} />)} />

        {/* Placeholders: swap each ComingSoon for the real page when it is built */}
        <Route path="/profile" element={<Profile user={user} onUpdateUser={handleUpdateUser}/>} />
        <Route path="/calendar" element={member(<ComingSoon title="Calendar" />)} />
        <Route path="/concerns" element={member(<ComingSoon title="Concerns" />)} />
        <Route path="/block" element={<BlockManagement user={user} />} />

        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />

      
    </Routes>
  );
}
