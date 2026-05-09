// Public API surface. Pages import `api` from here and get typed helpers
// whose names + URLs match `API_명세_수정본.md`. Whether the call is mocked
// or real is decided in `client.ts` — call sites don't need to know.

import { apiRequest, setAccessToken } from './client';
import type {
  AuthUser,
  AuthLoginResponse,
  LoginRequest,
  SignupRequest,
  BusinessType,
  AreaSearchHit,
  AnalysisDetail,
  AnalysisPollingResponse,
  CreateAnalysisResponse,
  CreateAnalysisRequest,
  ListAnalysesQuery,
  ListAnalysesResponse,
  PatchAnalysisRequest,
  UserStats,
} from './types';

export { ApiError } from './types';
export type {
  AuthUser, AuthLoginResponse, LoginRequest, SignupRequest,
  BusinessType, AreaSearchHit,
  AnalysisDetail, AnalysisPollingResponse, CreateAnalysisResponse, CreateAnalysisRequest, ListAnalysesQuery, ListAnalysesResponse,
  PatchAnalysisRequest, UserStats,
} from './types';

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  /** `POST /auth/login` */
  login: (body: LoginRequest) =>
    apiRequest<AuthLoginResponse>({ method: 'POST', path: '/auth/login', body }).then(r => {
      setAccessToken(r.data.tokens.accessToken);
      return r.data;
    }),

  /** `POST /auth/signup` */
  signup: (body: SignupRequest) =>
    apiRequest<AuthLoginResponse>({ method: 'POST', path: '/auth/signup', body }).then(r => {
      setAccessToken(r.data.tokens.accessToken);
      return r.data;
    }),

  /** `POST /auth/logout` */
  logout: () => {
    setAccessToken(null);
    return Promise.resolve({ ok: true });
  },

  /** `GET /auth/me` */
  me: () =>
    apiRequest<{ user: AuthUser }>({ method: 'GET', path: '/auth/me' }).then(r => r.data.user),
};

// ── Catalog ─────────────────────────────────────────────────────────────────
export const catalogApi = {
  /** `GET /business-types` */
  listBusinessTypes: () =>
    apiRequest<BusinessType[]>({ method: 'GET', path: '/business-types' }).then(r => r.data),

  /** `GET /areas/search?q=...` */
  searchAreas: (q: string) =>
    apiRequest<AreaSearchHit[]>({ method: 'GET', path: '/areas/search', query: { q } }).then(r => r.data),
};

// ── Analyses ────────────────────────────────────────────────────────────────
export const analysesApi = {
  /** `POST /analyses` — async 202 response in the backend */
  create: (body: CreateAnalysisRequest) =>
    apiRequest<CreateAnalysisResponse>({ method: 'POST', path: '/analyses', body }).then(r => r.data),

  /** `GET /analyses/:id` — polling status from the backend */
  poll: (id: number | string) =>
    apiRequest<AnalysisPollingResponse>({ method: 'GET', path: `/analyses/${id}` }).then(r => r.data),

  /** `GET /analyses` */
  list: (query: ListAnalysesQuery = {}) =>
    apiRequest<ListAnalysesResponse>({ method: 'GET', path: '/analyses', query: query as Record<string, unknown> }).then(r => r.data),

  /** `GET /analyses/:id` */
  get: (id: number | string) =>
    apiRequest<AnalysisDetail>({ method: 'GET', path: `/analyses/${id}` }).then(r => r.data),

  /** `PATCH /analyses/:id` */
  patch: (id: number | string, body: PatchAnalysisRequest) =>
    apiRequest<AnalysisDetail>({ method: 'PATCH', path: `/analyses/${id}`, body }).then(r => r.data),

  /** `DELETE /analyses/:id` */
  delete: (id: number | string) =>
    apiRequest<{ ok: true }>({ method: 'DELETE', path: `/analyses/${id}` }).then(r => r.data),
};

// ── User ────────────────────────────────────────────────────────────────────
export const userApi = {
  /** `GET /users/me/stats` */
  stats: () =>
    apiRequest<UserStats>({ method: 'GET', path: '/users/me/stats' }).then(r => r.data),
};

export const api = {
  auth: authApi,
  catalog: catalogApi,
  analyses: analysesApi,
  user: userApi,
};
