import React, { useState, useEffect } from 'react';
import {
  Award, CheckCircle, Clock, Download, Eye, FileText, Shield, Star, TrendingUp, Users, Zap, Loader2
} from 'lucide-react';
import { getUserCertifications, type Certification } from '../../services/simulationService';
import Toast from '../../components/Toast';
import '../../assets/css/CertificationsPage.css';

const CertificationsPage: React.FC = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in-progress' | 'completed' | 'available'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const fetchCertifications = async () => {
      try {
        setLoading(true);
        const data = await getUserCertifications();
        setCertifications(data);
      } catch {
        setToast({ type: 'error', message: 'Failed to load certifications' });
      } finally {
        setLoading(false);
      }
    };
    fetchCertifications();
  }, []);

  const stats = [
    {
      title: 'Certifications Earned',
      value: certifications.filter(c => c.status === 'completed').length.toString(),
      icon: Award,
      color: 'blue',
      change: '+0 this month',
    },
    {
      title: 'Avg. Score',
      value: `${Math.round(certifications.reduce((sum, c) => sum + (c.score || 0), 0) / (certifications.length || 1))}%`,
      icon: Star,
      color: 'purple',
      change: 'From completed certs',
    },
    {
      title: 'Active Training',
      value: certifications.filter(c => c.status === 'in-progress').length.toString(),
      icon: Clock,
      color: 'green',
      change: 'In progress',
    },
    {
      title: 'Expert Level',
      value: certifications.filter(c => c.level === 'Expert').length.toString(),
      icon: TrendingUp,
      color: 'yellow',
      change: 'Highest level',
    },
  ];

  const getStatusBadge = (status: Certification['status']) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge completed"><CheckCircle size={12} /> Completed</span>;
      case 'in-progress':
        return <span className="status-badge in-progress"><Clock size={12} /> In Progress</span>;
      case 'locked':
        return <span className="status-badge locked"><Shield size={12} /> Locked</span>;
      case 'available':
        return <span className="status-badge available"><Eye size={12} /> Available</span>;
      default:
        return null;
    }
  };

  const getLevelBadge = (level: Certification['level']) => {
    const colors: Record<Certification['level'], string> = {
      Basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      Intermediate: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      Advanced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      Expert: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[level]}`}>
        {level}
      </span>
    );
  };

  const getIconComponent = (iconName: string): React.ElementType => {
    const icons: Record<string, React.ElementType> = {
      Award, Shield, FileText, TrendingUp, Zap, CheckCircle, Users, Star, Clock,
    };
    return icons[iconName] || Award;
  };

  const filteredCertifications = certifications.filter(cert => {
    if (activeFilter === 'all') return true;
    return cert.status === activeFilter;
  });

  const handleStartCertification = (certId: string) => {
    window.location.assign(`/dashboard/simulations?scenario=${certId}`);
  };

  const handleViewCertificate = (certId: string) => {
    window.open(`/certificates/${certId}.pdf`, '_blank', 'noopener,noreferrer');
  };

  const handleExportAll = () => {
    const completed = certifications.filter(c => c.status === 'completed');
    if (completed.length === 0) {
      setToast({ type: 'info', message: 'No completed certifications to export' });
      return;
    }

    const headers = ['Certification', 'Level', 'Score (%)', 'Date Earned'];
    const rows = completed.map(c => [
      `"${c.title.replace(/"/g, '""')}"`,
      c.level,
      c.score ?? '',
      c.issuedDate ? new Date(c.issuedDate).toLocaleDateString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyshield-certifications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ type: 'success', message: `Exported ${completed.length} certification${completed.length > 1 ? 's' : ''}` });
  };

  if (loading) {
    return (
      <div className="certifications-page loading">
        <div className="loading-spinner"><Loader2 size={32} className="spinner" /> Loading certifications...</div>
      </div>
    );
  }

  return (
    <div className="certifications-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="certifications-header">
        <div className="header-content">
          <div className="header-title">
            <Award size={32} className="text-accent-purple" />
            <h1>Certifications</h1>
          </div>
          <p className="header-subtitle">
            Track your professional certifications, progress through training paths, and showcase your cybersecurity expertise.
          </p>
        </div>
        <div className="header-actions">
          <button className="export-button" onClick={handleExportAll}>
            <Download size={20} />
            Export All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="certifications-stats">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card card-3d">
            <div className="stat-icon-wrapper">
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-title">{stat.title}</p>
              <span className="stat-change">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
          type="button"
        >
          All Certifications
        </button>
        <button
          className={`filter-tab ${activeFilter === 'in-progress' ? 'active' : ''}`}
          onClick={() => setActiveFilter('in-progress')}
          type="button"
        >
          In Progress
        </button>
        <button
          className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveFilter('completed')}
          type="button"
        >
          Completed
        </button>
        <button
          className={`filter-tab ${activeFilter === 'available' ? 'active' : ''}`}
          onClick={() => setActiveFilter('available')}
          type="button"
        >
          Available
        </button>
      </div>

      {/* Certifications Grid */}
      {filteredCertifications.length === 0 ? (
        <div className="empty-state">
          <Award size={48} className="empty-icon" />
          <h3>No certifications yet</h3>
          <p>Complete simulations to earn certifications</p>
        </div>
      ) : (
        <div className="certifications-grid">
          {filteredCertifications.map((cert) => {
            const IconComponent = getIconComponent(cert.icon);
            return (
              <div key={cert.id} className="certification-card card-3d">
                <div className="certification-card-header">
                  <div className="certification-header-left">
                    <div className="certification-icon" style={{ background: cert.color }}>
                      <IconComponent size={24} />
                    </div>
                    <div className="certification-title">
                      <h3>{cert.title}</h3>
                      <div className="certification-meta">
                        {getLevelBadge(cert.level)}
                        <span className="category">{cert.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="certification-header-right">
                    {getStatusBadge(cert.status)}
                    {cert.expirationDate && cert.status === 'completed' && (
                      <div className="expiration-badge">
                        <Clock size={12} />
                        Expires: {cert.expirationDate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="certification-content">
                  <p className="certification-description">{cert.description}</p>

                  <div className="certification-progress">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span className="progress-value">{cert.progress}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${cert.progress}%`, background: cert.color }} />
                    </div>
                    <div className="modules-info">
                      <span>{cert.completedModules}/{cert.modules} modules completed</span>
                      <span className="duration">
                        <Clock size={14} />
                        {cert.duration}
                      </span>
                    </div>
                  </div>

                  <div className="certification-requirements">
                    <h4>Requirements:</h4>
                    <ul>
                      {cert.requirements.map((req: string, idx: number) => (
                        <li key={idx}>
                          <CheckCircle size={16} />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {cert.score && cert.status === 'completed' && (
                    <div className="certification-score">
                      <div className="score-display">
                        <div className="score-circle">
                          <svg className="progress-ring" width="80" height="80">
                            <defs>
                              <linearGradient id={`gradient-${cert.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={cert.color} stopOpacity="1" />
                                <stop offset="100%" stopColor={cert.color} stopOpacity="0.7" />
                              </linearGradient>
                            </defs>
                            <circle
                              className="progress-ring-background"
                              strokeWidth="6"
                              fill="transparent"
                              r="32"
                              cx="40"
                              cy="40"
                            />
                            <circle
                              className="progress-ring-circle"
                              strokeWidth="6"
                              fill="transparent"
                              r="32"
                              cx="40"
                              cy="40"
                              stroke={`url(#gradient-${cert.id})`}
                              style={{
                                strokeDasharray: `${2 * Math.PI * 32}`,
                                strokeDashoffset: `${2 * Math.PI * 32 * (1 - cert.score / 100)}`,
                              }}
                            />
                          </svg>
                          <span className="score-value">{cert.score}%</span>
                        </div>
                      </div>
                      <div className="score-info">
                        <span className="score-label">Final Score</span>
                        {cert.issuedDate && <span className="issue-date">Issued: {cert.issuedDate}</span>}
                      </div>
                    </div>
                  )}

                  <div className="certification-actions">
                    {cert.status === 'completed' && (
                      <>
                        <button className="view-certificate-btn" onClick={() => handleViewCertificate(cert.id)}>
                          <Eye size={18} />
                          View Certificate
                        </button>
                        <button className="download-btn" onClick={() => handleViewCertificate(cert.id)}>
                          <Download size={18} />
                          Download
                        </button>
                      </>
                    )}
                    {cert.status === 'in-progress' && (
                      <button className="continue-btn" onClick={() => handleStartCertification(cert.id)}>
                        <Clock size={18} />
                        Continue Training
                      </button>
                    )}
                    {cert.status === 'available' && (
                      <button className="start-btn" onClick={() => handleStartCertification(cert.id)}>
                        <Zap size={18} />
                        Start Certification
                      </button>
                    )}
                    {cert.status === 'locked' && (
                      <button className="locked-btn" disabled>
                        <Shield size={18} />
                        Requirements Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certification Path */}
      <div className="certification-path card-3d">
        <div className="section-header">
          <h2>Certification Path</h2>
          <p>Your progression through cybersecurity expertise levels</p>
        </div>
        <div className="path-timeline">
          {(['Basic', 'Intermediate', 'Advanced', 'Expert'] as const).map((level, index) => {
            const certs = certifications.filter(c => c.level === level);
            const completed = certs.filter(c => c.status === 'completed').length;
            const total = certs.length;
            return (
              <div key={level} className="path-level">
                <div className="level-marker">
                  <div className={`marker ${completed === total ? 'completed' : completed > 0 ? 'in-progress' : 'locked'}`}>
                    {index + 1}
                  </div>
                  <span className="level-label">{level}</span>
                </div>
                <div className="level-progress">
                  <span className="progress-text">{completed}/{total} certifications</span>
                  <div className="level-progress-bar">
                    <div className="level-progress-fill" style={{ width: `${(completed / (total || 1)) * 100}%` }} />
                  </div>
                </div>
                {index < 3 && <div className="path-connector" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CertificationsPage;