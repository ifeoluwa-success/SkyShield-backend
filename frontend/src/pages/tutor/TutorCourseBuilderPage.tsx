import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Toast from '../../components/Toast';
import { PageLoader } from '../../components/ui/Loading';
import type { Course, CourseModule } from '../../types/course';
import {
  createCourse,
  createModule,
  getCourse,
  getCourses,
  publishCourse,
  updateCourse,
  getScenarios,
  type ScenarioSummary,
} from '../../services/courseService';

type ViewMode = 'list' | 'builder';

type BuilderModule = {
  key: string;
  serverId?: string;
  position: number;
  title: string;
  description: string;
  module_type: 'reading' | 'simulation';
  content_body: string;
  scenario: string | null;
  minimum_passing_score: number;
  max_simulation_attempts: number;
};

const newKey = () => `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const courseModuleToBuilder = (m: CourseModule): BuilderModule => ({
  key: m.id,
  serverId: m.id,
  position: m.position,
  title: m.title,
  description: m.description,
  module_type: m.module_type,
  content_body: m.content_body ?? '',
  scenario: m.scenario,
  minimum_passing_score: m.minimum_passing_score,
  max_simulation_attempts: m.max_simulation_attempts,
});

const TutorCourseBuilderPage: React.FC = () => {
  const { user, isTrainee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/tutor';

  const [view, setView] = useState<ViewMode>('list');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );
  const [loadingList, setLoadingList] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);

  const [courseId, setCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [threatFocus, setThreatFocus] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4>(2);
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [passingThreshold, setPassingThreshold] = useState(70);
  const [savingCourse, setSavingCourse] = useState(false);
  const [modules, setModules] = useState<BuilderModule[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    module_type: 'reading' as 'reading' | 'simulation',
    content_body: '',
    scenario: '' as string,
    minimum_passing_score: 70,
    max_simulation_attempts: 3,
  });

  const canAccess = user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'instructor';
  const section2Enabled = Boolean(courseId);

  const myCourses = useMemo(
    () =>
      courses.filter(
        c => user?.username && c.created_by_username?.toLowerCase() === user.username.toLowerCase(),
      ),
    [courses, user?.username],
  );

  const loadCourses = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await getCourses();
      setCourses(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load courses' });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setScenarios(await getScenarios());
      } catch {
        setScenarios([]);
      }
    };
    void loadScenarios();
  }, []);

  const resetBuilder = () => {
    setCourseId(null);
    setTitle('');
    setDescription('');
    setThreatFocus('');
    setDifficulty(2);
    setEstimatedHours(1);
    setPassingThreshold(70);
    setModules([]);
    setEditingKey(null);
    setShowAddForm(false);
  };

  const openBuilderNew = () => {
    resetBuilder();
    setView('builder');
  };

  const openBuilderEdit = async (id: string) => {
    try {
      const c = await getCourse(id);
      setCourseId(c.id);
      setTitle(c.title);
      setDescription(c.description);
      setThreatFocus(c.threat_focus);
      setDifficulty(c.difficulty);
      setEstimatedHours(c.estimated_hours);
      setPassingThreshold(c.passing_threshold);
      setModules((c.modules ?? []).map(courseModuleToBuilder));
      setView('builder');
      setEditingKey(null);
      setShowAddForm(false);
    } catch {
      setToast({ type: 'error', message: 'Failed to load course' });
    }
  };

  const handleSaveCourseDetails = async () => {
    if (!title.trim() || !description.trim()) {
      setToast({ type: 'error', message: 'Title and description are required' });
      return;
    }
    try {
      setSavingCourse(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        threat_focus: threatFocus.trim() || 'General',
        difficulty,
        estimated_hours: Math.max(0, estimatedHours),
        passing_threshold: Math.min(100, Math.max(0, passingThreshold)),
      };
      if (courseId) {
        const updated = await updateCourse(courseId, {
          ...payload,
          difficulty,
        });
        setCourseId(updated.id);
        setToast({ type: 'success', message: 'Course details saved' });
      } else {
        const created = await createCourse(payload);
        setCourseId(created.id);
        setToast({ type: 'success', message: 'Course created' });
      }
    } catch {
      setToast({ type: 'error', message: 'Could not save course' });
    } finally {
      setSavingCourse(false);
    }
  };

  const saveDraftToModules = () => {
    if (!draft.title.trim()) {
      setToast({ type: 'error', message: 'Module title is required' });
      return;
    }
    const pos =
      modules.length === 0 ? 0 : Math.max(...modules.map(m => m.position), -1) + 1;
    const row: BuilderModule = {
      key: newKey(),
      position: pos,
      title: draft.title.trim(),
      description: draft.description.trim(),
      module_type: draft.module_type,
      content_body: draft.module_type === 'reading' ? draft.content_body : '',
      scenario: draft.module_type === 'simulation' && draft.scenario ? draft.scenario : null,
      minimum_passing_score:
        draft.module_type === 'simulation' ? draft.minimum_passing_score : 0,
      max_simulation_attempts:
        draft.module_type === 'simulation' ? draft.max_simulation_attempts : 0,
    };
    setModules(prev => [...prev, row]);
    setShowAddForm(false);
    setDraft({
      title: '',
      description: '',
      module_type: 'reading',
      content_body: '',
      scenario: '',
      minimum_passing_score: 70,
      max_simulation_attempts: 3,
    });
    setToast({ type: 'success', message: 'Module added (local). Save all modules to sync.' });
  };

  const updateModuleField = (key: string, patch: Partial<BuilderModule>) => {
    setModules(prev => prev.map(m => (m.key === key ? { ...m, ...patch } : m)));
  };

  const removeModule = (key: string) => {
    setModules(prev => prev.filter(m => m.key !== key));
    if (editingKey === key) setEditingKey(null);
  };

  const buildModulesPayload = (list: BuilderModule[]): Partial<CourseModule>[] =>
    [...list]
      .sort((a, b) => a.position - b.position)
      .map(m => ({
        ...(m.serverId ? { id: m.serverId } : {}),
        title: m.title,
        description: m.description,
        module_type: m.module_type,
        position: m.position,
        content_body: m.module_type === 'reading' ? m.content_body : '',
        scenario: m.module_type === 'simulation' ? m.scenario : null,
        minimum_passing_score:
          m.module_type === 'simulation' ? m.minimum_passing_score : 0,
        max_simulation_attempts:
          m.module_type === 'simulation' ? m.max_simulation_attempts : 0,
      })) as Partial<CourseModule>[];

  const handleSaveAllModules = async () => {
    if (!courseId) {
      setToast({ type: 'error', message: 'Save course details first' });
      return;
    }
    const sorted = [...modules].sort((a, b) => a.position - b.position);
    try {
      setSavingModules(true);
      try {
        await updateCourse(courseId, {
          modules: buildModulesPayload(sorted) as unknown as Course['modules'],
        });
      } catch {
        for (const m of sorted) {
          if (!m.serverId) {
            await createModule(courseId, {
              title: m.title,
              description: m.description,
              module_type: m.module_type,
              position: m.position,
              content_body: m.module_type === 'reading' ? m.content_body : undefined,
              scenario: m.module_type === 'simulation' && m.scenario ? m.scenario : undefined,
              minimum_passing_score:
                m.module_type === 'simulation' ? m.minimum_passing_score : undefined,
              max_simulation_attempts:
                m.module_type === 'simulation' ? m.max_simulation_attempts : undefined,
            });
          }
        }
      }
      const fresh = await getCourse(courseId);
      setModules((fresh.modules ?? []).map(courseModuleToBuilder));
      setToast({ type: 'success', message: 'Modules saved' });
    } catch {
      setToast({ type: 'error', message: 'Could not save modules' });
    } finally {
      setSavingModules(false);
    }
  };

  const handlePublishCourse = async () => {
    if (!courseId) return;
    try {
      setPublishing(true);
      await publishCourse(courseId);
      setToast({ type: 'success', message: 'Course is now live' });
      resetBuilder();
      setView('list');
      void loadCourses();
    } catch {
      setToast({ type: 'error', message: 'Publish failed' });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishFromList = async (id: string) => {
    try {
      await publishCourse(id);
      setToast({ type: 'success', message: 'Course published' });
      void loadCourses();
    } catch {
      setToast({ type: 'error', message: 'Publish failed' });
    }
  };

  if (isTrainee || !canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  if (view === 'list') {
    return (
      <div className="tutor-page px-4 py-8 md:px-8">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-slate-100">My courses</h1>
          <button
            type="button"
            onClick={openBuilderNew}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
          >
            <Plus size={18} />
            Create new course
          </button>
        </div>

        {loadingList ? (
          <PageLoader message="Loading your courses…" className="min-h-0 py-16" />
        ) : myCourses.length === 0 ? (
          <p className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
            No courses yet. Create your first course.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
            <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Threat focus</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Modules</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-200">
                {myCourses.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3">{c.threat_focus}</td>
                    <td className="px-4 py-3">
                      {['—', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][c.difficulty] ?? c.difficulty}
                    </td>
                    <td className="px-4 py-3">{c.module_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.is_published
                            ? 'rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300'
                            : 'rounded-full bg-slate-600/40 px-2 py-0.5 text-xs text-slate-400'
                        }
                      >
                        {c.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openBuilderEdit(c.id)}
                          className="text-amber-400 hover:underline"
                        >
                          Edit
                        </button>
                        {!c.is_published && (
                          <button
                            type="button"
                            onClick={() => void handlePublishFromList(c.id)}
                            className="text-sky-400 hover:underline"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/courses/${c.id}/enrollments`)}
                          className="text-slate-300 hover:underline"
                        >
                          View enrollments
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tutor-page px-4 py-8 md:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <button
        type="button"
        onClick={() => {
          resetBuilder();
          setView('list');
          void loadCourses();
        }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400"
      >
        <ArrowLeft size={16} />
        Back to list
      </button>

      <h1 className="mb-8 text-2xl font-bold text-slate-100">Course builder</h1>

      <section className="mb-10 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-amber-400">Course details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-400">Title *</span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs text-slate-400">Description *</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Threat focus</span>
            <input
              value={threatFocus}
              onChange={e => setThreatFocus(e.target.value)}
              placeholder="e.g. GPS Spoofing"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Difficulty</span>
            <select
              value={difficulty}
              onChange={e => setDifficulty(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value={1}>Beginner</option>
              <option value={2}>Intermediate</option>
              <option value={3}>Advanced</option>
              <option value={4}>Expert</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Estimated hours</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={estimatedHours}
              onChange={e => setEstimatedHours(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Passing threshold %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={passingThreshold}
              onChange={e => setPassingThreshold(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={savingCourse}
          onClick={() => void handleSaveCourseDetails()}
          className="mt-6 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {savingCourse ? 'Saving…' : 'Save course details'}
        </button>
      </section>

      <section
        className={`rounded-xl border border-slate-700 bg-slate-900/50 p-6 ${section2Enabled ? '' : 'opacity-50 pointer-events-none'}`}
      >
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-amber-400">Course modules</h2>
          <button
            type="button"
            disabled={!section2Enabled}
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
          >
            <Plus size={16} />
            Add module
          </button>
        </div>

        <ul className="space-y-3">
          {[...modules]
            .sort((a, b) => a.position - b.position)
            .map(m => (
              <li key={m.key} className="rounded-lg border border-slate-600 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-slate-400">
                      Pos
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={m.position}
                        onChange={e =>
                          updateModuleField(m.key, {
                            position: Math.max(0, Math.floor(Number(e.target.value)) || 0),
                          })
                        }
                        className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                      />
                    </label>
                    <span className="font-medium text-slate-100">{m.title}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {m.module_type === 'reading' ? '📖 Reading' : '🎯 Simulation'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingKey(editingKey === m.key ? null : m.key)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
                      aria-label="Edit module"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModule(m.key)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                      aria-label="Remove module"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {editingKey === m.key && (
                  <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
                    <input
                      value={m.title}
                      onChange={e => updateModuleField(m.key, { title: e.target.value })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      placeholder="Title"
                    />
                    <textarea
                      value={m.description}
                      onChange={e => updateModuleField(m.key, { description: e.target.value })}
                      rows={2}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      placeholder="Description"
                    />
                    {m.module_type === 'reading' ? (
                      <textarea
                        value={m.content_body}
                        onChange={e => updateModuleField(m.key, { content_body: e.target.value })}
                        rows={6}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        placeholder="Content body"
                      />
                    ) : (
                      <>
                        <select
                          value={m.scenario ?? ''}
                          onChange={e =>
                            updateModuleField(m.key, {
                              scenario: e.target.value || null,
                            })
                          }
                          className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        >
                          <option value="">Select scenario</option>
                          {scenarios.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.title} — {s.threat_type} (diff {s.difficulty})
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-3">
                          <label className="text-xs text-slate-400">
                            Min pass %
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={m.minimum_passing_score}
                              onChange={e =>
                                updateModuleField(m.key, {
                                  minimum_passing_score: Number(e.target.value),
                                })
                              }
                              className="ml-1 w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                            />
                          </label>
                          <label className="text-xs text-slate-400">
                            Max attempts
                            <input
                              type="number"
                              min={1}
                              value={m.max_simulation_attempts}
                              onChange={e =>
                                updateModuleField(m.key, {
                                  max_simulation_attempts: Number(e.target.value),
                                })
                              }
                              className="ml-1 w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
        </ul>

        {showAddForm && section2Enabled && (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-amber-200">New module</h3>
            <input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Module title"
              className="mb-3 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
            <div className="mb-3 flex gap-4 text-sm text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={draft.module_type === 'reading'}
                  onChange={() => setDraft(d => ({ ...d, module_type: 'reading' }))}
                />
                Reading
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={draft.module_type === 'simulation'}
                  onChange={() => setDraft(d => ({ ...d, module_type: 'simulation' }))}
                />
                Simulation checkpoint
              </label>
            </div>
            {draft.module_type === 'reading' ? (
              <textarea
                value={draft.content_body}
                onChange={e => setDraft(d => ({ ...d, content_body: e.target.value }))}
                rows={6}
                placeholder="Content body"
                className="mb-3 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            ) : (
              <div className="mb-3 space-y-3">
                <select
                  value={draft.scenario}
                  onChange={e => setDraft(d => ({ ...d, scenario: e.target.value }))}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Select scenario</option>
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.threat_type} (diff {s.difficulty})
                    </option>
                  ))}
                </select>
                <div className="flex gap-4">
                  <label className="text-xs text-slate-400">
                    Min pass %
                    <input
                      type="number"
                      value={draft.minimum_passing_score}
                      onChange={e =>
                        setDraft(d => ({ ...d, minimum_passing_score: Number(e.target.value) }))
                      }
                      className="ml-1 w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Max attempts
                    <input
                      type="number"
                      value={draft.max_simulation_attempts}
                      onChange={e =>
                        setDraft(d => ({ ...d, max_simulation_attempts: Number(e.target.value) }))
                      }
                      className="ml-1 w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveDraftToModules}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
              >
                Save module
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={!section2Enabled || savingModules}
            onClick={() => void handleSaveAllModules()}
            className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {savingModules ? 'Saving…' : 'Save all modules'}
          </button>
          <button
            type="button"
            disabled={!section2Enabled || publishing}
            onClick={() => void handlePublishCourse()}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : 'Publish course'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default TutorCourseBuilderPage;
