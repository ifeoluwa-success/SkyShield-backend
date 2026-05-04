export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  category_display: string;
  threat_type: string;
  threat_type_display: string;
  difficulty: string;
  difficulty_display: string;
  estimated_time: number;
  points_possible: number;
  tags: string[];
  is_featured: boolean;
  times_completed: number;
  average_score: number;
  completion_rate: number;
  user_completed: boolean;
  user_score: number | null;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

export interface SimulationSession {
  id: string;
  scenario: Scenario;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'abandoned';
  current_step: number;
  score: number | null;
  time_spent: number;
  correct_choices: number;
  total_choices: number;
  accuracy_rate: number;
  hints_used: number;
  attempt_number: number;
  passed: boolean;
  progress_percentage: number;
  started_at: string;
  completed_at: string | null;
  last_activity: string;
}

export interface StartSimulationRequest {
  scenario_id: string;
}

export interface SubmitDecisionRequest {
  session_id: string;
  step_number: number;
  decision_type: string;
  decision_data: Record<string, unknown>;
  time_taken: number;
}

export interface HintRequest {
  session_id: string;
  step_number: number;
}

export interface StepOption {
  id: string | number;
  text: string;
  label?: string;
}

export interface SimulationStep {
  number: number;
  title: string;
  description: string;
  options: StepOption[];
  time_limit?: number;
}

export interface SimulationSessionDetail extends SimulationSession {
  current_step_data?: SimulationStep;
  total_steps?: number;
}