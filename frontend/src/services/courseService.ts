import api from './api';
import type {
  Course,
  CourseCertificate,
  CourseEnrollment,
  CourseModule,
  ModuleProgress,
} from '../types/course';
import { getScenarios as fetchScenariosFromApi } from './simulationService';

export interface ScenarioSummary {
  id: string;
  title: string;
  threat_type: string;
  difficulty: number;
}

const mapScenarioDifficulty = (difficulty: string): number => {
  const d = difficulty.toLowerCase();
  if (d === 'beginner') return 1;
  if (d === 'intermediate') return 2;
  if (d === 'advanced') return 3;
  if (d === 'expert') return 4;
  return 2;
};

/** Scenario picker options for course modules (reuses simulations catalog). */
export const getScenarios = async (): Promise<ScenarioSummary[]> => {
  const scenarios = await fetchScenariosFromApi();
  return scenarios.map(s => ({
    id: s.id,
    title: s.title,
    threat_type: s.threat_type_display || s.threat_type,
    difficulty: mapScenarioDifficulty(s.difficulty),
  }));
};

export const createCourse = async (data: {
  title: string;
  description: string;
  threat_focus: string;
  difficulty: number;
  estimated_hours: number;
  passing_threshold: number;
}): Promise<Course> => {
  const response = await api.post<Course>('/simulations/courses/', data);
  return response.data;
};

export const updateCourse = async (courseId: string, data: Partial<Course>): Promise<Course> => {
  const response = await api.patch<Course>(`/simulations/courses/${courseId}/`, data);
  return response.data;
};

export const publishCourse = async (courseId: string): Promise<Course> => {
  const response = await api.patch<Course>(`/simulations/courses/${courseId}/`, {
    is_published: true,
  });
  return response.data;
};

export const createModule = async (
  courseId: string,
  data: {
    title: string;
    description: string;
    module_type: 'reading' | 'simulation';
    position: number;
    content_body?: string;
    scenario?: string;
    minimum_passing_score?: number;
    max_simulation_attempts?: number;
  },
): Promise<CourseModule> => {
  const response = await api.post<CourseModule>(
    `/simulations/courses/${courseId}/modules/`,
    data,
  );
  return response.data;
};

export const getCourses = async (): Promise<Course[]> => {
  const response = await api.get<{ results: Course[] } | Course[]>('/simulations/courses/');
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'results' in data && Array.isArray(data.results)) return data.results;
  return [];
};

export const getCourse = async (courseId: string): Promise<Course> => {
  const response = await api.get<Course>(`/simulations/courses/${courseId}/`);
  return response.data;
};

export const enrollInCourse = async (courseId: string): Promise<CourseEnrollment> => {
  const response = await api.post<CourseEnrollment>(`/simulations/courses/${courseId}/enroll/`);
  return response.data;
};

export const getMyProgress = async (
  courseId: string,
): Promise<CourseEnrollment | { enrolled: false }> => {
  const response = await api.get<CourseEnrollment | { enrolled: false }>(
    `/simulations/courses/${courseId}/my-progress/`,
  );
  return response.data;
};

export const markReadingComplete = async (
  courseId: string,
  moduleId: string,
): Promise<ModuleProgress> => {
  const response = await api.post<ModuleProgress>(
    `/simulations/courses/${courseId}/modules/${moduleId}/complete/`,
  );
  return response.data;
};

export const getMyEnrollments = async (): Promise<CourseEnrollment[]> => {
  const response = await api.get<{ results: CourseEnrollment[] } | CourseEnrollment[]>(
    '/simulations/enrollments/',
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'results' in data && Array.isArray(data.results)) return data.results;
  return [];
};

export const getMyCertificates = async (): Promise<CourseCertificate[]> => {
  const response = await api.get<{ results: CourseCertificate[] } | CourseCertificate[]>(
    '/simulations/certificates/',
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'results' in data && Array.isArray(data.results)) return data.results;
  return [];
};

export const getCourseEnrollments = async (courseId: string): Promise<CourseEnrollment[]> => {
  const response = await api.get<{ results: CourseEnrollment[] } | CourseEnrollment[]>(
    `/simulations/courses/${courseId}/enrollments/`,
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && 'results' in data && Array.isArray(data.results)) return data.results;
  return [];
};

export const resetModuleAttempts = async (
  courseId: string,
  moduleId: string,
  traineeId: string,
): Promise<ModuleProgress> => {
  const response = await api.post<ModuleProgress>(
    `/simulations/courses/${courseId}/modules/${moduleId}/reset/`,
    { trainee_id: traineeId },
  );
  return response.data;
};
