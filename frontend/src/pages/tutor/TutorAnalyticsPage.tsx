import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Award, Clock, Download } from 'lucide-react';
import { getTutorDashboardStats } from '../../services/tutorService';
import type { TutorDashboardStats } from '../../types/tutor';
import Toast from '../../components/Toast';
import { PageLoader } from '../../components/ui/Loading';
import '../../assets/css/TutorAnalytics.css';

const fmt = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');

const TutorAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TutorDashboardStats | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    getTutorDashboardStats()
      .then(setStats)
      .catch(() => setToast({ type: 'error', message: 'Failed to load analytics data' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tutor-analytics-page loading">
        <PageLoader message="Loading analytics…" className="min-h-0 py-12" />
      </div>
    );
  }

  const uploads = stats?.recent_uploads ?? [];
  const students = stats?.student_performance ?? [];

  const totalViews = uploads.reduce((acc, m) => acc + (m.views_count ?? 0), 0);
  const completionRate = stats?.total_students
    ? Math.round((stats.total_exercises / (stats.total_students * 5)) * 100)
    : 0;
  const avgRating =
    uploads.length > 0
      ? uploads.reduce((acc, m) => acc + (m.average_rating ?? 0), 0) / uploads.length
      : 0;

  const maxViews = Math.max(...uploads.map(m => m.views_count ?? 0), 1);
  const maxScore = 100;

  return (
    <div className="tutor-analytics-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Performance insights and statistics</p>
          </div>
          <button className="secondary-button">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon blue"><Users size={20} /></div>
            <span className="stat-change trend-up">+12%</span>
          </div>
          <h3 className="stat-value">{totalViews.toLocaleString()}</h3>
          <p className="stat-title">Total Course Views</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon purple"><Award size={20} /></div>
            <span className="stat-change trend-up">+8%</span>
          </div>
          <h3 className="stat-value">{completionRate}%</h3>
          <p className="stat-title">Completion Rate</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon green"><TrendingUp size={20} /></div>
            <span className="stat-change trend-up">+15%</span>
          </div>
          <h3 className="stat-value">{avgRating.toFixed(1)}</h3>
          <p className="stat-title">Avg Material Rating</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon yellow"><Clock size={20} /></div>
          </div>
          <h3 className="stat-value">{stats?.total_students ?? 0}</h3>
          <p className="stat-title">Total Students</p>
        </div>
      </div>

      {/* Charts */}
      <div className="content-grid">

        {/* Course performance — views per material */}
        <div className="content-card">
          <div className="card-header">
            <h3>Course Performance</h3>
            <span className="card-meta">Views per material</span>
          </div>
          {uploads.length === 0 ? (
            <div className="chart-empty">
              <TrendingUp size={32} opacity={0.25} />
              <span>No materials uploaded yet</span>
            </div>
          ) : (
            <div className="bar-chart">
              {uploads.slice(0, 7).map(m => (
                <div className="bar-row" key={m.id}>
                  <span className="bar-label" title={m.title}>{m.title}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(((m.views_count ?? 0) / maxViews) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="bar-value">{m.views_count ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student engagement — avg score per student */}
        <div className="content-card">
          <div className="card-header">
            <h3>Student Engagement</h3>
            <span className="card-meta">Avg score per student</span>
          </div>
          {students.length === 0 ? (
            <div className="chart-empty">
              <Users size={32} opacity={0.25} />
              <span>No student data available yet</span>
            </div>
          ) : (
            <div className="bar-chart">
              {students.slice(0, 7).map(s => (
                <div className="bar-row" key={s.student_id}>
                  <span className="bar-label" title={s.student_name}>{s.student_name}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill--violet"
                      style={{ width: `${Math.min((s.average_score / maxScore) * 100, 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="bar-value">{s.average_score.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top materials table */}
      <div className="content-card full-width">
        <div className="card-header">
          <h3>Top Performing Materials</h3>
          <span className="card-meta">{uploads.length} total</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Material</th>
                <th>Type</th>
                <th>Views</th>
                <th>Duration</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">No materials found</td>
                </tr>
              ) : (
                uploads
                  .slice()
                  .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
                  .slice(0, 8)
                  .map((m, i) => (
                    <tr key={m.id}>
                      <td className="row-num">{i + 1}</td>
                      <td className="material-name">{m.title}</td>
                      <td><span className="type-pill">{fmt(m.material_type)}</span></td>
                      <td>{(m.views_count ?? 0).toLocaleString()}</td>
                      <td>{m.duration_minutes ? `${m.duration_minutes}m` : '—'}</td>
                      <td>
                        {m.average_rating != null
                          ? <span className="rating-badge">{m.average_rating.toFixed(1)} ★</span>
                          : '—'}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student performance table */}
      {students.length > 0 && (
        <div className="content-card full-width">
          <div className="card-header">
            <h3>Student Performance</h3>
            <span className="card-meta">{students.length} students</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Avg Score</th>
                  <th>Materials Done</th>
                  <th>Exercises Done</th>
                  <th>Meetings</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .slice()
                  .sort((a, b) => b.average_score - a.average_score)
                  .slice(0, 10)
                  .map((s, i) => (
                    <tr key={s.student_id}>
                      <td className="row-num">{i + 1}</td>
                      <td className="material-name">{s.student_name}</td>
                      <td>
                        <span className={`score-pill ${s.average_score >= 70 ? 'score-good' : s.average_score >= 50 ? 'score-mid' : 'score-low'}`}>
                          {s.average_score.toFixed(0)}%
                        </span>
                      </td>
                      <td>{s.completed_materials}</td>
                      <td>{s.completed_exercises}</td>
                      <td>{s.meetings_attended}</td>
                      <td className="last-active">
                        {s.last_activity
                          ? new Date(s.last_activity).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorAnalyticsPage;
