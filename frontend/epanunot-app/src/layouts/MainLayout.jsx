import { Outlet } from 'react-router-dom';
import Navbar from '../features/navigation/Navbar.jsx';
import styles from './MainLayout.module.css';

// Shared shell for every logged-in role (student, mayor, admin).
// The Navbar changes its links based on user.role.
export default function MainLayout({ user, onLogout }) {
  return (
    <div className={styles.layout}>
      <Navbar user={user} onLogout={onLogout} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}