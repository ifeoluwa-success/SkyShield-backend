import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Award, CheckCircle, XCircle, Edit2, Save, FileText } from 'lucide-react';
import { getExerciseAttempts, updateExerciseAttempt, type ExerciseAttemptDetail } from '../../services/tutorService';
import Toast from '../../components/Toast';
import { PageLoader } from '../../components/ui/Loading';
import '../../assets/css/TutorExerciseSubmissions.css';

const TutorExerciseSubmissionsPage: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<ExerciseAttemptDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterPassed, setFilterPassed] = useState<string>('');

  const fetchAttempts = useCallback(async () => {
    if (!exerciseId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStudent) params.student_id = filterStudent;
      if (filterPassed) params.passed = filterPassed;
      const data = await getExerciseAttempts(exerciseId, params);
      setAttempts(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load submissions' });
    } finally {
      setLoading(false);
    }
  }, [exerciseId, filterStudent, filterPassed]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const handleEdit = (attempt: ExerciseAttemptDetail) => {
    setEditingId(attempt.id);
    setEditScore(attempt.score);
    setEditFeedback(attempt.feedback || '');
  };

  const handleSave = async (attemptId: string) => {
    try {
      const updated = await updateExerciseAttempt(attemptId, {
        score: editScore,
        feedback: editFeedback,
        passed: editScore >= 70,
      });
      setAttempts(prev => prev.map(a => a.id === attemptId ? updated : a));
      setToast({ type: 'success', message: 'Grade updated' });
      setEditingId(null);
    } catch {
      setToast({ type: 'error', message: 'Failed to update grade' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const uniqueStudents = Array.from(new Set(attempts.map(a => a.student_id))).map(id => {
    const attempt = attempts.find(a => a.student_id === id);
    return { id, name: attempt?.student_name || id };
  });

  if (loading) {
    return (
      <div className="submissions-page loading">
        <PageLoader message="Loading submissions…" className="min-h-0 py-12" />
      </div>
    );
  }

  return (
    <div className="submissions-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/tutor/exercises')}>
          <ArrowLeft size={20} /> Back to Exercises
        </button>
        <h1 className="page-title">Exercise Submissions</h1>
        <p className="page-subtitle">Review and grade student attempts</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <Users size={16} />
          <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">All Students</option>
            {uniqueStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <Award size={16} />
          <select value={filterPassed} onChange={e => setFilterPassed(e.target.value)}>
            <option value="">All</option>
            <option value="true">Passed</option>
            <option value="false">Failed</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchAttempts}>Refresh</button>
      </div>

      {attempts.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No submissions yet for this exercise.</p>
        </div>
      ) : (
        <div className="attempts-list">
          {attempts.map(attempt => (
            <div key={attempt.id} className="attempt-card">
              <div className="attempt-header">
                <div className="student-info">
                  <span className="student-name">{attempt.student_name}</span>
                  <span className="student-email">{attempt.student_email}</span>
                </div>
                <div className="attempt-badges">
                  <span className={`pass-badge ${attempt.passed ? 'passed' : 'failed'}`}>
                    {attempt.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </span>
                  <span className="attempt-number">Attempt #{attempt.attempt_number}</span>
                </div>
              </div>

              <div className="attempt-details">
                <div className="detail-item">
                  <Clock size={14} />
                  <span>Started: {formatDate(attempt.started_at)}</span>
                </div>
                <div className="detail-item">
                  <Clock size={14} />
                  <span>Completed: {formatDate(attempt.completed_at)}</span>
                </div>
                <div className="detail-item">
                  <Clock size={14} />
                  <span>Time taken: {Math.floor(attempt.time_taken / 60)} min {attempt.time_taken % 60} sec</span>
                </div>
              </div>

              <div className="attempt-answers">
                <h4>Student Answers</h4>
                <pre className="answers-preview">{JSON.stringify(attempt.answers, null, 2)}</pre>
              </div>

              <div className="grading-section">
                {editingId === attempt.id ? (
                  <>
                    <div className="grade-input">
                      <label>Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editScore}
                        onChange={e => setEditScore(Number(e.target.value))}
                      />
                    </div>
                    <div className="feedback-input">
                      <label>Feedback</label>
                      <textarea
                        rows={3}
                        value={editFeedback}
                        onChange={e => setEditFeedback(e.target.value)}
                        placeholder="Add feedback for the student..."
                      />
                    </div>
                    <div className="action-buttons">
                      <button className="save-btn" onClick={() => handleSave(attempt.id)}>
                        <Save size={16} /> Save
                      </button>
                      <button className="cancel-btn" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="current-grade">
                      <span className="grade-label">Current Score:</span>
                      <span className={`grade-value ${attempt.score >= 70 ? 'pass' : 'fail'}`}>
                        {attempt.score}%
                      </span>
                    </div>
                    {attempt.feedback && (
                      <div className="current-feedback">
                        <span className="feedback-label">Feedback:</span>
                        <p>{attempt.feedback}</p>
                      </div>
                    )}
                    <button className="edit-grade-btn" onClick={() => handleEdit(attempt)}>
                      <Edit2 size={16} /> Edit Grade
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorExerciseSubmissionsPage;