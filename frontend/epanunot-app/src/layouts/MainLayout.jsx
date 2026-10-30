import { Outlet } from 'react-router-dom';
import Navigation from '../features/navigation/Navigation.jsx';
import styles from './MainLayout.module.css';

// Shared shell for every logged-in role (student, mayor, admin).
// The Naviagation changes its links based on user.role.
export default function MainLayout({ user, onLogout }) {
  return (
    <div className={styles.layout}>
      <a href="#main-content" className="skipLink">Skip to content</a>
      <Navigation user={user} onLogout={onLogout} />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
