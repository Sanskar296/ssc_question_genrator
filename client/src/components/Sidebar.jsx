import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
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
  Lock,
  X
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
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Top Header */}
        <div className="sidebar-header">
          {!collapsed ? (
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <BookOpen size={16} />
              </div>
              <div>
                <div className="sidebar-brand-title">Daily Practice</div>
                <div className="sidebar-brand-sub">SSC CHSL Tier-I</div>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand-icon-centered">
              <BookOpen size={18} />
            </div>
          )}

          {/* Close for mobile, collapse toggle for desktop */}
          <button
            className="sidebar-collapse-btn mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close Mobile Sidebar"
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
              <Flame size={13} className={streak > 0 ? "streak-flame" : ""} />
              <span>{streak}d Streak</span>
            </div>
            <div className="quick-stat-pill" title="Total Preparation Points">
              <Zap size={13} />
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
              <LayoutDashboard size={17} />
              {!collapsed && <span className="nav-label">Dashboard</span>}
            </button>

            <button
              onClick={() => handleNav('daily-test')}
              className={`nav-item ${isViewActive('daily-test') ? 'active' : ''}`}
              title="Daily Test"
            >
              <CalendarCheck size={17} />
              {!collapsed && (
                <>
                  <span className="nav-label">Daily Test</span>
                  <span className={`badge ${dailyTestStatus === 'completed' ? 'badge-outline' : 'badge-active'}`} style={{ fontSize: '0.58rem', marginLeft: 'auto' }}>
                    {dailyTestStatus === 'completed' ? 'Done' : '30 Qs'}
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
                  <Compass size={15} />
                  <span>General Awareness</span>
                </div>
                <ChevronDown size={12} className={`arrow-icon ${gaOpen ? 'rotate' : ''}`} />
              </div>
            ) : (
              <button
                onClick={() => handleNav('ga-pyqs')}
                className={`nav-item ${isViewActive('ga-pyqs') ? 'active' : ''}`}
                title="General Awareness PYQs"
              >
                <Compass size={17} />
              </button>
            )}

            {(!collapsed && gaOpen) && (
              <div className="nav-sub-list">
                <button
                  onClick={() => handleNav('ga-pyqs')}
                  className={`nav-sub-item ${isViewActive('ga-pyqs') ? 'active' : ''}`}
                >
                  <Layers size={13} />
                  <span>All PYQs</span>
                </button>
                <button
                  onClick={() => handleNav('ga-lucent')}
                  className={`nav-sub-item ${isViewActive('ga-lucent') ? 'active' : ''}`}
                >
                  <BookOpen size={13} />
                  <span>Lucent Generator</span>
                </button>
                <button
                  onClick={() => handleNav('ga-topics')}
                  className={`nav-sub-item ${isViewActive('ga-topics') ? 'active' : ''}`}
                >
                  <Filter size={13} />
                  <span>Topic-wise Practice</span>
                </button>
              </div>
            )}
          </div>

          {/* English Sub-tree (ACTIVATED) */}
          <div className="nav-group">
            {!collapsed ? (
              <div
                className="nav-header"
                onClick={() => setEnglishOpen(!englishOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={15} />
                  <span>English</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-active" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>Active</span>
                  <ChevronDown size={12} className={`arrow-icon ${englishOpen ? 'rotate' : ''}`} />
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleNav('english-pyqs')}
                className={`nav-item ${isViewActive('english-pyqs') ? 'active' : ''}`}
                title="English Language PYQs"
              >
                <FileText size={17} />
              </button>
            )}

            {(!collapsed && englishOpen) && (
              <div className="nav-sub-list">
                <button
                  onClick={() => handleNav('english-pyqs')}
                  className={`nav-sub-item ${isViewActive('english-pyqs') ? 'active' : ''}`}
                >
                  <Layers size={13} />
                  <span>English PYQs (3,198)</span>
                </button>
                <button
                  onClick={() => handleNav('english-topics')}
                  className={`nav-sub-item ${isViewActive('english-topics') ? 'active' : ''}`}
                >
                  <Filter size={13} />
                  <span>Topic-wise Practice</span>
                </button>
                <button
                  onClick={() => handleNav('english-vocab')}
                  className={`nav-sub-item ${isViewActive('english-vocab') ? 'active' : ''}`}
                >
                  <BookOpen size={13} />
                  <span>Vocabulary Practice</span>
                </button>
              </div>
            )}
          </div>

          <div className="nav-divider" />

          {/* Coming Soon Sections */}
          <div className="nav-group">
            <div className={`nav-item disabled`} title="General Intelligence (Coming Soon)">
              <Brain size={17} />
              {!collapsed && (
                <>
                  <span className="nav-label text-dim">General Intelligence</span>
                  <span className="badge badge-inactive" style={{ fontSize: '0.55rem', marginLeft: 'auto' }}>Soon</span>
                </>
              )}
            </div>

            <div className={`nav-item disabled`} title="Quantitative Aptitude (Coming Soon)">
              <Calculator size={17} />
              {!collapsed && (
                <>
                  <span className="nav-label text-dim">Quantitative Aptitude</span>
                  <span className="badge badge-inactive" style={{ fontSize: '0.55rem', marginLeft: 'auto' }}>Soon</span>
                </>
              )}
            </div>
          </div>

          <div className="nav-divider" />

          {/* Gamification & User Records */}
          <div className="nav-group">
            <button
              onClick={() => handleNav('progress')}
              className={`nav-item ${isViewActive('progress') ? 'active' : ''}`}
              title="My Progress & Revision"
            >
              <RotateCcw size={17} />
              {!collapsed && <span className="nav-label">My Progress</span>}
            </button>

            <button
              onClick={() => handleNav('achievements')}
              className={`nav-item ${isViewActive('achievements') ? 'active' : ''}`}
              title="Achievements & Rewards"
            >
              <Trophy size={17} />
              {!collapsed && <span className="nav-label">Achievements</span>}
            </button>

            <button
              onClick={() => handleNav('history')}
              className={`nav-item ${isViewActive('history') ? 'active' : ''}`}
              title="Test History"
            >
              <History size={17} />
              {!collapsed && <span className="nav-label">Test History</span>}
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`nav-item ${isViewActive('settings') ? 'active' : ''}`}
              title="Settings"
            >
              <Settings size={17} />
              {!collapsed && <span className="nav-label">Settings</span>}
            </button>
          </div>
        </div>

        {/* Footer info in sidebar */}
        {!collapsed && (
          <div className="sidebar-footer">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              SSC CHSL Preparation
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              GA + English + Lucent Engine
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
