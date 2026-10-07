// App.jsx
import { useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Navigation from './features/navigation/Navigation.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-layout">
      <Navigation
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => setUser(null)}
        notifCount={3}
      />
      <Dashboard user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={() => setUser(null)} />
    </div>
  );
}