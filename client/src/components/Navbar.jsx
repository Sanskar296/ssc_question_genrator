import React from 'react';
import {
  LogIn,
  LogOut,
  Sun,
  Moon,
  Menu,
  GraduationCap,
  Bell
} from 'lucide-react';

export default function Navbar({
  user,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  theme,
  onToggleTheme,
  onToggleMobileNav
}) {
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="header">
      <div className="container header-inner">
        {/* Left: Mobile hamburger & CBT Portal Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onToggleMobileNav && (
            <button
              onClick={onToggleMobileNav}
              className="mobile-nav-toggle"
              aria-label="Toggle Navigation"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="brand">
            <div className="brand-icon">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="brand-title">
                <span>CBT NOVA</span>
                <span className="badge badge-active" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                  SSC CHSL
                </span>
              </div>
              <div className="brand-subtitle">Practice. Improve. Succeed.</div>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Theme Switcher & Student Account Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Mode Toggle (White Exam Portal / Dark Mode) */}
          <button
            onClick={onToggleTheme}
            className="sidebar-collapse-btn"
            title={`Switch to ${theme === 'dark' ? 'Modern White Exam Portal' : 'Dark Mode'}`}
            aria-label="Toggle Theme"
            style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)' }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notification bell */}
          <div
            className="sidebar-collapse-btn"
            style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', position: 'relative' }}
            title="System Updates: English & Daily Challenges active"
          >
            <Bell size={17} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#2563eb'
              }}
            />
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={onOpenProfile}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px 4px 6px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {/* Circular student avatar */}
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {getInitials(user.full_name || user.username)}
                </div>
                <div style={{ textAlign: 'left', marginRight: '4px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.1 }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    Student
                  </div>
                </div>
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="sidebar-collapse-btn"
                style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-primary btn-sm">
              <LogIn size={15} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
