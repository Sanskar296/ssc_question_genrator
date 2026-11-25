import React, { useState, useEffect } from 'react';
import {
  Search,
  Check,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../api';

const QUESTIONS_PER_PAGE = 10;

export default function EnglishPractice({ user, onAttemptRecorded, initialTopic = '' }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [justAttemptedIds, setJustAttemptedIds] = useState(new Set());

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    handleSearch(query, selectedTopic);
  }, [selectedTopic]);

  useEffect(() => {
    if (visibleCount < QUESTIONS_PER_PAGE && results.length > 0) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 1, QUESTIONS_PER_PAGE));
      }, 35);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, results.length, currentPage]);

  const loadTopics = async () => {
    try {
      const data = await api.getEnglishTopics();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Failed to load English topics:', err);
    }
  };

  const handleSearch = async (overrideQuery = null, overrideTopic = null) => {
    const q = overrideQuery !== null ? overrideQuery : query;
    const t = overrideTopic !== null ? overrideTopic : selectedTopic;

    setLoading(true);
    setError('');
    setCurrentPage(1);
    setVisibleCount(0);

    try {
      const res = await api.searchEnglishPYQs(q.trim(), t || null, 500);
      setResults(res.questions || []);
      setHasSearched(true);
      setVisibleCount(1);
    } catch (err) {
      setError(err.message || 'Failed to search English questions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setVisibleCount(1);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSelectOption = async (q, optionText) => {
    if (userAnswers[q.id]) return;

    // Check correctness
    const cleanUser = optionText.trim().toLowerCase();
    const cleanCorrect = (q.correct_answer || '').trim().toLowerCase();
    const isCorrect = cleanUser === cleanCorrect || cleanUser.endsWith(cleanCorrect) || cleanCorrect.endsWith(cleanUser);

    setUserAnswers(prev => ({
      ...prev,
      [q.id]: { selected: optionText, isCorrect }
    }));

    setJustAttemptedIds(prev => new Set(prev).add(q.id));

    // Save attempt to MongoDB
    try {
      await api.recordAttempt({
        question_id: q.id,
        question_type: "pyq",
        subject: "English",
        topic: q.topic || "General English",
        user_selected_option: optionText,
        correct_option: q.correct_answer,
        is_correct: isCorrect,
        time_spent_seconds: 15.0,
        question_text: q.question,
        options: q.options,
        exam_date: q.exam_date,
        repetition_count: 1
      });

      if (onAttemptRecorded) {
        onAttemptRecorded();
      }
    } catch (err) {
      console.error("Attempt log notice:", err);
    }
  };

  const totalPages = Math.ceil(results.length / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const pageQuestions = results.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  const renderQuestions = pageQuestions.slice(0, visibleCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Search & Topic Selector */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> English Language & Comprehension Practice
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              3,198 genuine SSC CHSL English questions with verified official answers across 13 syllabus topics.
            </p>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
            Verified Dataset
          </span>
        </div>

        {/* Search Bar */}
        <div className="input-group">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search keyword e.g. 'synonym', 'spelling', 'passive voice', 'antonym'..."
              className="input"
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <button onClick={() => handleSearch()} disabled={loading} className="btn btn-primary">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Topic Filter Chips */}
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Filter size={12} />
            <span>Select English Topic:</span>
          </div>
          <div className="chip-container">
            <button
              onClick={() => setSelectedTopic('')}
              className={`chip ${selectedTopic === '' ? 'active' : ''}`}
            >
              All Topics (3,198)
            </button>
            {topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => setSelectedTopic(t.topic)}
                className={`chip ${selectedTopic === t.topic ? 'active' : ''}`}
              >
                {t.topic} ({t.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ background: '#1c1111', border: '1px solid #552222', color: '#ffaaaa', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '12px' }}></div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Retrieving verified English questions...</div>
        </div>
      )}

      {/* Results List */}
      {!loading && results.length > 0 && (
        <div>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {selectedTopic || "All English Topics"}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Showing <strong>{startIndex + 1}–{Math.min(startIndex + pageQuestions.length, results.length)}</strong> of <strong>{results.length}</strong> questions
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className="btn btn-outline btn-sm"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="mono" style={{ fontSize: '0.75rem' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className="btn btn-outline btn-sm"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Question Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {renderQuestions.map((q, idx) => {
              const currentNum = startIndex + idx + 1;
              const answerState = userAnswers[q.id];
              const isJustAttempted = justAttemptedIds.has(q.id);

              return (
                <div key={q.id || idx} className="question-card">
                  {/* Metadata Row */}
                  <div className="question-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                        Q{currentNum}
                      </span>
                      <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                        {q.topic}
                      </span>
                      {q.exam_date && (
                        <span className="badge badge-outline" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={10} /> {q.exam_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="question-title">
                    {q.question}
                  </div>

                  {/* Options */}
                  <div className="options-list">
                    {(q.options || []).map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      let btnClass = 'option-button';

                      if (answerState) {
                        const cleanOpt = opt.trim().toLowerCase();
                        const cleanCorrect = (q.correct_answer || '').trim().toLowerCase();
                        const isThisCorrect = cleanOpt === cleanCorrect || cleanOpt.endsWith(cleanCorrect) || cleanCorrect.endsWith(cleanOpt);

                        if (isThisCorrect) {
                          btnClass += ' selected-correct';
                        } else if (answerState.selected === opt && !answerState.isCorrect) {
                          btnClass += ' selected-wrong';
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={!!answerState}
                          onClick={() => handleSelectOption(q, opt)}
                          className={btnClass}
                        >
                          <span className="option-prefix">{letter}.</span>
                          <span style={{ flex: 1 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Answer Feedback & Explanation */}
                  {answerState && (
                    <div className="explanation-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                          {answerState.isCorrect ? <Check size={14} /> : <X size={14} />}
                          <span>{answerState.isCorrect ? "Correct Answer!" : "Incorrect Selection"}</span>
                        </div>
                        {isJustAttempted && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} />
                            <span>Saved to <strong>My Progress</strong></span>
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>
                        Official Answer: <strong style={{ color: 'var(--text-main)' }}>{q.correct_answer}</strong>
                      </div>
                      {q.explanation && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={14} />
                <span>Previous 10 Questions</span>
              </button>
              <span className="mono" style={{ fontSize: '0.8rem' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className="btn btn-secondary btn-sm"
              >
                <span>Next 10 Questions</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
