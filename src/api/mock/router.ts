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
  BusinessType,
  AreaSearchHit,
  AnalysisDetail,
  AnalysisListItem,
  ListAnalysesResponse,
  CreateAnalysisRequest,
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
  const res: AuthLoginResponse = { user: acct.user, access_token: 'mock_access_token', expires_in: 900 };
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
    created_at: new Date().toISOString(),
  };
  store.insertAccount({ login_id: body.email, password: body.password, user });
  store.setUser(user);
  const res: AuthLoginResponse = { user, access_token: 'mock_access_token', expires_in: 900 };
  return ok(res);
};

const handleMe: Handler = () => {
  const u = requireUser();
  if ('error' in u) return u;
  return ok(u);
};

const handleLogout: Handler = () => {
  store.setUser(null);
  return ok({ ok: true });
};

// ── Business types / Areas ────────────────────────────────────────────────
const BIZ_TYPES: BusinessType[] = [
  { key: 'korean',   label: '한식당',    emoji: '🍚', sort_order: 1 },
  { key: 'cafe',     label: '카페',      emoji: '☕', sort_order: 2 },
  { key: 'chicken',  label: '치킨집',    emoji: '🍗', sort_order: 3 },
  { key: 'bunsik',   label: '분식점',    emoji: '🍜', sort_order: 4 },
  { key: 'bakery',   label: '베이커리',  emoji: '🥐', sort_order: 5 },
  { key: 'japanese', label: '일식',      emoji: '🍣', sort_order: 6 },
  { key: 'bar',      label: '주점',      emoji: '🍺', sort_order: 7 },
  { key: 'western',  label: '양식',      emoji: '🍝', sort_order: 8 },
  { key: 'chinese',  label: '중식',      emoji: '🥢', sort_order: 9 },
  { key: 'fastfood', label: '패스트푸드', emoji: '🍔', sort_order: 10 },
];

const handleListBizTypes: Handler = () => ok(BIZ_TYPES);

// Empty for now; `Analyze.tsx` mocks autocomplete client-side. Kept so the
// endpoint exists and returns the right envelope shape.
const handleSearchAreas: Handler = (spec) => {
  const _q = String(spec.query?.q ?? '');
  const hits: AreaSearchHit[] = [];
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
  const body = (spec.body || {}) as CreateAnalysisRequest;
  if (!body.business_type || !body.center) {
    return fail(422, 'validation_failed', 'business_type and center are required');
  }

  const biz = BIZ_TYPES.find(b => b.key === body.business_type);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const top3: Top3Item[] = FAKE_PROPERTIES.map(p => ({
    ...p,
    footHourly: makeHourly(p.foot),
    nearby: { subway: '연동 시 표시', bus: '연동 시 표시', parking: '연동 시 표시' },
  }));

  const created: SavedAnalysis = {
    id: Date.now(),
    date, time,
    region: body.region || body.display_name || '지정되지 않은 지역',
    regionDetail: body.road_address,
    radius: body.radius_m ?? 500,
    centerLat: body.center.lat,
    centerLng: body.center.lng,
    displayName: body.display_name,
    category: body.category || biz?.label || '미지정',
    categoryEmoji: body.category_emoji || biz?.emoji || '📍',
    budget: body.budget
      ? `보증금 ${body.budget.deposit_max ?? '-'} / 월세 ${body.budget.rent_max ?? '-'}`
      : '예산 조건 없음',
    topScore: top3[0].score,
    count: top3.length * 40 + 28,
    saved: true,
    top3,
  };
  store.insertAnalysis(created);
  return ok(created as AnalysisDetail);
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
  const id = Number(params.id);
  const found = store.findAnalysis(id);
  if (!found) return fail(404, 'not_found', `analysis ${params.id} not found`);
  return ok(found as AnalysisDetail);
};

const handlePatchAnalysis: Handler = (spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const id = Number(params.id);
  const patch = (spec.body || {}) as PatchAnalysisRequest;
  const updated = store.patchAnalysis(id, patch);
  if (!updated) return fail(404, 'not_found', `analysis ${params.id} not found`);
  return ok(updated as AnalysisDetail);
};

const handleDeleteAnalysis: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const id = Number(params.id);
  if (!store.removeAnalysis(id)) return fail(404, 'not_found', `analysis ${params.id} not found`);
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
  route('POST /auth/logout',          handleLogout),
  route('GET /auth/me',               handleMe),

  route('GET /business-types',        handleListBizTypes),
  route('GET /areas/search',          handleSearchAreas),

  route('POST /analyses',             handleCreateAnalysis),
  route('GET /analyses',              handleListAnalyses),
  route('GET /analyses/:id',          handleGetAnalysis),
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
