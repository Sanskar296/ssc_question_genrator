import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Flame,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Layers,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Highlighted Missed-Test Dialogue (Warning / Amber Accent) */}
      {penalty && !penalty.acknowledged && (
        <div className="penalty-dialogue-banner">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div className="penalty-icon-box">
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span className="penalty-tag">Missed Daily Challenge</span>
                <span style={{ fontSize: '0.72rem', color: '#ffb74d' }}>Date: {penalty.missed_date}</span>
              </div>
              <p className="penalty-text">
                {penalty.dialogue}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={onStartDailyTest}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#ffa726', color: '#000000', borderColor: '#ffa726' }}
                >
                  <Sparkles size={13} />
                  <span>Start Today's Test & Recover Streak</span>
                </button>
                <button
                  onClick={() => onAcknowledgePenalty(penalty.missed_date)}
                  className="btn btn-outline btn-sm"
                  style={{ color: '#ffa726', borderColor: 'rgba(255, 167, 38, 0.4)' }}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome & Quick Stats Bar */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {data.greeting || "Welcome to Daily Practice"}
            </h1>
            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
              {data.target_exam || "SSC CHSL Tier-I"}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Today: <strong>{data.today_date || new Date().toISOString().split('T')[0]}</strong> • Structured practice across English, General Awareness, and Lucent GK.
          </p>
        </div>

        {/* Gamification Pills */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
            <Flame size={20} className={data.current_streak > 0 ? "streak-flame" : ""} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }} className="mono">{data.current_streak || 0}d</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Streak</div>
            </div>
          </div>

          <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
            <Zap size={20} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }} className="mono">{data.points || 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Focus: Today's Daily Test Card */}
      <div className="card" style={{ padding: '1.5rem', border: '2px solid var(--border-strong)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--text-main)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Today's Daily Challenge</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                30 Questions • 30 Minutes • 10 English + 10 General Awareness + 10 Lucent GK
              </div>
            </div>
          </div>

          <div>
            {data.daily_test_status === 'completed' ? (
              <span className="badge badge-active" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Completed for Today
              </span>
            ) : data.daily_test_status === 'in_progress' ? (
              <span className="badge badge-outline" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                <Clock size={13} style={{ marginRight: 4 }} /> In Progress
              </span>
            ) : (
              <span className="badge badge-outline" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                Ready to Start
              </span>
            )}
          </div>
        </div>

        {/* Section Pills breakdown inside test */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
          <div style={{ padding: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Section 1</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>10 English PYQs</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Synonyms, Errors, Cloze</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Section 2</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>10 General Awareness</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Polity, History, Science</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Section 3</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>10 Lucent Generated</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Textbook Fact Mastery</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Reward: <strong>+20 pts</strong> for completion • <strong>+2 pts</strong> per correct answer • <strong>+15 bonus</strong> for 80%+ accuracy
          </div>
          <button
            onClick={onStartDailyTest}
            className="btn btn-primary"
            style={{ padding: '9px 20px', fontSize: '0.85rem' }}
          >
            <span>{data.daily_test_status === 'completed' ? 'Review Test Results' : data.daily_test_status === 'in_progress' ? 'Continue Test' : 'Start Daily Test'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Performance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Overall Accuracy</span>
            <Target size={16} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data.overall_accuracy_pct || 0}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Across all attempted questions</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Tests Completed</span>
            <Award size={16} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data.total_tests_completed || 0}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Daily Challenges finalized</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Weekly Consistency</span>
            <TrendingUp size={16} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data.weekly_completion_rate || 0}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Last 7 days completion rate</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Longest Streak</span>
            <Flame size={16} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data.longest_streak || 0}d</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Personal best record</div>
        </div>
      </div>

      {/* Active Subject Modules Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* General Awareness */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>General Awareness</div>
            <span className="badge badge-active" style={{ fontSize: '0.62rem' }}>Active Focus</span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
            Authentic PYQ bank covering 14 General Awareness topics along with 672 Lucent GK textbook pages.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onNavigate('ga-pyqs')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1 }}
            >
              <Layers size={13} />
              <span>PYQs (2,158)</span>
            </button>
            <button
              onClick={() => onNavigate('ga-lucent')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1 }}
            >
              <BookOpen size={13} />
              <span>Lucent (672 P.)</span>
            </button>
          </div>
        </div>

        {/* English Module */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>English Language</div>
            <span className="badge badge-active" style={{ fontSize: '0.62rem' }}>Activated</span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
            3,198 authentic SSC CHSL English questions with verified answer keys across 13 syllabus topics.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onNavigate('english-pyqs')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1 }}
            >
              <Layers size={13} />
              <span>Practice PYQs</span>
            </button>
            <button
              onClick={() => onNavigate('english-topics')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1 }}
            >
              <span>Topic Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Completed Daily Tests</div>
          <button onClick={() => onNavigate('history')} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem' }}>
            View Full History
          </button>
        </div>

        {recentTests.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No test attempts completed yet. Start today's daily test above to build your performance profile!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Questions</th>
                  <th style={{ padding: '8px' }}>Accuracy</th>
                  <th style={{ padding: '8px' }}>Score</th>
                  <th style={{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 8px' }}>{t.test_date}</td>
                    <td style={{ padding: '10px 8px' }}>{t.total_questions} Qs</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }} className="mono">{t.accuracy_pct}%</td>
                    <td style={{ padding: '10px 8px' }} className="mono">{t.score} pts</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.6rem' }}>Completed</span>
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
