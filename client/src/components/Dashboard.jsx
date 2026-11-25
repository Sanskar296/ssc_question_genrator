import React from 'react';
import {
  Calendar,
  Flame,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  Megaphone
} from 'lucide-react';

export default function Dashboard({
  dashboardData,
  onNavigate,
  onStartDailyTest,
  onAcknowledgePenalty,
  user
}) {
  const data = dashboardData || {};
  const penalty = data.penalty_alert;
  const recentTests = data.recent_activity || [];

  const accuracy = user?.analytics?.overall_accuracy_pct || data?.accuracy_overall || 0;
  const streak = data.current_streak || user?.analytics?.current_streak || 0;
  const points = data.points || user?.analytics?.points || 0;
  const testsCompleted = user?.analytics?.total_tests_completed || (recentTests.length > 0 ? recentTests.length : 0);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Highlighted Missed-Test Dialogue (Warning Banner) */}
      {penalty && !penalty.acknowledged && (
        <div className="penalty-dialogue-banner">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div className="penalty-icon-box">
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span className="penalty-tag">Missed Daily Challenge</span>
                <span style={{ fontSize: '0.72rem', color: '#b45309' }}>Date: {penalty.missed_date}</span>
              </div>
              <p className="penalty-text">
                {penalty.dialogue}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={onStartDailyTest}
                  className="btn btn-primary btn-sm"
                >
                  <Sparkles size={14} />
                  <span>Start Today's Test & Recover Streak</span>
                </button>
                <button
                  onClick={() => onAcknowledgePenalty(penalty.missed_date)}
                  className="btn btn-secondary btn-sm"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Title & Live Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Welcome back{user?.full_name ? `, ${user.full_name}` : user?.username ? `, ${user.username}` : ''}! Keep up the great work.
          </p>
        </div>

        {/* Date pill with calendar icon */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <Calendar size={14} style={{ color: '#2563eb' }} />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Hero Exam Challenge Announcement Banner */}
      <div className="hero-challenge-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '720px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 8px rgba(37,99,235,0.25)' }}>
            <Megaphone size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Daily Subject Challenge is Live!
              </span>
              <span className="badge badge-active" style={{ fontSize: '0.62rem' }}>
                30 Questions • 30 Mins
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
              Test your knowledge across 10 English PYQs + 10 General Awareness PYQs + 10 Lucent GK facts and earn +20 pts.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>English (10 Qs)</span>
              <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>General Awareness (10 Qs)</span>
              <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>Lucent GK (10 Qs)</span>
            </div>
          </div>
        </div>

        <button
          onClick={onStartDailyTest}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.88rem' }}
        >
          <span>Join Challenge</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Layers size={20} />
          </div>
          <div>
            <div className="metric-label">Active Modules</div>
            <div className="metric-value">2</div>
            <div className="metric-sub">GA &amp; English Language</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Award size={20} />
          </div>
          <div>
            <div className="metric-label">Tests Completed</div>
            <div className="metric-value">{testsCompleted}</div>
            <div className="metric-sub">Daily tests finalized</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <Flame size={20} />
          </div>
          <div>
            <div className="metric-label">Daily Streak</div>
            <div className="metric-value mono">{streak}d</div>
            <div className="metric-sub">Personal consistency</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="metric-label">Average Accuracy</div>
            <div className="metric-value mono">{accuracy}%</div>
            <div className="metric-sub">Across all subjects</div>
          </div>
        </div>
      </div>

      {/* Performance Overview & Weak Subject Highlights */}
      <div className="performance-grid">
        {/* Left: Last Exam Performance Circular Gauge */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Last Exam Performance
            </h3>
            <button
              onClick={() => onNavigate('history')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              View all
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Visual Progress Dial */}
            <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100" height="100" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="3.2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.2"
                  strokeDasharray={`${Math.max(accuracy, 5)}, 100`}
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1 }} className="mono">{accuracy}%</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Score</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                SSC CHSL Tier-I Practice
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {recentTests.length > 0 ? `Latest: ${recentTests[0].date || recentTests[0].test_date}` : 'No daily test attempts submitted today.'}
              </div>
              <button
                onClick={() => onNavigate('daily-test')}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px' }}
              >
                <span>{data.daily_test_status === 'completed' ? 'Review Test Results →' : 'Take Daily Test →'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Weak Areas & Focus Topics */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Subject Preparation Status
            </h3>
            <span className="badge badge-active" style={{ fontSize: '0.62rem' }}>Tier-I 2026</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="subject-bar-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>General Awareness (PYQs + Lucent)</span>
              </div>
              <button
                onClick={() => onNavigate('ga-pyqs')}
                className="btn btn-outline btn-sm"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              >
                Practice PYQs
              </button>
            </div>

            <div className="subject-bar-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>English Language (3,198 PYQs)</span>
              </div>
              <button
                onClick={() => onNavigate('english-pyqs')}
                className="btn btn-outline btn-sm"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              >
                Practice PYQs
              </button>
            </div>

            <div className="subject-bar-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-dim)' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>General Intelligence</span>
              </div>
              <span className="badge badge-inactive" style={{ fontSize: '0.6rem' }}>Coming Soon</span>
            </div>

            <div className="subject-bar-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-dim)' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Quantitative Aptitude</span>
              </div>
              <span className="badge badge-inactive" style={{ fontSize: '0.6rem' }}>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Test Attempts History Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Recent Test Attempts
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit ledger of your daily challenge submissions</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="btn btn-outline btn-sm"
          >
            All History
          </button>
        </div>

        {recentTests.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ fontSize: '0.85rem' }}>No recent tests recorded yet.</p>
            <button
              onClick={onStartDailyTest}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '10px' }}
            >
              Start Today's Test Now
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                  <th style={{ padding: '8px 12px' }}>Test Type</th>
                  <th style={{ padding: '8px 12px' }}>Score</th>
                  <th style={{ padding: '8px 12px' }}>Accuracy</th>
                  <th style={{ padding: '8px 12px' }}>Points Earned</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.slice(0, 5).map((test, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{test.test_date || test.date}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                        Daily 30Q Test
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }} className="mono">{test.score || test.correct_count || 0}/30</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                        {test.accuracy_pct || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: 700 }}>
                      +{test.points_earned || 20} pts
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate('daily-test')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
