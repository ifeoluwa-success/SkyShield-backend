import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, Clock, Layers } from 'lucide-react';
import type { Course, CourseEnrollment } from '../../types/course';
import { enrollInCourse, getCourses, getMyEnrollments } from '../../services/courseService';
import Toast from '../../components/Toast';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

const difficultyBadgeClass = (d: Course['difficulty']) => {
  switch (d) {
    case 1:
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
    case 2:
      return 'bg-blue-500/15 text-blue-300 border-blue-500/40';
    case 3:
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    case 4:
      return 'bg-red-500/15 text-red-300 border-red-500/40';
    default:
      return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  }
};

const threatBadgeClass = (focus: string) => {
  const k = focus.toLowerCase();
  if (k.includes('ransom')) return 'bg-purple-500/15 text-purple-200 border-purple-500/35';
  if (k.includes('gps') || k.includes('navigation')) return 'bg-cyan-500/15 text-cyan-200 border-cyan-500/35';
  if (k.includes('social') || k.includes('phish')) return 'bg-orange-500/15 text-orange-200 border-orange-500/35';
  return 'bg-slate-600/30 text-slate-200 border-slate-500/35';
};

const enrollmentStatusLabel = (e: CourseEnrollment): string => {
  if (e.status === 'certificate_issued' || e.certificate_number) return 'Certified';
  if (e.status === 'completed') return 'Completed';
  if (e.status === 'in_progress') return 'In Progress';
  return 'Enrolled';
};

const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [coursesData, enrollmentData] = await Promise.all([getCourses(), getMyEnrollments()]);
        if (!cancelled) {
          setCourses(coursesData.filter(c => c.is_published));
          setEnrollments(enrollmentData);
        }
      } catch {
        if (!cancelled) setToast({ type: 'error', message: 'Failed to load courses' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const enrollmentByCourseId = useMemo(() => {
    const m = new Map<string, CourseEnrollment>();
    enrollments.forEach(en => m.set(en.course.id, en));
    return m;
  }, [enrollments]);

  const filteredCourses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return courses.filter(c => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.threat_focus.toLowerCase().includes(q);
      const matchesDiff = filterDifficulty == null || c.difficulty === filterDifficulty;
      return matchesSearch && matchesDiff;
    });
  }, [courses, searchTerm, filterDifficulty]);

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingId(courseId);
      await enrollInCourse(courseId);
      navigate(`/dashboard/courses/${courseId}`);
    } catch {
      setToast({ type: 'error', message: 'Could not enroll in this course' });
    } finally {
      setEnrollingId(null);
    }
  };

  const passedCount = (en: CourseEnrollment) =>
    en.module_progresses.filter(p => p.status === 'passed').length;

  if (loading) {
    return (
      <div className="dashboard-page loading flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="dashboard-page px-4 pb-10 pt-6 md:px-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">Courses</h1>
          <p className="mt-1 text-slate-400">Structured learning paths with readings and simulations</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by title or threat focus…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-lg border border-slate-600/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <select
            value={filterDifficulty ?? ''}
            onChange={e =>
              setFilterDifficulty(e.target.value === '' ? null : Number(e.target.value))
            }
            className="rounded-lg border border-slate-600/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All difficulties</option>
            <option value={1}>Beginner</option>
            <option value={2}>Intermediate</option>
            <option value={3}>Advanced</option>
            <option value={4}>Expert</option>
          </select>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 py-16 text-center text-slate-400">
          No courses match your filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map(course => {
            const en = enrollmentByCourseId.get(course.id);
            const enrolled = Boolean(en);
            const certified =
              en?.status === 'certificate_issued' || Boolean(en?.certificate_number);
            const total = course.modules?.length ?? course.module_count;
            const done = en ? passedCount(en) : 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <article
                key={course.id}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/50 shadow-lg transition hover:border-sky-500/40"
              >
                <div className="relative aspect-video bg-slate-800">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-center">
                      <BookOpen className="text-slate-500" size={36} />
                      <span className="text-sm font-medium text-slate-400">{course.threat_focus}</span>
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-xs ${threatBadgeClass(course.threat_focus)}`}
                  >
                    {course.threat_focus}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold text-slate-100 line-clamp-2">{course.title}</h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyBadgeClass(course.difficulty)}`}
                    >
                      {DIFFICULTY_LABELS[course.difficulty]}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={14} />
                      {course.estimated_hours}h
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Layers size={14} />
                      {course.module_count} modules
                    </span>
                  </div>

                  {enrolled && en && (
                    <>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>Progress</span>
                          <span>
                            {done} / {total} modules
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="mt-3 inline-flex w-fit rounded-full border border-slate-600/60 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300">
                        {certified ? 'Certified' : enrollmentStatusLabel(en)}
                      </span>
                    </>
                  )}

                  {!enrolled && (
                    <span className="mt-4 inline-flex w-fit rounded-full border border-slate-600/60 px-2.5 py-1 text-xs text-slate-400">
                      Not enrolled
                    </span>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!enrolled && (
                      <button
                        type="button"
                        disabled={enrollingId === course.id}
                        onClick={() => void handleEnroll(course.id)}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                      >
                        {enrollingId === course.id ? 'Enrolling…' : 'Enroll'}
                      </button>
                    )}
                    {enrolled && !certified && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/courses/${course.id}`)}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                      >
                        Continue
                      </button>
                    )}
                    {certified && (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/certifications')}
                        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
                      >
                        View Certificate
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
