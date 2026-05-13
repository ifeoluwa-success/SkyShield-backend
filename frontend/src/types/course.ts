export interface CourseModule {
  id: string;
  title: string;
  description: string;
  module_type: 'reading' | 'simulation';
  position: number;
  content_body: string;
  scenario: string | null;
  minimum_passing_score: number;
  max_simulation_attempts: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  threat_focus: string;
  difficulty: 1 | 2 | 3 | 4;
  is_published: boolean;
  estimated_hours: number;
  passing_threshold: number;
  created_by_username: string;
  module_count: number;
  modules: CourseModule[];
  created_at: string;
}

export interface ModuleProgress {
  id: string;
  module: CourseModule;
  status: 'locked' | 'unlocked' | 'in_progress' | 'passed' | 'failed';
  attempts: number;
  best_score: number | null;
  passed_at: string | null;
}

export interface CourseEnrollment {
  id: string;
  course: Course;
  status: 'enrolled' | 'in_progress' | 'completed' | 'certificate_issued';
  enrolled_at: string;
  completed_at: string | null;
  current_module: CourseModule | null;
  average_simulation_score: number | null;
  module_progresses: ModuleProgress[];
  certificate_number: string | null;
  /** Present when listing enrollments as supervisor/tutor */
  trainee_username?: string;
  trainee_id?: string;
  user?: { id: string; username: string };
}

export interface CourseCertificate {
  id: string;
  certificate_number: string;
  course_title: string;
  trainee_username: string;
  final_score: number;
  issued_at: string;
}
