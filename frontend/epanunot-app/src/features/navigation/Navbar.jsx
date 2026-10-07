import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// Links shown per role. Add new pages here (Concerns, Block Management, ...)
const LINKS = {
  admin: [{ label: 'Admin', to: '/admin', icon: <GridIcon /> }],
  default: [
    { label: 'Dashboard', to: '/', icon: <GridIcon /> },
    { label: 'Calendar', to: '/calendar', icon: <CalendarIcon /> },
  ],
};

export default function Navbar({ user, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const links = LINKS[user.role] || LINKS.default;
  const roleLabel = `${user.role}${user.block && user.block !== '-' ? ` · ${user.block}` : ''}`;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.left}>
            <div className={styles.brand}>e<b>Panunot</b></div>
            <nav className={styles.desktopNav}>
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end
                  className={({ isActive }) => `${styles.navTab} ${isActive ? styles.navTabActive : ''}`}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className={styles.right}>
            {/* Notification bell */}
            <button className={styles.iconBtn} aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className={styles.notifBadge}>3</span>
            </button>

            {/* Profile dropdown */}
            <div className={styles.profileWrapper}>
              <button className={styles.profileBtn} onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
                <div className={styles.avatar}>{user.name.charAt(0)}</div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userBadge}>{roleLabel}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <strong>{user.name}</strong>
                    <span>{roleLabel}</span>
                  </div>
                  <hr className={styles.divider} />
                  <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={onLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom bar (only when there is more than one page to switch between) */}
      {links.length > 1 && (
        <nav className={styles.mobileNav}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) => `${styles.mobileItem} ${isActive ? styles.mobileItemActive : ''}`}
            >
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
