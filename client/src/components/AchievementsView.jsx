import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Flame, Award, CheckCircle2, Clock, History as HistoryIcon, ArrowUpRight } from 'lucide-react';
import { api } from '../api';

export default function AchievementsView({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const res = await api.getGamificationProgress();
      setData(res);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '12px' }}></div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading achievements & rewards...</div>
      </div>
    );
  }

  const achievements = data?.achievements || [];
  const transactions = data?.recent_transactions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Zap size={20} style={{ margin: '0 auto 6px auto' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data?.points || 0}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Earned Points</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Flame size={20} className={data?.current_streak > 0 ? "streak-flame" : ""} style={{ margin: '0 auto 6px auto' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data?.current_streak || 0}d</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Streak</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Trophy size={20} style={{ margin: '0 auto 6px auto' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data?.longest_streak || 0}d</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Longest Streak</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Award size={20} style={{ margin: '0 auto 6px auto' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }} className="mono">{data?.total_tests_completed || 0}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tests Completed</div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} /> SSC CHSL Milestone Badges
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {achievements.map((ach) => (
            <div
              key={ach.id}
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: ach.unlocked ? 'var(--bg-main)' : 'var(--bg-card)',
                border: ach.unlocked ? '1px solid var(--text-main)' : '1px dashed var(--border-subtle)',
                opacity: ach.unlocked ? 1 : 0.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: ach.unlocked ? 'var(--text-main)' : 'var(--border-subtle)',
                  color: ach.unlocked ? 'var(--bg-main)' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Award size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ach.title}</div>
                  {ach.unlocked && (
                    <span className="badge badge-active" style={{ fontSize: '0.58rem' }}>Unlocked</span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {ach.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point Transaction Ledger */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>Points Ledger & Audit History</h3>
        {transactions.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            No point transactions recorded yet. Complete daily tests to earn points!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Type</th>
                  <th style={{ padding: '8px' }}>Reason</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px' }}>{tx.created_at ? tx.created_at.split('T')[0] : 'Today'}</td>
                    <td style={{ padding: '8px' }}>
                      <span className="badge badge-outline" style={{ fontSize: '0.62rem' }}>{tx.transaction_type}</span>
                    </td>
                    <td style={{ padding: '8px' }}>{tx.reason}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }} className="mono">
                      {tx.points > 0 ? `+${tx.points}` : tx.points}
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
