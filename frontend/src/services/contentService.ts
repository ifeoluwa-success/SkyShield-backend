import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  parent?: string | null;
  is_active: boolean;
}

export interface ContentMaterial {
  id: string;
  title: string;
  slug: string;
  description: string;
  material_type: string;
  difficulty: string;
  tags: string[];
  file?: string;
  video_url?: string;
  external_url?: string;
  estimated_read_time?: number;
  is_published: boolean;
  is_featured: boolean;
  views_count: number;
  average_rating: number;
  created_at: string;
  category?: string;
  category_name?: string;
  author_name?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimated_duration?: number;
  materials_count?: number;
  enrolled_count?: number;
  is_enrolled?: boolean;
  progress?: number;
  created_at: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read?: boolean;
  created_at: string;
  expires_at?: string | null;
}

export interface MeetingInvitation {
  id: string;
  meeting: {
    id: string;
    title: string;
    meeting_code: string;
    scheduled_start: string;
    scheduled_end: string;
    host_name?: string;
  };
  inviter_name?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && 'results' in data) return data.results;
  return [];
}

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = async (): Promise<ContentCategory[]> => {
  const res = await api.get<ContentCategory[] | { results: ContentCategory[] }>('/content/categories/');
  return unwrap(res.data);
};

// ── Materials (public content library) ────────────────────────────────────────

export const getContentMaterials = async (params?: {
  category?: string;
  difficulty?: string;
  material_type?: string;
  search?: string;
  is_featured?: boolean;
  is_published?: boolean;
  limit?: number;
}): Promise<ContentMaterial[]> => {
  const res = await api.get<ContentMaterial[] | { results: ContentMaterial[] }>(
    '/content/materials/',
    { params: { is_published: true, ...params } },
  );
  return unwrap(res.data);
};

export const bookmarkContentMaterial = async (slug: string): Promise<{ bookmarked: boolean }> => {
  const res = await api.post<{ bookmarked: boolean }>(`/content/materials/${slug}/bookmark/`);
  return res.data;
};

// ── Learning Paths ────────────────────────────────────────────────────────────

export const getLearningPaths = async (): Promise<LearningPath[]> => {
  const res = await api.get<LearningPath[] | { results: LearningPath[] }>('/content/paths/');
  return unwrap(res.data);
};

export const enrollInLearningPath = async (slug: string): Promise<{ enrolled: boolean }> => {
  const res = await api.post<{ enrolled: boolean }>(`/content/paths/${slug}/enroll/`);
  return res.data;
};

// ── Glossary ──────────────────────────────────────────────────────────────────

export const getGlossaryTerms = async (search?: string): Promise<GlossaryTerm[]> => {
  const res = await api.get<GlossaryTerm[] | { results: GlossaryTerm[] }>(
    '/content/glossary/',
    { params: search ? { search } : undefined },
  );
  return unwrap(res.data);
};

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const getFAQs = async (params?: { category?: string; search?: string }): Promise<FAQ[]> => {
  const res = await api.get<FAQ[] | { results: FAQ[] }>('/content/faqs/', { params });
  return unwrap(res.data);
};

// ── Announcements ─────────────────────────────────────────────────────────────

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get<Announcement[] | { results: Announcement[] }>('/content/announcements/');
  return unwrap(res.data);
};

export const getUnreadAnnouncementsCount = async (): Promise<number> => {
  const res = await api.get<{ count: number } | number>('/content/announcements/unread_count/');
  if (typeof res.data === 'number') return res.data;
  return (res.data as { count: number }).count ?? 0;
};

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  materials?: ContentMaterial[];
  paths?: LearningPath[];
  total?: number;
}

export const searchContent = async (query: string): Promise<SearchResult> => {
  const res = await api.get<SearchResult>('/content/search/', { params: { q: query } });
  return res.data;
};

// ── Meeting Invitations ────────────────────────────────────────────────────────

export const getInvitations = async (): Promise<MeetingInvitation[]> => {
  const res = await api.get<MeetingInvitation[] | { results: MeetingInvitation[] }>(
    '/meetings/invitations/',
  );
  return unwrap(res.data);
};

export const acceptInvitation = async (id: string): Promise<void> => {
  await api.post(`/meetings/invitations/${id}/accept/`);
};

export const declineInvitation = async (id: string): Promise<void> => {
  await api.post(`/meetings/invitations/${id}/decline/`);
};
