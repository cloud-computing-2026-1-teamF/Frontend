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
  AnalysisRecommendation,
  AnalysisDetail,
  AnalysisPollingResponse,
  AnalysisSectionTodo,
  AnalysisListItem,
  ListAnalysesResponse,
  CreateAnalysisClientRequest,
  PatchAnalysisRequest,
  UserStats,
  Vacancy,
  VacancySearchResponse,
  VacancySearchSort,
  VacancyScoreExplanation,
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

function makeScoreExplanation(seed: number, score: number): VacancyScoreExplanation {
  const dailyFoot = Math.round(7400 + seed * 820 + score * 18);
  const rent = Math.round(215 + seed * 34);
  const premium = seed === 1 ? 0 : Math.round(seed * 1150);
  const sales = Math.round(1320 + seed * 170 + score * 2);
  const competition = Math.round(9 + seed * 3);
  const growth = Number((7.2 + seed * 1.25).toFixed(1));

  return {
    source: 'mock_score_top_features',
    features: [
      {
        rank: 1,
        featureKey: 'daily_floating_population',
        featureLabel: '하루 유동인구',
        effect: dailyFoot >= 9200 ? 'positive' : 'negative',
        currentValue: dailyFoot,
        averageValue: 9200,
        displayUnit: '명/일',
        higherIsPositive: true,
      },
      {
        rank: 2,
        featureKey: 'monthly_rent',
        featureLabel: '월세',
        effect: rent <= 315 ? 'positive' : 'negative',
        currentValue: rent,
        averageValue: 315,
        displayUnit: '만원',
        higherIsPositive: false,
      },
      {
        rank: 3,
        featureKey: 'sales_per_store',
        featureLabel: '점포당 평균매출',
        effect: sales >= 1600 ? 'positive' : 'negative',
        currentValue: sales,
        averageValue: 1600,
        displayUnit: '만원',
        higherIsPositive: true,
      },
      {
        rank: 4,
        featureKey: 'same_category_competition_500m',
        featureLabel: '동종 경쟁점포',
        effect: competition <= 13 ? 'positive' : 'negative',
        currentValue: competition,
        averageValue: 13,
        displayUnit: '곳',
        higherIsPositive: false,
      },
      {
        rank: 5,
        featureKey: seed % 2 === 0 ? 'industry_growth_500m' : 'premium',
        featureLabel: seed % 2 === 0 ? '업종 성장률' : '권리금',
        effect: seed % 2 === 0 ? (growth >= 9.5 ? 'positive' : 'negative') : (premium <= 2100 ? 'positive' : 'negative'),
        currentValue: seed % 2 === 0 ? growth : premium,
        averageValue: seed % 2 === 0 ? 9.5 : 2100,
        displayUnit: seed % 2 === 0 ? '%' : '만원',
        higherIsPositive: seed % 2 === 0,
      },
    ],
  };
}

const FAKE_PROPERTIES: Omit<Top3Item, 'footHourly' | 'nearby'>[] = [
  { addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12 },
  { addr: '동교동 154-8',  floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9  },
  { addr: '서교동 401-3',  floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11 },
];

const MOCK_VACANCY_SEEDS: Vacancy[] = [
  {
    id: 'vac_mock_001',
    areaId: '11440540',
    monthlyRent: 280,
    deposit: 3000,
    maintenanceFee: 15,
    latitude: 37.5531,
    longitude: 126.9187,
    survivalScore: 92.4,
    scoreExplanation: makeScoreExplanation(1, 92.4),
    floatingPopulationAnnualTotal: 3358000,
    residentPopulationAnnualTotal: 52100,
    workerPopulationAnnualTotal: 88200,
    floatingPopulationQuarterlyAverage: 839500,
    residentPopulationQuarterlyAverage: 13025,
    workerPopulationQuarterlyAverage: 22050,
    restaurantCount250m: 12,
    cafeCount250m: 9,
    industryGrowthRate250m: 11.2,
    restaurantCount500m: 31,
    cafeCount500m: 24,
    industryGrowthRate500m: 12.1,
    restaurantCount1000m: 84,
    cafeCount1000m: 62,
    industryGrowthRate1000m: 10.3,
    category: 'food_service',
    businessMiddleCategoryName: '음식점',
    businessSubCategoryName: '서교동 1번 공실',
    multiUseFacility: true,
    facilityTotalSize: 42.1,
    locationArea: 33.5,
    eveningPopulationRatio: 35.2,
    lateNightPopulationRatio: 18.4,
    morningPopulationRatio: 12.1,
    weekendPopulationRatio: 31.8,
    age2030PopulationRatio: 48.6,
    age40PlusPopulationRatio: 27.9,
    femalePopulationRatio: 52.4,
    residentToFloatingRatio: 0.18,
    workerToFloatingRatio: 0.27,
    officialLandPrice: 14100000,
    closureRate: 6.2,
    openingRate: 9.4,
    averageSalesPerStore: 1850,
    timeBasedSalesRatio: 27.5,
    createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'vac_mock_002',
    areaId: '11440660',
    monthlyRent: 245,
    deposit: 2500,
    maintenanceFee: 12,
    latitude: 37.5578,
    longitude: 126.925,
    survivalScore: 86.1,
    scoreExplanation: makeScoreExplanation(2, 86.1),
    floatingPopulationAnnualTotal: 2847000,
    residentPopulationAnnualTotal: 48900,
    workerPopulationAnnualTotal: 76400,
    floatingPopulationQuarterlyAverage: 711750,
    residentPopulationQuarterlyAverage: 12225,
    workerPopulationQuarterlyAverage: 19100,
    restaurantCount250m: 8,
    cafeCount250m: 7,
    industryGrowthRate250m: 8.1,
    restaurantCount500m: 23,
    cafeCount500m: 19,
    industryGrowthRate500m: 9.4,
    restaurantCount1000m: 69,
    cafeCount1000m: 53,
    industryGrowthRate1000m: 7.7,
    category: 'food_service',
    businessMiddleCategoryName: '음식점',
    businessSubCategoryName: '동교동 1번 공실',
    multiUseFacility: false,
    facilityTotalSize: 36.8,
    locationArea: 28,
    eveningPopulationRatio: 32.6,
    lateNightPopulationRatio: 13.8,
    morningPopulationRatio: 15.5,
    weekendPopulationRatio: 29.1,
    age2030PopulationRatio: 44.3,
    age40PlusPopulationRatio: 31.7,
    femalePopulationRatio: 50.9,
    residentToFloatingRatio: 0.2,
    workerToFloatingRatio: 0.25,
    officialLandPrice: 13200000,
    closureRate: 7.4,
    openingRate: 8.6,
    averageSalesPerStore: 1640,
    timeBasedSalesRatio: 24.2,
    createdAt: '2026-01-06T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'vac_mock_003',
    areaId: '11440540',
    monthlyRent: 210,
    deposit: 2000,
    maintenanceFee: 10,
    latitude: 37.5522,
    longitude: 126.9212,
    survivalScore: 79.5,
    scoreExplanation: makeScoreExplanation(3, 79.5),
    floatingPopulationAnnualTotal: 2336000,
    residentPopulationAnnualTotal: 55200,
    workerPopulationAnnualTotal: 61200,
    floatingPopulationQuarterlyAverage: 584000,
    residentPopulationQuarterlyAverage: 13800,
    workerPopulationQuarterlyAverage: 15300,
    restaurantCount250m: 7,
    cafeCount250m: 4,
    industryGrowthRate250m: 9.8,
    restaurantCount500m: 18,
    cafeCount500m: 13,
    industryGrowthRate500m: 11.1,
    restaurantCount1000m: 58,
    cafeCount1000m: 41,
    industryGrowthRate1000m: 8.8,
    category: 'food_service',
    businessMiddleCategoryName: '음식점',
    businessSubCategoryName: '서교동 2번 공실',
    multiUseFacility: false,
    facilityTotalSize: 49.2,
    locationArea: 42,
    eveningPopulationRatio: 28.8,
    lateNightPopulationRatio: 10.7,
    morningPopulationRatio: 18.2,
    weekendPopulationRatio: 34.9,
    age2030PopulationRatio: 39.6,
    age40PlusPopulationRatio: 35.1,
    femalePopulationRatio: 47.5,
    residentToFloatingRatio: 0.26,
    workerToFloatingRatio: 0.22,
    officialLandPrice: 11800000,
    closureRate: 8.8,
    openingRate: 7.5,
    averageSalesPerStore: 1380,
    timeBasedSalesRatio: 22.4,
    createdAt: '2026-01-07T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
  },
  {
    id: 'vac_mock_004',
    areaId: '11680545',
    monthlyRent: 390,
    deposit: 5000,
    maintenanceFee: 28,
    latitude: 37.5009,
    longitude: 127.0367,
    survivalScore: 88.3,
    scoreExplanation: makeScoreExplanation(4, 88.3),
    floatingPopulationAnnualTotal: 3922000,
    residentPopulationAnnualTotal: 60300,
    workerPopulationAnnualTotal: 224000,
    floatingPopulationQuarterlyAverage: 980500,
    residentPopulationQuarterlyAverage: 15075,
    workerPopulationQuarterlyAverage: 56000,
    restaurantCount250m: 16,
    cafeCount250m: 13,
    industryGrowthRate250m: 6.7,
    restaurantCount500m: 46,
    cafeCount500m: 37,
    industryGrowthRate500m: 7.2,
    restaurantCount1000m: 112,
    cafeCount1000m: 91,
    industryGrowthRate1000m: 6.9,
    category: 'food_service',
    businessMiddleCategoryName: '음식점',
    businessSubCategoryName: '역삼1동 1번 공실',
    multiUseFacility: true,
    facilityTotalSize: 57.4,
    locationArea: 45.6,
    eveningPopulationRatio: 24.5,
    lateNightPopulationRatio: 8.9,
    morningPopulationRatio: 21.4,
    weekendPopulationRatio: 18.2,
    age2030PopulationRatio: 34.7,
    age40PlusPopulationRatio: 42.5,
    femalePopulationRatio: 46.2,
    residentToFloatingRatio: 0.16,
    workerToFloatingRatio: 0.57,
    officialLandPrice: 21300000,
    closureRate: 5.8,
    openingRate: 8.1,
    averageSalesPerStore: 2360,
    timeBasedSalesRatio: 19.8,
    createdAt: '2026-01-08T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
  },
];

// 서울 전역 지도 데모용 — 고정 시드 외 행정동에 공실을 퍼뜨려 클러스터 개수가 3개로만 보이지 않게 함.
type SeoulVacancyAreaSeed = {
  areaId: string;
  dong: string;
  district: string;
  areaName: string;
  lat: number;
  lng: number;
};

const EXTRA_SEOUL_VACANCY_AREAS: SeoulVacancyAreaSeed[] = [
  { areaId: '11110615', dong: '종로1.2.3.4가동', district: '종로구', areaName: '서울특별시 종로구 종로1.2.3.4가동', lat: 37.5701, lng: 126.9910 },
  { areaId: '11680660', dong: '논현1동', district: '강남구', areaName: '서울특별시 강남구 논현1동', lat: 37.5114, lng: 127.0217 },
  { areaId: '11740690', dong: '잠실6동', district: '송파구', areaName: '서울특별시 송파구 잠실6동', lat: 37.5164, lng: 127.0998 },
  { areaId: '11560680', dong: '여의도동', district: '영등포구', areaName: '서울특별시 영등포구 여의도동', lat: 37.5219, lng: 126.9243 },
  { areaId: '11740640', dong: '석촌동', district: '송파구', areaName: '서울특별시 송파구 석촌동', lat: 37.5056, lng: 127.1138 },
  { areaId: '11380670', dong: '상암동', district: '마포구', areaName: '서울특별시 마포구 상암동', lat: 37.5796, lng: 126.8898 },
  { areaId: '11290685', dong: '성수1가1동', district: '성동구', areaName: '서울특별시 성동구 성수1가1동', lat: 37.5481, lng: 127.0568 },
  { areaId: '11230106', dong: '신촌동', district: '서대문구', areaName: '서울특별시 서대문구 신촌동', lat: 37.5599, lng: 126.9434 },
  { areaId: '11740570', dong: '풍납2동', district: '송파구', areaName: '서울특별시 송파구 풍납2동', lat: 37.5348, lng: 127.1219 },
  { areaId: '11305605', dong: '합정동', district: '마포구', areaName: '서울특별시 마포구 합정동', lat: 37.5496, lng: 126.9139 },
  { areaId: '11680631', dong: '역삼2동', district: '강남구', areaName: '서울특별시 강남구 역삼2동', lat: 37.4958, lng: 127.0467 },
  { areaId: '11290105', dong: '불광제2동', district: '은평구', areaName: '서울특별시 은평구 불광제2동', lat: 37.6289, lng: 126.9288 },
  { areaId: '11740680', dong: '방이동', district: '송파구', areaName: '서울특별시 송파구 방이동', lat: 37.5089, lng: 127.1228 },
];

function seededVacanciesFromTemplate(template: Vacancy, seeds: SeoulVacancyAreaSeed[]): Vacancy[] {
  const out: Vacancy[] = [];
  seeds.forEach((seed, seedIdx) => {
    [0, 1].forEach(slot => {
      const jitLat = (((seedIdx * 5 + slot * 3) % 9) - 4) * 0.0012;
      const jitLng = (((seedIdx * 7 + slot * 5) % 9) - 4) * 0.0012;
      const score = Math.min(93, Math.max(63.5, 89 - seedIdx * 0.85 - slot * 1.4));
      const rent = Math.round(175 + seedIdx * 6 + slot * 22 + (seed.areaId.charCodeAt(seed.areaId.length - 1) % 9) * 8);
      const day = String(((seedIdx + slot * 3) % 27) + 1).padStart(2, '0');
      out.push({
        ...template,
        id: `vac_mock_${seed.areaId}_${slot}`,
        areaId: seed.areaId,
        dong: seed.dong,
        district: seed.district,
        areaName: seed.areaName,
        latitude: seed.lat + jitLat,
        longitude: seed.lng + jitLng,
        survivalScore: Number(score.toFixed(1)),
        scoreExplanation: makeScoreExplanation(seedIdx + slot + 5, score),
        monthlyRent: rent,
        deposit: Math.round(rent * 9 + seedIdx * 120),
        maintenanceFee: Math.max(8, Math.round(10 + slot * 3 + (seedIdx % 5))),
        businessSubCategoryName: `${seed.dong} ${slot + 1}번 공실`,
        locationArea: Math.round(26 + (seedIdx % 8) * 3 + slot * 4),
        createdAt: `2026-02-${day}T00:00:00.000Z`,
        updatedAt: `2026-05-${day}T00:00:00.000Z`,
      });
    });
  });
  return out;
}

const MOCK_VACANCIES: Vacancy[] = [
  ...MOCK_VACANCY_SEEDS,
  ...seededVacanciesFromTemplate(MOCK_VACANCY_SEEDS[0], EXTRA_SEOUL_VACANCY_AREAS),
];

const handleAnalysisReport: Handler = (_spec, params) => {
  // TODO(live): tier 게이트(PRO/BUSINESS) + 실제 생성 잡. 데모는 사전 생성 샘플 HTML 반환(Track B).
  return ok({
    id: `rpt_${params.id}`,
    analysisId: params.id,
    status: 'done',
    format: 'html',
    url: '/uploads/sample-report.html',
    generatedAt: new Date().toISOString(),
  });
};

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
    saved: false,
    top3,
  };
  store.insertAnalysis(created);
  return ok({
    id: String(created.id),
    status: 'done',
    progress: 100,
    createdAt: now.toISOString(),
    estimatedSeconds: 1,
    analyzedVacancyCount: created.count,
    saved: created.saved,
    recommendations: mockAnalysisRecommendations(center),
    links: {
      self: `/v1/analyses/${created.id}`,
      events: `/v1/analyses/${created.id}/events`,
    },
  });
};

function mockAnalysisRecommendations(center: { lat: number; lng: number }): AnalysisRecommendation[] {
  return MOCK_VACANCIES
    .slice(0, 3)
    .map((vacancy, index) => ({
      rank: index + 1,
      vacancyId: vacancy.id,
      recommended: index < 2,
      score: vacancy.survivalScore ?? 0,
      horizonScores: vacancy.horizonScores ?? null,
      scoreExplanation: vacancy.scoreExplanation,
      distanceM: Math.round(distanceMeters(center.lat, center.lng, vacancy.latitude ?? center.lat, vacancy.longitude ?? center.lng)),
      areaId: vacancy.areaId,
      latitude: vacancy.latitude ?? center.lat,
      longitude: vacancy.longitude ?? center.lng,
      monthlyRent: vacancy.monthlyRent,
      deposit: vacancy.deposit,
      maintenanceFee: vacancy.maintenanceFee,
      premium: vacancy.premium,
      salePrice: vacancy.salePrice,
      transactionType: vacancy.transactionType,
      facilityTotalSize: vacancy.facilityTotalSize,
      locationArea: vacancy.locationArea,
      category: vacancy.category,
      roadAddress: vacancy.roadAddress,
      lotAddress: vacancy.lotAddress,
      businessMiddleCategoryName: vacancy.businessMiddleCategoryName,
      businessSubCategoryName: vacancy.businessSubCategoryName,
      floatingPopulationAnnualTotal: vacancy.floatingPopulationAnnualTotal,
      restaurantCount500m: vacancy.restaurantCount500m,
      cafeCount500m: vacancy.cafeCount500m,
      industryGrowthRate500m: vacancy.industryGrowthRate500m,
      averageSalesPerStore: vacancy.averageSalesPerStore == null ? null : vacancy.averageSalesPerStore * 10000,
      busStopInfo: vacancy.busStopInfo,
      subwayStationInfo: vacancy.subwayStationInfo,
      parkingInfo: vacancy.parkingInfo,
      hourlyFloatingPopulation: vacancy.hourlyFloatingPopulation,
      history: null,
    }));
}

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
    analyzedVacancyCount: found.count,
    saved: found.saved,
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

  // The mock branch only ever returns the rich SavedAnalysis seed shape, so
  // narrow locally to access SavedAnalysis-only fields without union noise.
  // AnalysisListItem is widened (SavedAnalysis | AnalysisPollingResponse) to
  // accommodate the real backend list response on the live transport.
  let items: SavedAnalysis[] = store.listAnalyses();
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

// ── Vacancies ─────────────────────────────────────────────────────────────
const handleSearchVacancies: Handler = (spec) => {
  const u = requireUser();
  if ('error' in u) return u;

  const q = String(spec.query?.q ?? '').trim().toLowerCase();
  const areaId = String(spec.query?.areaId ?? '').trim();
  const rentMax = numberQuery(spec.query?.rentMax);
  const depositMax = numberQuery(spec.query?.depositMax);
  const maintenanceFeeMax = numberQuery(spec.query?.maintenanceFeeMax);
  const scoreMin = numberQuery(spec.query?.scoreMin);
  const areaMin = numberQuery(spec.query?.areaMin);
  const areaMax = numberQuery(spec.query?.areaMax);
  const sort = (spec.query?.sort as VacancySearchSort | undefined) ?? 'score_desc';
  const page = Math.max(0, Math.floor(numberQuery(spec.query?.page) ?? 0));
  const size = Math.min(600, Math.max(1, Math.floor(numberQuery(spec.query?.size) ?? 20)));

  const filtered = MOCK_VACANCIES.filter(vacancy => {
    const searchable = [
      vacancy.id,
      vacancy.areaId,
      vacancy.category,
      vacancy.businessMiddleCategoryName,
      vacancy.businessSubCategoryName,
    ].filter(Boolean).join(' ').toLowerCase();

    return (!q || searchable.includes(q)) &&
      (!areaId || vacancy.areaId === areaId) &&
      (rentMax === undefined || Number(vacancy.monthlyRent ?? Infinity) <= rentMax) &&
      (depositMax === undefined || Number(vacancy.deposit ?? Infinity) <= depositMax) &&
      (maintenanceFeeMax === undefined || Number(vacancy.maintenanceFee ?? Infinity) <= maintenanceFeeMax) &&
      (scoreMin === undefined || Number(vacancy.survivalScore ?? -Infinity) >= scoreMin) &&
      (areaMin === undefined || Number(vacancy.locationArea ?? -Infinity) >= areaMin) &&
      (areaMax === undefined || Number(vacancy.locationArea ?? Infinity) <= areaMax);
  });

  const sorted = [...filtered].sort((a, b) => compareVacancies(a, b, sort));
  const start = page * size;
  const items = sorted.slice(start, start + size);
  const res: VacancySearchResponse = {
    items,
    total: sorted.length,
    page,
    size,
    totalPages: Math.ceil(sorted.length / size),
    summary: summarizeVacancies(sorted),
  };
  return ok(res);
};

const handleListVacancies: Handler = (spec) => {
  const areaId = String(spec.query?.areaId ?? '').trim();
  const items = areaId ? MOCK_VACANCIES.filter(vacancy => vacancy.areaId === areaId) : MOCK_VACANCIES;
  return ok(items);
};

const handleGetVacancy: Handler = (_spec, params) => {
  const found = MOCK_VACANCIES.find(vacancy => vacancy.id === params.id);
  return found ? ok(found) : fail(404, 'not_found', `vacancy ${params.id} not found`);
};

const handleGetVacancyShortlist: Handler = () => {
  const u = requireUser();
  if ('error' in u) return u;
  const vacancyIds = store.getVacancyShortlist();
  return ok({ vacancyIds });
};

const handlePutVacancyShortlist: Handler = (spec) => {
  const u = requireUser();
  if ('error' in u) return u;
  const body = (spec.body || {}) as { vacancyIds?: unknown };
  const raw = body.vacancyIds;
  const vacancyIds = Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string')
    : [];
  store.setVacancyShortlist(vacancyIds);
  return ok({ vacancyIds: store.getVacancyShortlist() });
};

function numberQuery(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const startLat = toRad(lat1);
  const endLat = toRad(lat2);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}

function compareVacancies(a: Vacancy, b: Vacancy, sort: VacancySearchSort): number {
  const desc = (left?: number | null, right?: number | null) => Number(right ?? -Infinity) - Number(left ?? -Infinity);
  const asc = (left?: number | null, right?: number | null) => Number(left ?? Infinity) - Number(right ?? Infinity);
  const id = a.id.localeCompare(b.id);
  if (sort === 'rent_asc') return asc(a.monthlyRent, b.monthlyRent) || desc(a.survivalScore, b.survivalScore) || id;
  if (sort === 'rent_desc') return desc(a.monthlyRent, b.monthlyRent) || desc(a.survivalScore, b.survivalScore) || id;
  if (sort === 'deposit_asc') return asc(a.deposit, b.deposit) || desc(a.survivalScore, b.survivalScore) || id;
  if (sort === 'area_desc') return desc(a.locationArea, b.locationArea) || desc(a.survivalScore, b.survivalScore) || id;
  if (sort === 'updated_desc') return b.updatedAt.localeCompare(a.updatedAt) || id;
  return desc(a.survivalScore, b.survivalScore) || id;
}

function summarizeVacancies(items: Vacancy[]): VacancySearchResponse['summary'] {
  return {
    total: items.length,
    averageScore: average(items.map(item => item.survivalScore)),
    averageRent: average(items.map(item => item.monthlyRent)),
    averageDeposit: average(items.map(item => item.deposit)),
    averageMaintenanceFee: average(items.map(item => item.maintenanceFee)),
    minRent: min(items.map(item => item.monthlyRent)),
    maxRent: max(items.map(item => item.monthlyRent)),
    areaCount: new Set(items.map(item => item.areaId)).size,
  };
}

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

function min(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numbers.length ? Math.min(...numbers) : null;
}

function max(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : null;
}

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

/** Aligns with `shortlistApi` — same backing store as GET/PUT /vacancies/shortlist */
const handleListMeShortlist: Handler = () => {
  const u = requireUser();
  if ('error' in u) return u;
  const ids = store.getVacancyShortlist();
  const createdAt = new Date().toISOString();
  return ok({
    items: ids.map(vacancyId => ({ vacancyId, createdAt })),
  });
};

const handlePostMeShortlist: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const vacancyId = params.vacancyId;
  const ids = store.getVacancyShortlist();
  if (!ids.includes(vacancyId)) store.setVacancyShortlist([...ids, vacancyId]);
  return ok({ vacancyId, createdAt: new Date().toISOString() });
};

const handleDeleteMeShortlist: Handler = (_spec, params) => {
  const u = requireUser();
  if ('error' in u) return u;
  const vacancyId = params.vacancyId;
  store.setVacancyShortlist(store.getVacancyShortlist().filter(id => id !== vacancyId));
  return ok({ ok: true });
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
  route('POST /analyses/:id/report',  handleAnalysisReport),
  route('GET /analyses',              handleListAnalyses),
  route('GET /analyses/:id',          handlePollAnalysis),
  route('GET /analyses/:id/:section', handleSection),
  route('PATCH /analyses/:id',        handlePatchAnalysis),
  route('DELETE /analyses/:id',       handleDeleteAnalysis),

  route('GET /vacancies/search',      handleSearchVacancies),
  route('GET /vacancies/shortlist',   handleGetVacancyShortlist),
  route('PUT /vacancies/shortlist',   handlePutVacancyShortlist),
  route('GET /vacancies',             handleListVacancies),
  route('GET /vacancies/:id',         handleGetVacancy),

  route('GET /users/me/shortlist',           handleListMeShortlist),
  route('POST /users/me/shortlist/:vacancyId', handlePostMeShortlist),
  route('DELETE /users/me/shortlist/:vacancyId', handleDeleteMeShortlist),

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
