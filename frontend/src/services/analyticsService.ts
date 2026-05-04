// src/services/analyticsService.ts
//
// Matches the Django analytics app endpoints registered under api/analytics/:
//   GET /analytics/dashboard/    -> DashboardStatsView
//   GET /analytics/performance/  -> PerformanceView (UserPerformance)
//   GET /analytics/trends/       -> PerformanceTrendsView
//   GET /analytics/skills/       -> SkillAssessmentsView
//   GET /analytics/learning-path/ -> LearningPathView
//   GET /analytics/comparison/   -> ComparisonView

import api from './api';

// ─── Response types (mirror Django serializers exactly) ───────────────────────

export interface CategoryStat {
  category: string;
  count: number;
  avg_score: number;
}

export interface TrendData {
  dates: string[];
  scores: number[];
  counts: number[];
}

/** Response from GET /analytics/dashboard/ */
export interface AnalyticsDashboard {
  total_simulations: number;
  completed_simulations: number;
  average_score: number;
  total_time: number;           // seconds
  weekly_simulations: number;
  category_stats: CategoryStat[];
  recent_activity: Record<string, unknown>[];
  trend_data: TrendData;
  weak_areas: string[];
  strong_areas: string[];
  recommended_scenarios: string[];
  skill_level: Record<string, unknown>;
}

/** Response from GET /analytics/performance/ (UserPerformanceSerializer) */
export interface UserPerformance {
  id: string;
  user_email: string;
  user_name: string;
  total_simulations: number;
  total_time_spent: number;
  average_score: number;
  average_accuracy: number;
  average_response_time: number;
  category_scores: Record<string, number>;
  threat_type_scores: Record<string, number>;
  learning_curve: number[];
  improvement_rate: number;
  weak_areas: string[];
  strong_areas: string[];
  skill_levels: Record<string, unknown>;
  recommended_scenarios: string[];
  recommended_difficulty: string;
  last_updated: string;
}

/** Response from GET /analytics/trends/ (PerformanceTrendSerializer) */
export interface PerformanceTrend {
  id: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  simulations_completed: number;
  average_score: number;
  total_time: number;
  improvement: number;
}

/** Response from GET /analytics/skills/ (SkillAssessmentSerializer) */
export interface SkillAssessment {
  id: string;
  skill: string;
  skill_display: string;
  level: number;
  score: number;
  progress: number;
  assessed_at: string;
}

/** Response from GET /analytics/learning-path/ */
export interface LearningPathItem {
  scenario_id: string;
  title: string;
  difficulty: string;
  category: string;
  estimated_time: number;
  reason: string;
}

/** Response from GET /analytics/comparison/ */
export interface ComparisonStats {
  user: { avg_score: number; total_time: number; total_sims: number };
  global: { avg_score: number; avg_time: number };
  peers: { avg_score: number; avg_time: number };
  percentile: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getAnalyticsDashboard = async (): Promise<AnalyticsDashboard> => {
  const response = await api.get<AnalyticsDashboard>('/analytics/dashboard/');
  return response.data;
};

export const getUserPerformance = async (): Promise<UserPerformance> => {
  const response = await api.get<UserPerformance>('/analytics/performance/');
  return response.data;
};

export const getPerformanceTrends = async (params?: {
  period?: 'daily' | 'weekly' | 'monthly';
  days?: number;
}): Promise<PerformanceTrend[]> => {
  const response = await api.get<PerformanceTrend[]>('/analytics/trends/', { params });
  return response.data;
};

export const getSkillAssessments = async (): Promise<SkillAssessment[]> => {
  const response = await api.get<SkillAssessment[]>('/analytics/skills/');
  return response.data;
};

export const getLearningPath = async (): Promise<LearningPathItem[]> => {
  const response = await api.get<LearningPathItem[]>('/analytics/learning-path/');
  return response.data;
};

export const getComparisonStats = async (): Promise<ComparisonStats> => {
  const response = await api.get<ComparisonStats>('/analytics/comparison/');
  return response.data;
};