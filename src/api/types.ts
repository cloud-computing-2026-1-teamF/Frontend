// Shared response types. Shape mirrors `API_명세_수정본.md`.
// All success bodies are wrapped in `{ data: ... }` per the API contract;
// errors throw `ApiError` so callers can `try/catch` instead of branching on
// a status field. Mock and real transports share these types.

import type { SavedAnalysis, Top3Item } from '../lib/savedAnalyses';

export type ApiEnvelope<T> = { data: T };

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string>;
  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'business';
  created_at?: string;
};

export type LoginRequest = { email: string; password: string };
export type SignupRequest = {
  email: string;
  password: string;
  name: string;
  agree_terms?: boolean;
};
export type AuthLoginResponse = {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

// ── Business types / Areas ──────────────────────────────────────────────────
export type BusinessType = {
  key: 'korean' | 'cafe' | 'chicken' | 'bunsik' | 'bakery' | 'japanese' | 'bar' | 'western' | 'chinese' | 'fastfood';
  label: string;
  emoji: string;
  sortOrder: number;
};

export type AreaSearchHit = {
  id: string;
  name: string;
  region: string;
  fullName: string;
  center: { lat: number; lng: number };
};

export type CreateAnalysisResponse = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  createdAt: string;
  estimatedSeconds: number;
  links: {
    self: string;
    events: string;
  };
};

export type AnalysisPollingResponse = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  step: {
    index: number;
    total: number;
    label: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
  error: {
    code: string;
    message: string;
  } | null;
};

// ── Analyses ────────────────────────────────────────────────────────────────
export type CreateAnalysisRequest = {
  businessType: BusinessType['key'];
  areaId: string;
  center?: { lat: number; lng: number };
  radius_m?: number;
  road_address?: string;
  display_name?: string;
  budget?: { deposit_max?: number; rent_max?: number };
  // Mock-only convenience fields. Real backend will derive these from
  // `business_type` (label/emoji) and `center` → reverse-geocoded region.
  // Kept here so the mock can echo back the same shape the UI already shows.
  category?: string;
  category_emoji?: string;
  region?: string;
};

// Shape that the UI consumes for both list-row and detail.
// In the spec these are slightly different (list row has `summary.top_three`
// only, detail has full `properties[]`) — we keep both as the same `SavedAnalysis`
// shape for simplicity since the seed data already carries Top3 inline.
export type AnalysisDetail = SavedAnalysis;
export type AnalysisListItem = SavedAnalysis;

export type ListAnalysesQuery = {
  cursor?: string;
  limit?: number;
  sort?: 'recent' | 'score';
  saved?: boolean;
  status?: 'done' | 'failed';
  q?: string;
};

export type ListAnalysesResponse = {
  items: AnalysisListItem[];
  next_cursor: string | null;
};

export type PatchAnalysisRequest = {
  saved?: boolean;
  memo?: string;
};

// ── User stats ──────────────────────────────────────────────────────────────
export type UserStats = {
  total_analyses: number;
  saved_analyses: number;
  avg_top_score: number;
};

// Re-export for convenience so callers don't import from two places.
export type { Top3Item };
