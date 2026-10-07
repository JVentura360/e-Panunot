import { useState } from 'react';

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
// mobileLabel is the short label used in the bottom bar

const BASE_NAV = [
  { key: 'Dashboard',  label: 'Dashboard',       mobileLabel: 'Dashboard', icon: <IconDashboard /> },
  { key: 'Profile',    label: 'Student Profile', mobileLabel: 'Profile',   icon: <IconProfile /> },
  { key: 'Calendar',   label: 'Calendar',        mobileLabel: 'Calendar',  icon: <IconCalendar /> },
  { key: 'Concerns',   label: 'Concerns',        mobileLabel: 'Concerns',  icon: <IconConcerns /> },
];
const BLOCK_NAV = { key: 'BlockManagement', label: 'Block Management', mobileLabel: 'Block', icon: <IconBlock /> };

function getNavItems(role) {
  const items = [...BASE_NAV];
  if (role === 'mayor' || role === 'admin') items.push(BLOCK_NAV);
  return items;
}

// ─── Apply as Mayor Modal ─────────────────────────────────────────────────────

function ApplyMayorModal({ user, onClose }) {
  const [motivation, setMotivation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!motivation.trim()) return;
    // TODO: POST to /api/mayor-applications
    setSubmitted(true);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="apply-title" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--sage)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 id="apply-title">Application submitted</h3>
              <p style={{ color: '#4d6a63', fontSize: '0.9rem', marginTop: 6 }}>
                Your admin will review your application and notify you of their decision.
              </p>
            </div>
            <div className="row"><button className="btn" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <h3 id="apply-title">Apply as Mayor</h3>
            <p style={{ color: '#4d6a63', fontSize: '0.88rem', marginTop: -4 }}>
              Applying for block <strong>{user.block}</strong>.
            </p>

            <input type="text" value={user.block} readOnly aria-label="Your block"
              style={{ background: 'var(--sand)', color: '#4d6a63', cursor: 'default' }} />

            <textarea
              rows={4}
              placeholder="Why do you want to be mayor?"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              aria-label="Motivation"
              style={{
                padding: '10px 12px', borderRadius: 10, border: '2px solid var(--mist)',
                font: 'inherit', background: '#fff', width: '100%', resize: 'vertical', minHeight: 90,
              }}
            />

            <div className="row">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={handleSubmit} disabled={!motivation.trim()}
                style={{ opacity: motivation.trim() ? 1 : 0.5 }}>
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
//
// Props:
//   user        { name, role, block }
//   activeTab   string
//   onTabChange (key) => void
//   onLogout    () => void
//   notifCount  number (default 0)

export default function Navigation({ user, activeTab, onTabChange, onLogout, notifCount = 0 }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const navItems = getNavItems(user.role);
  const canApply = user.role === 'Student';

  return (
    <>
      {/* ── Desktop header (hidden on mobile via .desktop-nav display:none in index.css) ── */}
      <header className="app-header">
        <div className="header-container">

          <div className="header-left">
            <div className="brand">e<b>Panunot</b></div>
            {/* .desktop-nav is already display:none at ≤760px in index.css */}
            <nav className="desktop-nav" aria-label="Main navigation">
              {navItems.map(({ key, label }) => (
                <button
                  key={key}
                  className={`nav-tab ${activeTab === key ? 'active' : ''}`}
                  onClick={() => onTabChange(key)}
                  aria-current={activeTab === key ? 'page' : undefined}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="header-right">
            {canApply && (
              <button
                className="btn desktop-only"
                style={{ fontSize: '0.85rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setApplyOpen(true)}
              >
                <IconStar /><span>Apply as Mayor</span>
              </button>
            )}

            <button className="icon-btn" aria-label={`Notifications${notifCount > 0 ? `, ${notifCount} unread` : ''}`}>
              <IconBell />
              {notifCount > 0 && <span className="notif-badge" aria-hidden="true">{notifCount}</span>}
            </button>

            <div className="profile-wrapper">
              <button
                className="profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <div className="avatar">{user.name.charAt(0)}</div>
                <div className="user-info-text">
                  <span className="user-name">{user.name}</span>
                  <span className="user-badge">{user.role}{user.block !== '-' ? ` · ${user.block}` : ''}</span>
                </div>
                <IconChevron open={profileOpen} />
              </button>

              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="dropdown-header">
                    <strong>{user.name}</strong>
                    <span>{user.role}{user.block !== '-' ? ` · ${user.block}` : ''}</span>
                  </div>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item" role="menuitem"
                    onClick={() => { setProfileOpen(false); onTabChange('Profile'); }}>
                    <IconProfile /> My profile
                  </button>
                  {canApply && (
                    <button className="dropdown-item" role="menuitem"
                      onClick={() => { setProfileOpen(false); setApplyOpen(true); }}>
                      <IconStar /> Apply as Mayor
                    </button>
                  )}
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item danger" role="menuitem" onClick={onLogout}>
                    <IconSignOut /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* ── Mobile bottom bar (display:none on desktop, display:flex on ≤760px via index.css) ── */}
      {/* Matches the existing .mobile-bottom-nav + .mobile-nav-item pattern exactly */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ key, mobileLabel, icon }) => (
          <button
            key={key}
            className={`mobile-nav-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => onTabChange(key)}
            aria-current={activeTab === key ? 'page' : undefined}
          >
            {icon}
            <span>{mobileLabel}</span>
          </button>
        ))}

        {/* "Apply" replaces a nav slot on mobile for students */}
        {canApply && (
          <button className="mobile-nav-item" onClick={() => setApplyOpen(true)} aria-label="Apply as Mayor">
            <IconStar />
            <span>Apply</span>
          </button>
        )}
      </nav>

      {applyOpen && <ApplyMayorModal user={user} onClose={() => setApplyOpen(false)} />}
    </>
  );
}