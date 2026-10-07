import { Outlet } from 'react-router-dom';
import Navigation from '../features/navigation/Navigation.jsx';
import styles from './MainLayout.module.css';

// Shared shell for every logged-in role (student, mayor, admin).
// The Naviagation changes its links based on user.role.
export default function MainLayout({ user, onLogout }) {
  return (
    <div className={styles.layout}>
      {/* TODO: replace the hardcoded 3 with the real unread count from the notifications feature */}
      <Navigation user={user} onLogout={onLogout} notifCount={3} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}