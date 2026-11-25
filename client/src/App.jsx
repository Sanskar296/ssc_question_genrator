import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DailyTestView from './components/DailyTestView';
import PYQSearch from './components/PYQSearch';
import LucentQuestionGen from './components/LucentQuestionGen';
import EnglishPractice from './components/EnglishPractice';
import ReviseProgress from './components/ReviseProgress';
import AchievementsView from './components/AchievementsView';
import TestHistoryView from './components/TestHistoryView';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import { api, getStoredToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [sectionsData, setSectionsData] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [gamification, setGamification] = useState({ points: 0, current_streak: 0, badges: [] });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('study_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('study_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const sec = await api.getSections();
      setSectionsData(sec);
    } catch (err) {
      console.error('Failed to load sections data:', err);
    }

    if (getStoredToken()) {
      try {
        const profile = await api.getMe();
        setUser(profile);
        refreshGamification();
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        api.logout();
        setUser(null);
      }
    }
  };

  const refreshGamification = async () => {
    try {
      const [dash, game] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getGamificationProgress()
      ]);
      if (dash.status === 'fulfilled') setDashboardData(dash.value);
      if (game.status === 'fulfilled') setGamification(game.value);
    } catch (err) {
      console.error('Failed to refresh gamification:', err);
    }
  };

  const handleAuthSuccess = (authData) => {
    setUser({
      user_id: authData.user_id,
      username: authData.username,
      client_ip: authData.client_ip,
      email: authData.email,
      full_name: authData.full_name || authData.username,
      target_exam: authData.target_exam || 'SSC CHSL 2026 Dec',
      analytics: {
        total_questions_attempted: 0,
        total_correct: 0,
        overall_accuracy_pct: 0
      }
    });
    fetchInitialData();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setDashboardData(null);
    setGamification({ points: 0, current_streak: 0, badges: [] });
  };

  const refreshUserProfile = async () => {
    if (getStoredToken()) {
      try {
        const profile = await api.getMe();
        setUser(profile);
        refreshGamification();
      } catch (err) {
        console.error('Failed to refresh user stats:', err);
      }
    }
  };

  const dailyTestStatus = dashboardData?.daily_test?.status || 'available';

  return (
    <div className="app-shell">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileNavOpen}
        setMobileOpen={setMobileNavOpen}
        streak={gamification.current_streak || user?.analytics?.current_streak || 0}
        points={gamification.points || user?.analytics?.points || 0}
        dailyTestStatus={dailyTestStatus}
      />

      {/* Main Layout Area */}
      <div className="main-layout">
        <Navbar
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileNav={() => setMobileNavOpen(prev => !prev)}
        />

        <main className="container" style={{ flex: 1, padding: '1.25rem 0' }}>
          {/* Main workspace view routing */}
          {activeView === 'dashboard' && (
            <Dashboard
              user={user}
              onNavigate={setActiveView}
              onOpenAuth={() => setIsAuthOpen(true)}
              onRefreshStats={refreshGamification}
            />
          )}

          {activeView === 'daily-test' && (
            <DailyTestView
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onTestCompleted={refreshUserProfile}
              onBackToDashboard={() => setActiveView('dashboard')}
            />
          )}

          {activeView === 'ga-pyqs' && (
            <PYQSearch user={user} onAttemptRecorded={refreshUserProfile} />
          )}

          {activeView === 'ga-lucent' && (
            <LucentQuestionGen user={user} onAttemptRecorded={refreshUserProfile} />
          )}

          {activeView === 'ga-topics' && (
            <PYQSearch user={user} onAttemptRecorded={refreshUserProfile} />
          )}

          {activeView === 'english-pyqs' && (
            <EnglishPractice
              user={user}
              onAttemptRecorded={refreshUserProfile}
              initialFilter="all"
            />
          )}

          {activeView === 'english-topics' && (
            <EnglishPractice
              user={user}
              onAttemptRecorded={refreshUserProfile}
              initialFilter="all"
            />
          )}

          {activeView === 'english-vocab' && (
            <EnglishPractice
              user={user}
              onAttemptRecorded={refreshUserProfile}
              initialFilter="Synonyms and antonyms"
            />
          )}

          {activeView === 'progress' && (
            <ReviseProgress user={user} onAttemptRecorded={refreshUserProfile} />
          )}

          {activeView === 'achievements' && (
            <AchievementsView
              user={user}
              gamification={gamification}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}

          {activeView === 'history' && (
            <TestHistoryView
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'settings' && (
            <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Account & Application Settings</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preferences for Daily Practice – SSC CHSL</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Visual Theme</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current mode: {theme === 'dark' ? 'Pure Black' : 'Clean White'}</div>
                  </div>
                  <button onClick={toggleTheme} className="btn btn-outline btn-sm">
                    Toggle Mode
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Account Profile</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {user ? `Signed in as ${user.username} (${user.email || 'No email'})` : 'Guest Mode (Progress stored locally)'}
                    </div>
                  </div>
                  {user ? (
                    <button onClick={() => setIsProfileOpen(true)} className="btn btn-secondary btn-sm">
                      View Profile
                    </button>
                  ) : (
                    <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary btn-sm">
                      Sign In
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Daily Test Rules</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      30 questions daily: 10 English PYQs + 10 GA PYQs + 10 Lucent Questions. Reset at midnight UTC.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-main)', padding: '1.25rem 0', fontSize: '0.72rem', color: 'var(--text-muted)', transition: 'background-color 0.2s ease, border-color 0.2s ease' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>Daily Practice – SSC CHSL Intelligent Assistant</div>
            <div>General Awareness (12,968 PYQs + 672p Lucent) &amp; English (3,240 PYQs) Active</div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
}
