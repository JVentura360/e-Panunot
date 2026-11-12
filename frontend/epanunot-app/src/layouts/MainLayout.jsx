import { Outlet } from 'react-router-dom';
import Navigation from '../features/navigation/Navigation.jsx';
import styles from './MainLayout.module.css';
import OfflineBoundary from '../offline/OfflineBoundary.jsx';
import TutorialGate from '../features/tutorial/TutorialGate.jsx';

// Shared shell for every logged-in role (student, mayor, admin).
// The Naviagation changes its links based on user.role.
export default function MainLayout({ user, onLogout }) {
  return (
    <div className={styles.layout}>
      <a href="#main-content" className="skipLink">Skip to content</a>
      <Navigation user={user} onLogout={onLogout} />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <OfflineBoundary user={user}><Outlet /></OfflineBoundary>
      </main>
      <TutorialGate key={`${user.id}:${user.role}`} user={user} />
    </div>
  );
}
