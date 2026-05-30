// Public API surface. Pages import `api` from here and get typed helpers
// whose names + URLs match `API_명세_수정본.md`. Whether the call is mocked
// or real is decided in `client.ts` — call sites don't need to know.

import { BASE_URL, USE_MOCK, apiRequest, getAccessToken, setAccessToken } from './client';
import type {
  AuthUser,
  AuthLoginResponse,
  LoginRequest,
  SignupRequest,
  RefreshResponse,
  BusinessType,
  AreaSearchHit,
  AnalysisRecommendation,
  AnalysisDetail,
  AnalysisEventResponse,
  AnalysisPollingResponse,
  AnalysisRecommendationsSection,
  AnalysisSectionKey,
  AnalysisSectionTodo,
  CreateAnalysisResponse,
  CreateAnalysisRequest,
  CreateAnalysisClientRequest,
  ListAnalysesQuery,
  ListAnalysesResponse,
  PatchAnalysisRequest,
  UserStats,
  Vacancy,
  VacancySearchQuery,
  VacancySearchResponse,
  VacancySearchSort,
  VacancySearchSummary,
  VacancyMetricDistribution,
  VacancyMetricReference,
  VacancyShortlistPayload,
} from './types';

export { ApiError } from './types';
export type {
  AuthUser, AuthLoginResponse, LoginRequest, SignupRequest, RefreshResponse,
  BusinessType, AreaSearchHit,
  AnalysisRecommendation, AnalysisDetail, AnalysisEventResponse, AnalysisPollingResponse, AnalysisRecommendationsSection, AnalysisSectionKey, AnalysisSectionTodo,
  CreateAnalysisResponse, CreateAnalysisRequest, CreateAnalysisClientRequest, ListAnalysesQuery, ListAnalysesResponse,
  PatchAnalysisRequest, UserStats,
  Vacancy, VacancySearchQuery, VacancySearchResponse, VacancySearchSort, VacancySearchSummary, VacancyMetricDistribution, VacancyMetricReference, VacancyShortlistPayload,
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

  /** `POST /auth/refresh` */
  refresh: () =>
    apiRequest<RefreshResponse>({ method: 'POST', path: '/auth/refresh' }).then(r => {
      setAccessToken(r.data.accessToken);
      return r.data;
    }),

  /** `POST /auth/logout` — also tells the backend to expire the refresh_token
   *  cookie so a page refresh doesn't auto-renew the session via /auth/refresh. */
  logout: async () => {
    try {
      await apiRequest<{ ok: boolean }>({ method: 'POST', path: '/auth/logout' });
    } catch {
      // Backend may be down or the cookie is already gone — proceed with the
      // local clear either way so the UI never gets stuck on a dead session.
    }
    setAccessToken(null);
    return { ok: true };
  },

  /** `POST /auth/kakao` */
  kakaoLogin: (code: string) =>
    apiRequest<AuthLoginResponse>({ method: 'POST', path: '/auth/kakao', body: { code } }).then(r => {
      setAccessToken(r.data.tokens.accessToken);
      return r.data;
    }),

  /** `POST /auth/naver` */
  naverLogin: (code: string, state: string) =>
    apiRequest<AuthLoginResponse>({ method: 'POST', path: '/auth/naver', body: { code, state } }).then(r => {
      setAccessToken(r.data.tokens.accessToken);
      return r.data;
    }),

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
  create: (body: CreateAnalysisClientRequest) =>
    apiRequest<CreateAnalysisResponse>({
      method: 'POST',
      path: '/analyses',
      body: USE_MOCK ? body : toCreateAnalysisRequest(body),
    }).then(r => r.data),

  /** `GET /analyses/:id` — polling status from the backend */
  poll: (id: number | string) =>
    apiRequest<AnalysisPollingResponse>({ method: 'GET', path: `/analyses/${id}` }).then(r => r.data),

  /** `GET /analyses/:id/events` — SSE progress stream */
  subscribeEvents: (
    id: number | string,
    handlers: {
      onEvent: (event: AnalysisEventResponse) => void;
      onError?: (error: unknown) => void;
      onComplete?: () => void;
    },
  ) => subscribeAnalysisEvents(id, handlers),

  /** Section endpoints currently return TODO envelopes from the backend. */
  section: (id: number | string, key: AnalysisSectionKey) =>
    apiRequest<AnalysisSectionTodo>({ method: 'GET', path: `/analyses/${id}/${sectionPath(key)}` }).then(r => r.data),

  /** `GET /analyses/:id/recommended-properties` */
  recommendations: (id: number | string) =>
    apiRequest<AnalysisRecommendationsSection>({ method: 'GET', path: `/analyses/${id}/recommended-properties` }).then(r => r.data),

  sections: (id: number | string) =>
    Promise.all(ANALYSIS_SECTION_KEYS.map(key => analysesApi.section(id, key))),

  /** `GET /analyses` */
  list: (query: ListAnalysesQuery = {}) =>
    apiRequest<ListAnalysesResponse>({ method: 'GET', path: '/analyses', query: query as Record<string, unknown> }).then(r => r.data),

  /** `GET /analyses/:id` */
  get: (id: number | string) =>
    apiRequest<AnalysisDetail>({ method: 'GET', path: `/analyses/${id}` }).then(r => r.data),

  /** `PATCH /analyses/:id` */
  patch: (id: number | string, body: PatchAnalysisRequest) =>
    apiRequest<AnalysisPollingResponse>({ method: 'PATCH', path: `/analyses/${id}`, body }).then(r => r.data),

  /** `DELETE /analyses/:id` */
  delete: (id: number | string) =>
    apiRequest<{ ok: true }>({ method: 'DELETE', path: `/analyses/${id}` }).then(r => r.data),
};

// ── Vacancies ──────────────────────────────────────────────────────────────
export const vacanciesApi = {
  /** `GET /vacancies/search` */
  search: (query: VacancySearchQuery = {}) =>
    apiRequest<VacancySearchResponse>({
      method: 'GET',
      path: '/vacancies/search',
      query: query as Record<string, unknown>,
    }).then(r => r.data),

  /** `GET /vacancies` */
  list: (areaId?: string) =>
    apiRequest<Vacancy[]>({
      method: 'GET',
      path: '/vacancies',
      query: areaId ? { areaId } : undefined,
    }).then(r => r.data),

  /** `GET /vacancies/:id` */
  get: (id: string) =>
    apiRequest<Vacancy>({ method: 'GET', path: `/vacancies/${id}` }).then(r => r.data),

  /** `GET /vacancies/metric-reference` */
  metricReference: (query: { categoryId?: string | null; vacancyId?: string | null } = {}) =>
    apiRequest<VacancyMetricReference>({
      method: 'GET',
      path: '/vacancies/metric-reference',
      query: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.vacancyId ? { vacancyId: query.vacancyId } : {}),
      },
    }).then(r => r.data),

  /** `GET /vacancies/shortlist` */
  getShortlist: () =>
    apiRequest<VacancyShortlistPayload>({ method: 'GET', path: '/vacancies/shortlist' }).then(r => r.data.vacancyIds),

  /** `PUT /vacancies/shortlist` — 전체 목록 교체 */
  putShortlist: (vacancyIds: string[]) =>
    apiRequest<VacancyShortlistPayload>({
      method: 'PUT',
      path: '/vacancies/shortlist',
      body: { vacancyIds },
    }).then(r => r.data.vacancyIds),
};

export const ANALYSIS_SECTION_KEYS: AnalysisSectionKey[] = [
  'recommended_properties',
  'key_metrics',
  'foot_traffic',
  'competition',
  'estimated_revenue',
  'industry_growth',
  'accessibility',
];

function toCreateAnalysisRequest(body: CreateAnalysisClientRequest): CreateAnalysisRequest {
  return {
    businessType: body.businessType,
    areaId: body.areaId,
    transactionType: body.transactionType,
    budget: body.budget,
    center: body.center,
    x: body.x,
    y: body.y,
    radiusM: body.radiusM,
    region: body.region,
  };
}

function sectionPath(key: AnalysisSectionKey): string {
  return key.replace(/_/g, '-');
}

function subscribeAnalysisEvents(
  id: number | string,
  handlers: {
    onEvent: (event: AnalysisEventResponse) => void;
    onError?: (error: unknown) => void;
    onComplete?: () => void;
  },
): () => void {
  if (USE_MOCK) {
    let index = 0;
    const steps: AnalysisEventResponse[] = [
      { status: 'running', progress: 25, step: { index: 1, total: 4, label: '주변 상권 살펴보는 중' }, error: null },
      { status: 'running', progress: 50, step: { index: 2, total: 4, label: '유동인구와 경쟁 매장 확인' }, error: null },
      { status: 'running', progress: 75, step: { index: 3, total: 4, label: '업종별 생존율 계산' }, error: null },
      { status: 'done', progress: 100, step: null, error: null },
    ];
    const timer = window.setInterval(() => {
      const event = steps[index++];
      if (!event) return;
      handlers.onEvent(event);
      if (event.status === 'done' || event.status === 'failed') {
        window.clearInterval(timer);
        handlers.onComplete?.();
      }
    }, 700);
    return () => window.clearInterval(timer);
  }

  const controller = new AbortController();
  readEventStream(id, controller, handlers);
  return () => controller.abort();
}

async function readEventStream(
  id: number | string,
  controller: AbortController,
  handlers: {
    onEvent: (event: AnalysisEventResponse) => void;
    onError?: (error: unknown) => void;
    onComplete?: () => void;
  },
) {
  try {
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${BASE_URL}/analyses/${id}/events`, {
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE failed with ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split(/\n\n/);
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const data = chunk.split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');
        if (!data) continue;
        const event = JSON.parse(data) as AnalysisEventResponse;
        handlers.onEvent(event);
        if (event.status === 'done' || event.status === 'failed') {
          handlers.onComplete?.();
          controller.abort();
          return;
        }
      }
    }
    handlers.onComplete?.();
  } catch (error) {
    if (!controller.signal.aborted) handlers.onError?.(error);
  }
}

// ── User ────────────────────────────────────────────────────────────────────
export const userApi = {
  /** `GET /users/me/stats` */
  stats: () =>
    apiRequest<UserStats>({ method: 'GET', path: '/users/me/stats' }).then(r => r.data),
};

// ── Shortlist ───────────────────────────────────────────────────────────────
type ShortlistRow = { vacancyId: string; createdAt: string };

export const shortlistApi = {
  /** `GET /users/me/shortlist` */
  list: () =>
    apiRequest<{ items: ShortlistRow[] }>({ method: 'GET', path: '/users/me/shortlist' })
      .then(r => r.data.items),

  /** `POST /users/me/shortlist/:vacancyId` — idempotent */
  add: (vacancyId: string) =>
    apiRequest<ShortlistRow>({
      method: 'POST',
      path: `/users/me/shortlist/${encodeURIComponent(vacancyId)}`,
    }).then(r => r.data),

  /** `DELETE /users/me/shortlist/:vacancyId` — idempotent */
  remove: (vacancyId: string) =>
    apiRequest<{ ok: boolean }>({
      method: 'DELETE',
      path: `/users/me/shortlist/${encodeURIComponent(vacancyId)}`,
    }).then(r => r.data),
};

export const api = {
  auth: authApi,
  catalog: catalogApi,
  analyses: analysesApi,
  vacancies: vacanciesApi,
  user: userApi,
  shortlist: shortlistApi,
};
