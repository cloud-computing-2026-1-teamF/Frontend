// Mock router — pretends to be the backend declared in `API_명세_수정본.md`.
//
// `mockRoute(spec)` matches the `(method, path)` pair against a small table
// of handlers. Each handler returns either an envelope `{ data: ... }` (mapped
// to a 2xx response) or a `MockError` (mapped to ApiError). Handlers read and
// write through `./store` so the entire mock surface area is one module.

import type { RequestSpec } from '../client';
import type {
  AuthUser,
  AuthLoginResponse,
  RefreshResponse,
  BusinessType,
  AreaSearchHit,
  AnalysisDetail,
  AnalysisPollingResponse,
  AnalysisSectionTodo,
  AnalysisListItem,
  ListAnalysesResponse,
  CreateAnalysisClientRequest,
  PatchAnalysisRequest,
  UserStats,
} from '../types';
import type { SavedAnalysis, Top3Item } from '../../lib/savedAnalyses';
import * as store from './store';

type MockOk = { body: { data: unknown } };
type MockError = { status: number; error: { code: string; message: string; details?: Record<string, string> } };
export type MockResult = MockOk | MockError;

// ── Helpers ────────────────────────────────────────────────────────────────
const ok = <T>(data: T): MockOk => ({ body: { data } });
const fail = (status: number, code: string, message: string, details?: Record<string, string>): MockError =>
  ({ status, error: { code, message, details } });

const requireUser = (): AuthUser | MockError => {
  const u = store.getUser();
  if (!u) return fail(401, 'auth_required', 'Authentication required');
  return u;
};

// Handlers are matched by `${METHOD} ${pathPattern}` where pathPattern uses
// `:id` for numeric segments. Order matters — first match wins.
type Handler = (spec: RequestSpec, params: Record<string, string>) => MockResult;
type Route = { method: string; pattern: RegExp; keys: string[]; handle: Handler };

const route = (signature: string, handle: Handler): Route => {
  const [method, raw] = signature.split(' ');
  const keys: string[] = [];
  const regex = raw.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { method, pattern: new RegExp(`^${regex}$`), keys, handle };
};

// ── Auth ───────────────────────────────────────────────────────────────────
// `email` 필드는 일반 로그인에서는 아이디(login_id)로, 회원가입에서는
// 이메일로 사용한다. 백엔드 스펙의 LoginRequest 형태를 유지하기 위해
// 필드명만 그대로 두고 mock에서는 양쪽 의미를 모두 받아준다.
const handleLogin: Handler = (spec) => {
  const body = (spec.body || {}) as { email?: string; password?: string };
  const loginId = (body.email ?? '').trim();
  const password = body.password ?? '';
  if (!loginId || !password) {
    return fail(422, 'validation_failed', '아이디와 비밀번호를 입력해주세요');
  }
  const acct = store.findAccount(loginId, password);
  if (!acct) {
    return fail(401, 'invalid_credentials', '아이디 또는 비밀번호가 올바르지 않습니다');
  }
  store.setUser(acct.user);
  const res: AuthLoginResponse = {
    user: acct.user,
    tokens: { accessToken: 'mock_access_token', refreshToken: 'mock_refresh_token', expiresIn: 900 },
  };
  return ok(res);
};

const handleSignup: Handler = (spec) => {
  const body = (spec.body || {}) as { email?: string; password?: string; name?: string };
  if (!body.email || !body.password || !body.name) {
    return fail(422, 'validation_failed', 'email, password, name are required');
  }
  if (body.password.length < 8) {
    return fail(422, 'validation_failed', 'password too short', { password: 'min 8 chars' });
  }
  if (store.accountExists(body.email)) {
    return fail(409, 'already_exists', '이미 가입된 아이디/이메일입니다');
  }
  const user: AuthUser = {
    id: 'usr_mock_' + Math.random().toString(36).slice(2, 8),
    email: body.email,
    name: body.name,
    tier: 'pro',
    createdAt: new Date().toISOString(),
  };
  store.insertAccount({ login_id: body.email, password: body.password, user });
  store.setUser(user);
  const res: AuthLoginResponse = {
    user,
    tokens: { accessToken: 'mock_access_token', refreshToken: 'mock_refresh_token', expiresIn: 900 },
  };
  return ok(res);
};

const handleMe: Handler = () => {
  const u = requireUser();
  if ('error' in u) return u;
  return ok({ user: u });
};

const handleRefresh: Handler = () => {
  const res: RefreshResponse = { accessToken: 'mock_access_token', expiresIn: 900 };
  return ok(res);
};

const handleLogout: Handler = () => {
  store.setUser(null);
  return ok({ ok: true });
};

// ── Business types / Areas ────────────────────────────────────────────────
const BIZ_TYPES: BusinessType[] = [
  { key: 'korean',   label: '한식당',    emoji: '🍚', sortOrder: 1 },
  { key: 'cafe',     label: '카페',      emoji: '☕', sortOrder: 2 },
  { key: 'chicken',  label: '치킨집',    emoji: '🍗', sortOrder: 3 },
  { key: 'bunsik',   label: '분식점',    emoji: '🍜', sortOrder: 4 },
  { key: 'bakery',   label: '베이커리',  emoji: '🥐', sortOrder: 5 },
  { key: 'japanese', label: '일식',      emoji: '🍣', sortOrder: 6 },
  { key: 'bar',      label: '주점',      emoji: '🍺', sortOrder: 7 },
  { key: 'western',  label: '양식',      emoji: '🍝', sortOrder: 8 },
  { key: 'chinese',  label: '중식',      emoji: '🥢', sortOrder: 9 },
  { key: 'fastfood', label: '패스트푸드', emoji: '🍔', sortOrder: 10 },
];

const handleListBizTypes: Handler = () => ok(BIZ_TYPES);

const handleSearchAreas: Handler = (spec) => {
  const q = String(spec.query?.q ?? '').trim();
  const areas: AreaSearchHit[] = [
    { id: '11440540', name: '서교동', region: '서울 마포구', fullName: '서울특별시 마포구 서교동', center: { lat: 37.5530, lng: 126.9186 } },
    { id: '11440660', name: '동교동', region: '서울 마포구', fullName: '서울특별시 마포구 동교동', center: { lat: 37.5578, lng: 126.9250 } },
    { id: '11680545', name: '역삼1동', region: '서울 강남구', fullName: '서울특별시 강남구 역삼1동', center: { lat: 37.5007, lng: 127.0365 } },
    { id: '11110615', name: '종로1.2.3.4가동', region: '서울 종로구', fullName: '서울특별시 종로구 종로1.2.3.4가동', center: { lat: 37.5701, lng: 126.9910 } },
  ];
  const hits = q
    ? areas.filter(area => `${area.name} ${area.region} ${area.fullName}`.includes(q))
    : [];
  return ok(hits);
};

// ── Analyses ──────────────────────────────────────────────────────────────
const HOURLY_BASE = [
  0.15, 0.10, 0.07, 0.06, 0.10, 0.20, 0.35, 0.55, 0.65, 0.70, 0.75, 0.85,
  0.95, 1.00, 0.92, 0.86, 0.90, 0.98, 0.92, 0.78, 0.60, 0.46, 0.34, 0.22,
];
const makeHourly = (peak: number): number[] => HOURLY_BASE.map(r => Math.round(peak * r));

const FAKE_PROPERTIES: Omit<Top3Item, 'footHourly' | 'nearby'>[] = [
  { addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12 },
  { addr: '동교동 154-8',  floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9  },
  { addr: '서교동 401-3',  floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11 },
];

const handleCreateAnalysis: Handler = (spec) => {
  const u = requireUser();
  if ('error' in u) return u;
  const body = (spec.body || {}) as CreateAnalysisClientRequest;
  if (!body.businessType || !body.areaId) {
    return fail(422, 'validation_failed', 'businessType and areaId are required');
  }

  const biz = BIZ_TYPES.find(b => b.key === body.businessType);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const top3: Top3Item[] = FAKE_PROPERTIES.map(p => ({
    ...p,
    footHourly: makeHourly(p.foot),
    nearby: { subway: '연동 시 표시', bus: '연동 시 표시', parking: '연동 시 표시' },
  }));
  const center = body.center ?? { lat: 37.5530, lng: 126.9186 };

  const created: SavedAnalysis = {
    id: Date.now(),
    date, time,
    region: body.region || body.displayName || '지정되지 않은 지역',
    regionDetail: body.roadAddress,
    radius: body.radiusM ?? 500,
    centerLat: center.lat,
    centerLng: center.lng,
    displayName: body.displayName,
    category: body.category || biz?.label || '미지정',
    categoryEmoji: body.categoryEmoji || biz?.emoji || '📍',
  budget: body.budget
      ? `보증금 ${body.budget.depositMax ?? '-'} / 월세 ${body.budget.rentMax ?? '-'} / 관리비 ${body.budget.maintenanceFeeMax ?? '-'}`
      : '예산 조건 없음',
    topScore: top3[0].score,
    count: top3.length * 40 + 28,
    saved: true,
    top3,
  };
  store.insertAnalysis(created);
  return ok({
    id: String(created.id),
    status: 'done',
    progress: 100,
    createdAt: now.toISOString(),
    estimatedSeconds: 1,
    links: {
      self: `/v1/analyses/${created.id}`,
      events: `/v1/analyses/${created.id}/events`,
    },
  });
};

const handlePollAnalysis: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const found = store.findAnalysis(params.id);
  if (!found) return fail(404, 'not_found', `analysis ${params.id} not found`);
  const res: AnalysisPollingResponse = {
    id: params.id,
    status: 'done',
    progress: 100,
    step: { index: 4, total: 4, label: '분석 완료' },
    createdAt: `${found.date}T${found.time}:00.000Z`,
    completedAt: `${found.date}T${found.time}:01.000Z`,
    error: null,
  };
  return ok(res);
};

const handleListAnalyses: Handler = (spec) => {
  const u = requireUser();
  if ('error' in u) return u;
  const q = String(spec.query?.q ?? '').trim();
  const sort = (spec.query?.sort as 'recent' | 'score') || 'recent';
  const savedFilter = spec.query?.saved as boolean | undefined;
  const limit = Number(spec.query?.limit ?? 50);

  let items: AnalysisListItem[] = store.listAnalyses();
  if (q) {
    items = items.filter(it =>
      it.region.includes(q) || it.category.includes(q) ||
      `${it.region} ${it.category} 입지 분석`.includes(q));
  }
  if (typeof savedFilter === 'boolean') {
    items = items.filter(it => it.saved === savedFilter);
  }
  items = [...items].sort((a, b) =>
    sort === 'score' ? b.topScore - a.topScore : b.date.localeCompare(a.date));
  items = items.slice(0, limit);

  const res: ListAnalysesResponse = { items, next_cursor: null };
  return ok(res);
};

const handleGetAnalysis: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const found = store.findAnalysis(params.id);
  if (!found) return fail(404, 'not_found', `analysis ${params.id} not found`);
  return ok(found as AnalysisDetail);
};

const handleSection: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const found = store.findAnalysis(params.id);
  if (!found) return fail(404, 'not_found', `analysis ${params.id} not found`);

  const labels: Record<string, string> = {
    'recommended-properties': '추천 매물',
    'key-metrics': '주요 지표',
    'foot-traffic': '유동인구',
    competition: '경쟁 점포',
    'estimated-revenue': '추정 매출',
    'industry-growth': '업종 성장률',
    accessibility: '입지 접근성',
  };
  const dashed = params.section;
  const res: AnalysisSectionTodo = {
    analysisId: params.id,
    sectionKey: dashed.replace(/-/g, '_') as AnalysisSectionTodo['sectionKey'],
    sectionLabel: labels[dashed] ?? dashed,
    todo: 'TODO: 공식 API/크롤링 데이터 스키마 확정 후 상세 필드 정의 예정',
    updatedAt: new Date().toISOString(),
  };
  return ok(res);
};

const handlePatchAnalysis: Handler = (spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const patch = (spec.body || {}) as PatchAnalysisRequest;
  const updated = store.patchAnalysis(params.id, patch);
  if (!updated) return fail(404, 'not_found', `analysis ${params.id} not found`);
  return ok(updated as AnalysisDetail);
};

const handleDeleteAnalysis: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  if (!store.removeAnalysis(params.id)) return fail(404, 'not_found', `analysis ${params.id} not found`);
  return ok({ ok: true });
};

// ── User stats ────────────────────────────────────────────────────────────
const handleUserStats: Handler = () => {
  const u = requireUser();
  if ('error' in u) return u;
  const items = store.listAnalyses();
  const stats: UserStats = {
    total_analyses: items.length,
    saved_analyses: items.filter(it => it.saved).length,
    avg_top_score: items.length
      ? Math.round(items.reduce((s, it) => s + it.topScore, 0) / items.length)
      : 0,
  };
  return ok(stats);
};

// ── Routing table ─────────────────────────────────────────────────────────
const ROUTES: Route[] = [
  route('POST /auth/login',           handleLogin),
  route('POST /auth/signup',          handleSignup),
  route('POST /auth/refresh',         handleRefresh),
  route('POST /auth/logout',          handleLogout),
  route('GET /auth/me',               handleMe),

  route('GET /business-types',        handleListBizTypes),
  route('GET /areas/search',          handleSearchAreas),

  route('POST /analyses',             handleCreateAnalysis),
  route('GET /analyses',              handleListAnalyses),
  route('GET /analyses/:id',          handlePollAnalysis),
  route('GET /analyses/:id/:section', handleSection),
  route('PATCH /analyses/:id',        handlePatchAnalysis),
  route('DELETE /analyses/:id',       handleDeleteAnalysis),

  route('GET /users/me/stats',        handleUserStats),
];

export function mockRoute(spec: RequestSpec): MockResult {
  for (const r of ROUTES) {
    if (r.method !== spec.method) continue;
    const m = spec.path.match(r.pattern);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    return r.handle(spec, params);
  }
  return fail(404, 'not_found', `${spec.method} ${spec.path} has no mock handler`);
}
