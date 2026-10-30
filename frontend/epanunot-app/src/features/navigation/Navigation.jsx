import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ApplyMayorModal from './ApplyMayorModal.jsx';
import styles from './Navigation.module.css';
import { applyTheme } from '../../theme.js';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconProfile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconConcerns = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconBlock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconSignOut = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ─── Nav items ────────────────────────────────────────────────────────────────
// `to` is the URL path. mobileLabel is the short label used in the bottom bar.
// To add a new page: add an entry here + a <Route> in App.jsx.

const BASE_NAV = [
  { label: 'Dashboard',       mobileLabel: 'Dashboard', to: '/',         icon: <IconDashboard /> },
  { label: 'Calendar',        mobileLabel: 'Calendar',  to: '/calendar', icon: <IconCalendar /> },
  { label: 'Concerns',        mobileLabel: 'Concerns',  to: '/concerns', icon: <IconConcerns /> },
];
const BLOCK_NAV = { label: 'Block Management', mobileLabel: 'Block', to: '/block', icon: <IconBlock /> };
const ADMIN_NAV = [{ label: 'Admin', mobileLabel: 'Admin', to: '/admin', icon: <IconDashboard /> }];

function getNavItems(role) {
  if (role === 'admin') return ADMIN_NAV; // admins only use /admin
  const items = [...BASE_NAV];
  if (role === 'mayor') items.push(BLOCK_NAV);
  return items;
}

// One shared highlight moves between links instead of repainting each tab.
function SlidingNav({ className, label, children }) {
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    let mounted = true;
    const positionIndicator = () => {
      if (!mounted) return;
      const active = nav.querySelector('[aria-current="page"]');
      indicator.hidden = !active || !nav.getClientRects().length;
      if (indicator.hidden) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    positionIndicator();
    const observer = new ResizeObserver(positionIndicator);
    observer.observe(nav);
    nav.querySelectorAll('a').forEach((link) => observer.observe(link));
    document.fonts.ready.then(positionIndicator);
    return () => { mounted = false; observer.disconnect(); };
  }, [pathname, children]);

  return <nav ref={navRef} className={className} aria-label={label}>
    <span ref={indicatorRef} className={styles.navIndicator} aria-hidden="true" hidden />
    {children}
  </nav>;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
//
// Props:
//   user        { name, email, role, block }
//   onLogout    () => void
//   notifCount  number (default 0)
//
// The active tab now comes from the URL (NavLink), so activeTab/onTabChange are gone.

export default function Navigation({ user, onLogout, notifCount = 0 }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  useEffect(() => {
    if (!profileOpen) return;
    const dismissOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [profileOpen]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };
  const navigate = useNavigate();

  const navItems = getNavItems(user.role);
  const canApply = user.role === 'student';
  const roleLabel = `${user.role}${user.block && user.block !== '-' ? ` · ${user.block}` : ''}`;

  // "/" must match exactly, otherwise Dashboard would be active on every page
  const isEnd = (to) => to === '/';

  return (
    <>
      {/* ── Desktop header ── */}
      <header className={styles.header}>
        <div className={styles.container}>

          <div className={styles.left}>
            <div className={styles.brand}>e<b>Panunot</b></div>
            <SlidingNav className={styles.desktopNav} label="Main navigation">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={isEnd(to)}
                  className={({ isActive }) => `${styles.navTab} ${isActive ? styles.navTabActive : ''}`}
                >
                  {label}
                </NavLink>
              ))}
            </SlidingNav>
          </div>

          <div className={styles.right}>
            {canApply && (
              <button className={`btn ${styles.applyBtn} ${styles.desktopOnly}`} onClick={() => setApplyOpen(true)}>
                <IconStar /><span>Apply as Mayor</span>
              </button>
            )}

            <button className={styles.iconBtn} disabled title="Notifications are coming soon" aria-label="Notifications (coming soon)">
              <IconBell />
              {notifCount > 0 && <span className={styles.notifBadge} aria-hidden="true">{notifCount}</span>}
            </button>

            <div ref={profileRef} className={styles.profileWrapper}>
              <button
                ref={profileButtonRef}
                className={styles.profileBtn}
                aria-label={`Account menu for ${user.name}`}
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <div className={styles.avatar}>{user.name.charAt(0)}</div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userBadge}>{roleLabel}</span>
                </div>
                <IconChevron open={profileOpen} />
              </button>

              {profileOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <strong>{user.name}</strong>
                    <span>{roleLabel}</span>
                  </div>
                  <hr className={styles.divider} />
                  {user.role !== 'admin' && (
                    <button className={styles.dropdownItem} role="menuitem"
                      onClick={() => { setProfileOpen(false); navigate('/profile'); }}>
                      <IconProfile /> My profile
                    </button>
                  )}
                  <button className={styles.dropdownItem} role="menuitemcheckbox" aria-label="Dark theme" aria-checked={theme === 'dark'} onClick={toggleTheme}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
                    </svg>
                    <span>Theme</span>
                    <span className={styles.themeChoice}>{theme === 'dark' ? 'Dark' : 'Light'}<span className={styles.themeSwitch} data-dark={theme === 'dark'} aria-hidden="true" /></span>
                  </button>
                  <hr className={styles.divider} />
                  <button className={`${styles.dropdownItem} ${styles.danger}`} role="menuitem" onClick={onLogout}>
                    <IconSignOut /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* ── Mobile bottom bar (only when there is more than one page) ── */}
      {(navItems.length > 1 || canApply) && (
        <SlidingNav className={styles.mobileNav} label="Mobile navigation">
          {navItems.map(({ to, mobileLabel, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={isEnd(to)}
              className={({ isActive }) => `${styles.mobileItem} ${isActive ? styles.mobileItemActive : ''}`}
            >
              {icon}
              <span>{mobileLabel}</span>
            </NavLink>
          ))}

          {/* "Apply" takes a slot on mobile for students */}
          {canApply && (
            <button className={styles.mobileItem} onClick={() => setApplyOpen(true)} aria-label="Apply as Mayor">
              <IconStar />
              <span>Apply</span>
            </button>
          )}
        </SlidingNav>
      )}

      {applyOpen && <ApplyMayorModal user={user} onClose={() => setApplyOpen(false)} />}
    </>
  );
}
