import React, { useState, useEffect } from 'react';
import { History, Calendar, CheckCircle2, Award, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function TestHistoryView({ user, onReviewTest }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.getDailyTestHistory();
      setHistory(res.attempts || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '12px' }}></div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading test history...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} /> Daily Test Attempt History
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            All your submitted daily challenges, accuracy percentages, and point rewards stored in MongoDB.
          </p>
        </div>
        <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
          {history.length} Completed Tests
        </span>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>No past test attempts found.</p>
          <p style={{ fontSize: '0.76rem' }}>Complete today's Daily Test from the sidebar to start recording history.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.map((item, idx) => (
            <div key={idx} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Daily Challenge – {item.test_date}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.total_questions} Questions • {item.correct_answers} Correct • {item.skipped_answers} Skipped • Duration: {Math.round((item.duration_seconds || 0) / 60)}m
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }} className="mono">{item.accuracy_pct}%</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
                </div>

                <div className="badge badge-active" style={{ fontSize: '0.72rem', padding: '6px 12px' }}>
                  +{item.points_earned} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
