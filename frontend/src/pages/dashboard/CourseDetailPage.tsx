import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Circle,
  BookOpen,
  Target,
} from 'lucide-react';
import type { CourseEnrollment, CourseModule, ModuleProgress } from '../../types/course';
import {
  enrollInCourse,
  getMyProgress,
  markReadingComplete,
} from '../../services/courseService';
import { startSimulation } from '../../services/simulationService';
import Toast from '../../components/Toast';

const isNotEnrolledResponse = (
  data: CourseEnrollment | { enrolled: false },
): data is { enrolled: false } =>
  typeof data === 'object' && data !== null && 'enrolled' in data && data.enrolled === false;

const sortedModules = (enrollment: CourseEnrollment): CourseModule[] =>
  [...(enrollment.course.modules ?? [])].sort((a, b) => a.position - b.position);

const progressForModule = (
  enrollment: CourseEnrollment,
  moduleId: string,
): ModuleProgress | undefined =>
  enrollment.module_progresses.find(p => p.module.id === moduleId);

const firstUnlockedModuleId = (enrollment: CourseEnrollment): string | null => {
  const mods = sortedModules(enrollment);
  for (const m of mods) {
    const p = progressForModule(enrollment, m.id);
    const status = p?.status ?? 'locked';
    if (status !== 'locked') return m.id;
  }
  return mods[0]?.id ?? null;
};

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [completingModuleId, setCompletingModuleId] = useState<string | null>(null);
  const [launchingSim, setLaunchingSim] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );

  const refreshProgress = useCallback(async () => {
    if (!courseId) return;
    const data = await getMyProgress(courseId);
    if (isNotEnrolledResponse(data)) {
      setEnrollment(null);
      setShowEnrollPrompt(true);
      return;
    }
    setShowEnrollPrompt(false);
    setEnrollment(data);
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const data = await getMyProgress(courseId);
        if (cancelled) return;
        if (isNotEnrolledResponse(data)) {
          setEnrollment(null);
          setShowEnrollPrompt(true);
        } else {
          setEnrollment(data);
          setShowEnrollPrompt(false);
          const first = firstUnlockedModuleId(data);
          setActiveModuleId(prev => prev ?? first);
        }
      } catch {
        if (!cancelled) setToast({ type: 'error', message: 'Failed to load course progress' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!enrollment || activeModuleId) return;
    const first = firstUnlockedModuleId(enrollment);
    if (first) setActiveModuleId(first);
  }, [enrollment, activeModuleId]);

  const modulesOrdered = useMemo(
    () => (enrollment ? sortedModules(enrollment) : []),
    [enrollment],
  );

  const activeModule = useMemo(
    () => modulesOrdered.find(m => m.id === activeModuleId) ?? null,
    [modulesOrdered, activeModuleId],
  );

  const activeProgress = useMemo(
    () => (enrollment && activeModuleId ? progressForModule(enrollment, activeModuleId) : undefined),
    [enrollment, activeModuleId],
  );

  const effectiveStatus = activeProgress?.status ?? 'locked';

  const passedModuleCount = useMemo(
    () => enrollment?.module_progresses.filter(p => p.status === 'passed').length ?? 0,
    [enrollment],
  );

  const totalModuleCount = modulesOrdered.length;

  const handleMarkReadingComplete = async () => {
    if (!courseId || !activeModule) return;
    try {
      setCompletingModuleId(activeModule.id);
      await markReadingComplete(courseId, activeModule.id);
      await refreshProgress();
      setToast({ type: 'success', message: 'Reading marked complete' });
    } catch {
      setToast({ type: 'error', message: 'Could not mark module complete' });
    } finally {
      setCompletingModuleId(null);
    }
  };

  const handleLaunchSimulation = async () => {
    if (!activeModule?.scenario) {
      setToast({ type: 'error', message: 'No scenario linked to this module' });
      return;
    }
    try {
      setLaunchingSim(true);
      const session = await startSimulation(activeModule.scenario);
      navigate(`/dashboard/simulation/${session.id}`);
    } catch {
      setToast({ type: 'error', message: 'Could not start simulation' });
    } finally {
      setLaunchingSim(false);
    }
  };

  const handleEnrollFromPrompt = async () => {
    if (!courseId) return;
    try {
      setEnrolling(true);
      await enrollInCourse(courseId);
      await refreshProgress();
      setToast({ type: 'success', message: 'You are enrolled' });
    } catch {
      setToast({ type: 'error', message: 'Enrollment failed' });
    } finally {
      setEnrolling(false);
    }
  };

  if (!courseId) {
    return (
      <div className="dashboard-page p-6 text-slate-400">
        Invalid course.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-page flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sky-400" />
      </div>
    );
  }

  if (showEnrollPrompt && !enrollment) {
    return (
      <div className="dashboard-page px-4 pb-10 pt-6 md:px-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mx-auto max-w-lg rounded-xl border border-slate-700/60 bg-slate-900/60 p-8 text-center">
          <BookOpen className="mx-auto mb-4 text-sky-400" size={40} />
          <h1 className="text-xl font-semibold text-slate-100">Enroll to access this course</h1>
          <p className="mt-2 text-slate-400">
            Join the course to view modules, readings, and simulation checkpoints.
          </p>
          <button
            type="button"
            disabled={enrolling}
            onClick={() => void handleEnrollFromPrompt()}
            className="mt-6 rounded-lg bg-sky-600 px-6 py-2.5 font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {enrolling ? 'Enrolling…' : 'Enroll now'}
          </button>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return null;
  }

  const renderModuleStatusIcon = (mod: CourseModule) => {
    const p = progressForModule(enrollment, mod.id);
    const status = p?.status ?? 'locked';
    if (status === 'locked')
      return <Lock size={16} className="text-slate-500" aria-hidden />;
    if (status === 'passed')
      return <CheckCircle size={16} className="text-emerald-400" aria-hidden />;
    if (status === 'failed') {
      const canRetry =
        p &&
        p.attempts < mod.max_simulation_attempts &&
        mod.module_type === 'simulation';
      return (
        <span className="flex items-center gap-1 text-red-400" title={canRetry ? 'Retry available' : ''}>
          <XCircle size={16} aria-hidden />
          {canRetry && <span className="text-xs">Retry</span>}
        </span>
      );
    }
    return <Circle size={16} className="fill-amber-400 text-amber-400" aria-hidden />;
  };

  const certIssued = enrollment.status === 'certificate_issued';

  return (
    <div className="dashboard-page px-4 pb-10 pt-6 md:px-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-[30%]">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5">
            <h1 className="text-lg font-bold text-slate-100">{enrollment.course.title}</h1>
            <p className="mt-3 text-sm text-slate-400">
              {passedModuleCount} of {totalModuleCount} modules complete
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{
                  width:
                    totalModuleCount > 0
                      ? `${Math.round((passedModuleCount / totalModuleCount) * 100)}%`
                      : '0%',
                }}
              />
            </div>

            <ul className="mt-6 space-y-1">
              {modulesOrdered.map(mod => {
                const p = progressForModule(enrollment, mod.id);
                const status = p?.status ?? 'locked';
                const locked = status === 'locked';
                const isActive = mod.id === activeModuleId;
                return (
                  <li key={mod.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && setActiveModuleId(mod.id)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        locked
                          ? 'cursor-not-allowed opacity-60'
                          : 'hover:bg-slate-800/80'
                      } ${isActive ? 'bg-slate-800 ring-1 ring-sky-500/50' : ''}`}
                    >
                      <span className="mt-0.5 w-6 shrink-0 text-center text-xs text-slate-500">
                        {mod.position}
                      </span>
                      <span className="text-lg leading-none">
                        {mod.module_type === 'reading' ? '📖' : '🎯'}
                      </span>
                      <span className="flex-1 font-medium text-slate-200">{mod.title}</span>
                      <span className="shrink-0">{renderModuleStatusIcon(mod)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 lg:w-[70%]">
          {!activeModule && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-8">
              <h2 className="text-xl font-semibold text-slate-100">{enrollment.course.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-slate-300">{enrollment.course.description}</p>
              <p className="mt-6 text-slate-400">Select a module from the list or start below.</p>
              <button
                type="button"
                onClick={() => {
                  const id = firstUnlockedModuleId(enrollment);
                  if (id) setActiveModuleId(id);
                }}
                className="mt-4 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
              >
                Start course
              </button>
            </div>
          )}

          {activeModule && activeModule.module_type === 'reading' && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-100">{activeModule.title}</h2>
              <p className="mt-2 text-slate-400">{activeModule.description}</p>
              <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-950/40 p-6">
                <div className="max-w-none whitespace-pre-wrap text-slate-200">{activeModule.content_body}</div>
              </div>

              {!activeProgress && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Progress for this module is still syncing. Refresh if this persists.
                </div>
              )}

              {activeProgress && effectiveStatus === 'passed' && (
                <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                  ✓ Completed
                </div>
              )}

              {activeProgress &&
                (effectiveStatus === 'unlocked' || effectiveStatus === 'in_progress') && (
                  <button
                    type="button"
                    disabled={completingModuleId === activeModule.id}
                    onClick={() => void handleMarkReadingComplete()}
                    className="mt-6 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                  >
                    {completingModuleId === activeModule.id ? 'Saving…' : 'Mark as complete'}
                  </button>
                )}
            </div>
          )}

          {activeModule && activeModule.module_type === 'simulation' && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-100">{activeModule.title}</h2>
              <p className="mt-2 text-slate-400">{activeModule.description}</p>

              <div className="mt-6 flex items-center gap-2 border-b border-slate-700/50 pb-4 text-slate-200">
                <Target className="text-amber-400" size={22} />
                <span className="font-semibold">Simulation checkpoint</span>
              </div>

              {!activeProgress ? (
                <p className="mt-4 text-sm text-amber-100/90">
                  Simulation progress is loading. Refresh the page after your first attempt.
                </p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>
                      Minimum passing score required:{' '}
                      <strong className="text-slate-100">{activeModule.minimum_passing_score}%</strong>
                    </li>
                    <li>
                      Attempts used:{' '}
                      <strong className="text-slate-100">
                        {activeProgress.attempts} / {activeModule.max_simulation_attempts}
                      </strong>
                    </li>
                    <li>
                      Best score:{' '}
                      <strong className="text-slate-100">
                        {activeProgress.best_score != null ? `${activeProgress.best_score}%` : 'No attempts yet'}
                      </strong>
                    </li>
                  </ul>

                  {effectiveStatus === 'passed' && activeProgress.best_score != null && (
                    <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                      ✓ Passed with {activeProgress.best_score}%
                      {activeProgress.passed_at && (
                        <span className="mt-1 block text-sm text-emerald-300/90">
                          Completed {new Date(activeProgress.passed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {effectiveStatus === 'failed' &&
                    activeProgress.attempts >= activeModule.max_simulation_attempts && (
                      <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
                        Maximum attempts reached. Contact your supervisor.
                      </div>
                    )}

                  {(effectiveStatus === 'unlocked' ||
                    effectiveStatus === 'in_progress' ||
                    (effectiveStatus === 'failed' &&
                      activeProgress.attempts < activeModule.max_simulation_attempts)) &&
                    effectiveStatus !== 'passed' && (
                      <button
                        type="button"
                        disabled={launchingSim || !activeModule.scenario}
                        onClick={() => void handleLaunchSimulation()}
                        className="mt-6 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                      >
                        {launchingSim ? 'Starting…' : 'Launch simulation'}
                      </button>
                    )}
                </>
              )}
            </div>
          )}

          {certIssued && enrollment.certificate_number && (
            <div className="mt-8 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-900/30 to-amber-800/20 px-6 py-5">
              <p className="font-medium text-amber-100">
                🏆 Certificate earned: {enrollment.certificate_number}
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/certifications')}
                className="mt-4 rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
              >
                View certificate
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseDetailPage;
