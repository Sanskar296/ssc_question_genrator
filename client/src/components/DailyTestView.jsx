import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  Flame,
  Zap
} from 'lucide-react';
import { api } from '../api';

export default function DailyTestView({
  user,
  onOpenAuth,
  onTestCompleted,
  onTestSubmitted,
  onBackToDashboard,
  onNavigateDashboard
}) {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('All');
  const [currentQIndex, setCurrentQIndex] = useState(0); // 0 to 29
  const [answers, setAnswers] = useState({});
  const [flaggedIds, setFlaggedIds] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadTodayTest();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!result && testData && testData.status !== 'completed' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [result, testData, timeLeft]);

  const loadTodayTest = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTodayDailyTest();
      setTestData(data);

      if (data.status === 'completed') {
        // If already completed today, load results
        const history = await api.getDailyTestHistory();
        const existingAttempt = (history.attempts || []).find(a => a.daily_test_id === data._id);
        if (existingAttempt) {
          setResult(existingAttempt);
        }
      } else if (data.status === 'available') {
        // Start test
        await api.startDailyTest();
      }
    } catch (err) {
      setError(err.message || 'Failed to load today\'s daily test.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qid, optionText) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [qid]: optionText }));
  };

  const toggleFlag = (qid) => {
    setFlaggedIds(prev => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const handleSubmitTest = async () => {
    if (!testData || isSubmitting) return;

    const unansweredCount = (testData.questions || []).length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(`You have ${unansweredCount} unanswered question(s). Are you sure you want to finalize and submit?`);
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      const durationSeconds = 1800 - timeLeft;
      const res = await api.submitDailyTest(testData._id, answers, durationSeconds);
      setResult(res);
      if (onTestSubmitted) onTestSubmitted(res);
      if (onTestCompleted) onTestCompleted(res);
    } catch (err) {
      alert(err.message || 'Error submitting daily test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '14px' }}></div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Preparing today's structured 30-question test...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#ffaaaa', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>
        <button onClick={loadTodayTest} className="btn btn-outline btn-sm">Try Again</button>
      </div>
    );
  }

  const questions = testData?.questions || [];
  const currentQ = questions[currentQIndex] || questions[0];

  // If Test Completed, Show Results View
  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Dialogue Banner */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '2px solid var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--text-main)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>Daily Challenge Completed</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Test Date: {result.test_date}</div>
            </div>
          </div>

          <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.6, padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid var(--text-main)' }}>
            "{result.dialogue}"
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <div className="badge badge-active" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              <Zap size={13} style={{ marginRight: 4 }} /> +{result.points_earned} Total Points Added
            </div>
            {result.bonus_reasons && result.bonus_reasons.map((b, i) => (
              <span key={i} className="badge badge-outline" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                ★ {b}
              </span>
            ))}
          </div>
        </div>

        {/* Score & Accuracy Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }} className="mono">{result.accuracy_pct}%</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Correct Answers</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }} className="mono">{result.correct_answers} / {result.total_questions}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incorrect</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }} className="mono">{result.incorrect_answers}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }} className="mono">{result.skipped_answers}</div>
          </div>
        </div>

        {/* Section-wise breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>Section Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {Object.entries(result.section_breakdown || {}).map(([secName, secStats]) => (
              <div key={secName} style={{ padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>{secName}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Correct: <strong>{secStats.correct}</strong></span>
                  <span>Incorrect: <strong>{secStats.incorrect}</strong></span>
                  <span>Skipped: <strong>{secStats.skipped}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Solutions Review */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Answer Explanations & Solutions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(result.evaluation || []).map((item, idx) => (
              <div key={idx} className="question-card" style={{ marginBottom: 0 }}>
                <div className="question-header">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>Q{idx + 1}</span>
                    <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>{item.section}</span>
                    <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>{item.topic}</span>
                  </div>
                  <div>
                    {item.is_correct ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Check size={14} /> Correct
                      </span>
                    ) : item.is_skipped ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Skipped</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <X size={14} /> Incorrect
                      </span>
                    )}
                  </div>
                </div>

                <div className="question-title">{item.question}</div>

                <div className="options-list">
                  {(item.options || []).map((opt, oIdx) => {
                    const isUserPick = item.user_selected === opt;
                    const isCorrectAnswer = opt.trim().toLowerCase() === (item.correct_answer || '').trim().toLowerCase();

                    let btnClass = 'option-button';
                    if (isCorrectAnswer) btnClass += ' selected-correct';
                    else if (isUserPick && !item.is_correct) btnClass += ' selected-wrong';

                    return (
                      <div key={oIdx} className={btnClass} style={{ cursor: 'default' }}>
                        <span className="option-prefix">{String.fromCharCode(65 + oIdx)}.</span>
                        <span style={{ flex: 1 }}>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="explanation-box">
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    Official Answer: {item.correct_answer}
                  </div>
                  {item.explanation && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {item.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Test Runner Interface
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Test Header Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800 }}>SSC CHSL Daily Challenge (30 Qs)</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Date: <strong>{testData?.test_date}</strong> • 10 English + 10 GA + 10 Lucent
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Countdown Clock */}
          <div className="badge badge-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            <span className="mono" style={{ fontWeight: 800, color: timeLeft < 300 ? '#ff5252' : 'var(--text-main)' }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={handleSubmitTest}
            disabled={isSubmitting}
            className="btn btn-primary btn-sm"
            style={{ padding: '6px 16px', fontSize: '0.8rem' }}
          >
            <Send size={13} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit Test'}</span>
          </button>
        </div>
      </div>

      {/* Main Runner Layout: Question Area + Question Palette */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '1rem' }} className="daily-test-runner-grid">
        {/* Left: Active Question */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="question-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
            <div className="question-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-active" style={{ fontSize: '0.72rem' }}>
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                  {currentQ?.section}
                </span>
                <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                  {currentQ?.topic}
                </span>
              </div>

              <button
                onClick={() => toggleFlag(currentQ?.id)}
                className={`btn btn-sm ${flaggedIds.has(currentQ?.id) ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                title="Mark for Review"
              >
                <Flag size={12} />
                <span>{flaggedIds.has(currentQ?.id) ? 'Flagged' : 'Mark Review'}</span>
              </button>
            </div>

            {/* Question Stem */}
            <div className="question-title" style={{ fontSize: '1rem', marginTop: '4px' }}>
              {currentQ?.question}
            </div>

            {/* 4 Choices */}
            <div className="options-list" style={{ marginTop: 'auto' }}>
              {(currentQ?.options || []).map((opt, idx) => {
                const isSelected = answers[currentQ?.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(currentQ?.id, opt)}
                    className={`option-button ${isSelected ? 'selected-correct' : ''}`}
                  >
                    <span className="option-prefix">{String.fromCharCode(65 + idx)}.</span>
                    <span style={{ flex: 1 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {Object.keys(answers).length} / {questions.length} Answered
            </span>

            <button
              disabled={currentQIndex === questions.length - 1}
              onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="btn btn-primary btn-sm"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: Question Number Palette */}
        <div className="card" style={{ padding: '1.25rem', height: 'fit-content' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Question Palette</span>
            <span className="badge badge-outline" style={{ fontSize: '0.62rem' }}>30 Qs</span>
          </div>

          {/* Palette Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563eb' }}></span>
              <span>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}></span>
              <span>Unanswered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '2px solid #2563eb' }}></span>
              <span>Current</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }}></span>
              <span>Flagged</span>
            </div>
          </div>

          {/* 30 Number Buttons */}
          <div className="question-palette-grid">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentQIndex;
              const isFlagged = flaggedIds.has(q.id);

              let paletteClass = 'palette-btn';
              if (isAnswered) paletteClass += ' answered';
              if (isCurrent) paletteClass += ' current';
              if (isFlagged) paletteClass += ' flagged';

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`${paletteClass} mono`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
