import React from 'react';
import {
  Compass,
  FileText,
  Brain,
  Calculator,
  RotateCcw,
  Trophy,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  BookOpen,
  Filter,
  Flame,
  Zap,
  X,
  GraduationCap
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  streak = 0,
  points = 0,
  dailyTestStatus = 'available'
}) {
  const [gaOpen, setGaOpen] = useState(true);
  const [englishOpen, setEnglishOpen] = useState(true);

  const handleNav = (viewKey) => {
    setActiveView(viewKey);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const isViewActive = (viewKey) => activeView === viewKey;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Top Portal Header */}
        <div className="sidebar-header">
          {!collapsed ? (
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <GraduationCap size={18} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div className="sidebar-brand-title">CBT NOVA</div>
                <div className="sidebar-brand-sub">SSC CHSL Exam Portal</div>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand-icon-centered">
              <GraduationCap size={20} />
            </div>
          )}

          {/* Close for mobile drawer, collapse toggle for desktop */}
          <button
            className="sidebar-collapse-btn mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close Navigation"
          >
            <X size={16} />
          </button>
          <button
            className="sidebar-collapse-btn desktop-collapse"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick Gamification Bar (Streaks & Points) */}
        {!collapsed && (
          <div className="sidebar-quick-stats">
            <div className="quick-stat-pill" title="Current Daily Streak">
              <Flame size={14} className={streak > 0 ? "streak-flame" : ""} />
              <span>{streak}d Streak</span>
            </div>
            <div className="quick-stat-pill" title="Preparation Points">
              <Zap size={14} style={{ color: '#2563eb' }} />
              <span>{points} pts</span>
            </div>
          </div>
        )}

        {/* Navigation Items List */}
        <div className="sidebar-nav-scroll">
          {/* Main Core */}
          <div className="nav-group">
            <button
              onClick={() => handleNav('dashboard')}
              className={`nav-item ${isViewActive('dashboard') ? 'active' : ''}`}
              title="Dashboard"
            >
              {/* Exam portal home icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {!collapsed && <span className="nav-label">Dashboard</span>}
            </button>

            <button
              onClick={() => handleNav('daily-test')}
              className={`nav-item ${isViewActive('daily-test') ? 'active' : ''}`}
              title="Daily Challenge Test"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              {!collapsed && (
                <>
                  <span className="nav-label">Subject Challenge</span>
                  <span className={`badge ${dailyTestStatus === 'completed' ? 'badge-outline' : 'badge-active'}`} style={{ fontSize: '0.62rem', marginLeft: 'auto' }}>
                    {dailyTestStatus === 'completed' ? 'Done' : 'Live'}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="nav-divider" />

          {/* General Awareness Sub-tree */}
          <div className="nav-group">
            {!collapsed ? (
              <div
                className="nav-header"
                onClick={() => setGaOpen(!gaOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={16} style={{ color: '#2563eb' }} />
                  <span>General Awareness</span>
                </div>
                <ChevronDown size={14} className={`arrow-icon ${gaOpen ? 'rotate' : ''}`} />
              </div>
            ) : (
              <button
                onClick={() => handleNav('ga-pyqs')}
                className={`nav-item ${isViewActive('ga-pyqs') ? 'active' : ''}`}
                title="General Awareness PYQs"
              >
                <Compass size={18} />
              </button>
            )}

            {!collapsed && gaOpen && (
              <div className="nav-sub-list">
                <button
                  onClick={() => handleNav('ga-pyqs')}
                  className={`nav-sub-item ${isViewActive('ga-pyqs') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={13} />
                    <span>All PYQs</span>
                  </div>
                  <span className="badge badge-outline" style={{ fontSize: '0.6rem' }}>2,158</span>
                </button>

                <button
                  onClick={() => handleNav('ga-lucent')}
                  className={`nav-sub-item ${isViewActive('ga-lucent') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={13} />
                    <span>Lucent Generator</span>
                  </div>
                  <span className="badge badge-outline" style={{ fontSize: '0.6rem' }}>672p</span>
                </button>

                <button
                  onClick={() => handleNav('ga-topics')}
                  className={`nav-sub-item ${isViewActive('ga-topics') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={13} />
                    <span>Topic-wise Practice</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* English Sub-tree */}
          <div className="nav-group">
            {!collapsed ? (
              <div
                className="nav-header"
                onClick={() => setEnglishOpen(!englishOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#10b981' }} />
                  <span>English Language</span>
                </div>
                <ChevronDown size={14} className={`arrow-icon ${englishOpen ? 'rotate' : ''}`} />
              </div>
            ) : (
              <button
                onClick={() => handleNav('english-pyqs')}
                className={`nav-item ${isViewActive('english-pyqs') ? 'active' : ''}`}
                title="English Language PYQs"
              >
                <FileText size={18} />
              </button>
            )}

            {!collapsed && englishOpen && (
              <div className="nav-sub-list">
                <button
                  onClick={() => handleNav('english-pyqs')}
                  className={`nav-sub-item ${isViewActive('english-pyqs') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={13} />
                    <span>English PYQs</span>
                  </div>
                  <span className="badge badge-active" style={{ fontSize: '0.6rem' }}>3,198</span>
                </button>

                <button
                  onClick={() => handleNav('english-topics')}
                  className={`nav-sub-item ${isViewActive('english-topics') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={13} />
                    <span>Topic-wise Practice</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('english-vocab')}
                  className={`nav-sub-item ${isViewActive('english-vocab') ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={13} />
                    <span>Vocabulary Practice</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="nav-divider" />

          {/* Upcoming Subjects */}
          <div className="nav-group">
            <div className="nav-item disabled" title="General Intelligence (Coming Soon)">
              <Brain size={18} />
              {!collapsed && (
                <>
                  <span className="nav-label" style={{ color: 'var(--text-dim)' }}>General Intelligence</span>
                  <span className="badge badge-inactive" style={{ fontSize: '0.55rem', marginLeft: 'auto' }}>Soon</span>
                </>
              )}
            </div>

            <div className="nav-item disabled" title="Quantitative Aptitude (Coming Soon)">
              <Calculator size={18} />
              {!collapsed && (
                <>
                  <span className="nav-label" style={{ color: 'var(--text-dim)' }}>Quantitative Aptitude</span>
                  <span className="badge badge-inactive" style={{ fontSize: '0.55rem', marginLeft: 'auto' }}>Soon</span>
                </>
              )}
            </div>
          </div>

          <div className="nav-divider" />

          {/* Performance & Results */}
          <div className="nav-group">
            <button
              onClick={() => handleNav('progress')}
              className={`nav-item ${isViewActive('progress') ? 'active' : ''}`}
              title="My Results & Analytics"
            >
              <RotateCcw size={18} />
              {!collapsed && <span className="nav-label">My Results</span>}
            </button>

            <button
              onClick={() => handleNav('achievements')}
              className={`nav-item ${isViewActive('achievements') ? 'active' : ''}`}
              title="Achievements & Badges"
            >
              <Trophy size={18} />
              {!collapsed && <span className="nav-label">Achievements</span>}
            </button>

            <button
              onClick={() => handleNav('history')}
              className={`nav-item ${isViewActive('history') ? 'active' : ''}`}
              title="Test History"
            >
              <History size={18} />
              {!collapsed && <span className="nav-label">Test History</span>}
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`nav-item ${isViewActive('settings') ? 'active' : ''}`}
              title="Settings"
            >
              <Settings size={18} />
              {!collapsed && <span className="nav-label">Settings</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Callout Card */}
        {!collapsed && (
          <div style={{ padding: '0.75rem', margin: '0 0.5rem 0.5rem 0.5rem', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', borderRadius: 'var(--radius-md)', color: '#ffffff' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Ready to ace your exam?</div>
            <div style={{ fontSize: '0.68rem', color: '#dbeafe', lineHeight: 1.35, marginBottom: '8px' }}>
              Practice daily with verified SSC CHSL PYQs and hit your target score.
            </div>
            <button
              onClick={() => handleNav('daily-test')}
              style={{ width: '100%', padding: '6px 10px', background: '#ffffff', color: '#1e3a8a', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Start Practice Now →
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
