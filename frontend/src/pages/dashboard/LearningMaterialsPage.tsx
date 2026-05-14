// src/pages/dashboard/LearningMaterialsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Video,
  FileText,
  Clock,
  ExternalLink,
  Search,
  X,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import {
  getContentMaterials,
  getCategories,
  getLearningPaths,
  getAnnouncements,
  bookmarkContentMaterial,
  enrollInLearningPath,
  type ContentMaterial,
  type ContentCategory,
  type LearningPath,
  type Announcement,
} from '../../services/contentService';
import Toast from '../../components/Toast';
import { PageLoader } from '../../components/ui/Loading';
import '../../assets/css/LearningMaterialsPage.css';

const LearningMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<ContentMaterial[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [materialsRes, categoriesRes, pathsRes, announcementsRes] = await Promise.allSettled([
      getContentMaterials({ is_published: true }),
      getCategories(),
      getLearningPaths(),
      getAnnouncements(),
    ]);

    if (materialsRes.status === 'fulfilled') setMaterials(materialsRes.value);
    if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value);
    if (pathsRes.status === 'fulfilled') setPaths(pathsRes.value);
    if (announcementsRes.status === 'fulfilled') setAnnouncements(announcementsRes.value);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch materials when filters change
  useEffect(() => {
    const fetchFiltered = async () => {
      try {
        const data = await getContentMaterials({
          is_published: true,
          search: searchTerm || undefined,
          category: selectedCategory || undefined,
          difficulty: selectedDifficulty || undefined,
        });
        setMaterials(data);
      } catch {
        // silently ignore filter errors — stale data is fine
      }
    };
    if (!loading) fetchFiltered();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  const handleBookmark = async (slug: string) => {
    try {
      const res = await bookmarkContentMaterial(slug);
      setToast({
        type: 'success',
        message: res.bookmarked ? 'Bookmarked!' : 'Bookmark removed',
      });
    } catch {
      setToast({ type: 'error', message: 'Failed to bookmark material' });
    }
  };

  const handleEnroll = async (slug: string) => {
    try {
      const res = await enrollInLearningPath(slug);
      setToast({
        type: 'success',
        message: res.enrolled ? 'Enrolled in learning path!' : 'Unenrolled from learning path',
      });
      const updated = await getLearningPaths();
      setPaths(updated);
    } catch {
      setToast({ type: 'error', message: 'Failed to enroll in learning path' });
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={20} />;
      case 'document':
      case 'ebook': return <FileText size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const getPriorityClass = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent': return 'announcement-urgent';
      case 'high': return 'announcement-high';
      case 'medium': return 'announcement-medium';
      default: return 'announcement-low';
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.has(a.id));

  if (loading) {
    return (
      <div className="learning-materials-page loading">
        <PageLoader message="Loading materials…" className="min-h-0 py-12" />
      </div>
    );
  }

  return (
    <div className="learning-materials-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Announcements banner */}
      {visibleAnnouncements.length > 0 && (
        <div className="announcements-section">
          {visibleAnnouncements.map(a => (
            <div key={a.id} className={`announcement-banner ${getPriorityClass(a.priority)}`}>
              <div className="announcement-body">
                <strong>{a.title}</strong>
                <span>{a.content}</span>
              </div>
              <button
                className="announcement-dismiss"
                onClick={() => setDismissedAnnouncements(prev => new Set([...prev, a.id]))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Learning Materials</h1>
        <p className="page-subtitle">Access documents, videos, and resources to build your cybersecurity skills</p>
      </div>

      {/* Learning Paths */}
      {paths.length > 0 && (
        <section className="learning-paths-section">
          <h2 className="section-title">Learning Paths</h2>
          <div className="paths-grid">
            {paths.map(path => (
              <div key={path.id} className="path-card">
                <div className="path-header">
                  <h3 className="path-title">{path.title}</h3>
                  <span className={`path-difficulty ${path.difficulty}`}>{path.difficulty}</span>
                </div>
                <p className="path-desc">{path.description}</p>
                <div className="path-meta">
                  {path.materials_count !== undefined && (
                    <span><BookOpen size={13} /> {path.materials_count} materials</span>
                  )}
                  {path.estimated_duration !== undefined && (
                    <span><Clock size={13} /> {path.estimated_duration}h</span>
                  )}
                  {path.enrolled_count !== undefined && (
                    <span><span className="meta-dot">·</span> {path.enrolled_count} enrolled</span>
                  )}
                </div>
                {path.progress !== undefined && path.progress > 0 && (
                  <div className="path-progress-track">
                    <div className="path-progress-fill" style={{ width: `${path.progress}%` }} />
                  </div>
                )}
                <button
                  className={`path-enroll-btn ${path.is_enrolled ? 'enrolled' : ''}`}
                  onClick={() => handleEnroll(path.slug)}
                >
                  {path.is_enrolled ? 'Continue Path' : 'Enroll'} <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <div className="materials-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search materials…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}><X size={14} /></button>
          )}
        </div>
        <select
          className="filter-select"
          value={selectedDifficulty}
          onChange={e => setSelectedDifficulty(e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="category-chips">
          <button
            className={`chip ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            All
          </button>
          {categories.filter(c => c.is_active).map(cat => (
            <button
              key={cat.id}
              className={`chip ${selectedCategory === cat.slug ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Materials */}
      {materials.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>No materials found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="materials-grid">
          {materials.map((material) => (
            <div key={material.id} className="material-card">
              <div className="material-icon">{getMaterialIcon(material.material_type)}</div>
              <div className="material-info">
                <h3>{material.title}</h3>
                <p>{material.description}</p>
                <div className="material-meta">
                  <span className="material-type-badge">{material.material_type}</span>
                  <span className={`difficulty-pill ${material.difficulty}`}>{material.difficulty}</span>
                  {material.estimated_read_time && (
                    <span className="material-time">
                      <Clock size={12} /> {material.estimated_read_time} min
                    </span>
                  )}
                  {material.category_name && (
                    <span className="material-category">{material.category_name}</span>
                  )}
                </div>
              </div>
              <div className="material-actions">
                <button
                  className="bookmark-btn"
                  title="Bookmark"
                  onClick={() => handleBookmark(material.slug)}
                >
                  <Bookmark size={16} />
                </button>
                {material.file || material.video_url || material.external_url ? (
                  <a
                    href={material.file ?? material.video_url ?? material.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-btn"
                  >
                    <ExternalLink size={16} /> View
                  </a>
                ) : (
                  <button className="view-btn disabled" disabled>Preview</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningMaterialsPage;
