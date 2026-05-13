import type {
  AnalysisEventResponse,
  AnalysisPollingResponse,
  AnalysisRecommendation,
  BusinessType,
  CreateAnalysisResponse,
} from '../../api';
import type { SavedAnalysis, Top3Item } from '../../lib/savedAnalyses';

const SESSION_KEY = 'sg_backend_analysis_sessions';

export type AnalysisSession = {
  id: string;
  createdAt: string;
  completedAt?: string | null;
  status: AnalysisPollingResponse['status'];
  progress: number;
  stepLabel?: string | null;
  businessType: BusinessType['key'];
  category: string;
  categoryEmoji: string;
  areaId: string;
  areaName: string;
  region: string;
  roadAddress: string;
  lat: number;
  lng: number;
  radius: number;
  analyzedVacancyCount?: number | null;
  budget?: {
    depositMax?: number;
    rentMax?: number;
    maintenanceFeeMax?: number;
    premiumMax?: number;
    salePriceMax?: number;
  };
  top3?: Top3Item[];
  error?: {
    code: string;
    message: string;
  } | null;
};

type NewSessionInput = {
  response: CreateAnalysisResponse;
  businessType: BusinessType['key'];
  category: string;
  categoryEmoji: string;
  areaId: string;
  areaName: string;
  region: string;
  roadAddress: string;
  lat: number;
  lng: number;
  radius: number;
  budget?: AnalysisSession['budget'];
  recommendations?: AnalysisRecommendation[];
};

export function createAnalysisSession(input: NewSessionInput): AnalysisSession {
  return {
    id: input.response.id,
    createdAt: input.response.createdAt,
    completedAt: null,
    status: input.response.status,
    progress: input.response.progress,
    stepLabel: null,
    businessType: input.businessType,
    category: input.category,
    categoryEmoji: input.categoryEmoji,
    areaId: input.areaId,
    areaName: input.areaName,
    region: input.region,
    roadAddress: input.roadAddress,
    lat: input.lat,
    lng: input.lng,
    radius: input.radius,
    analyzedVacancyCount: input.response.analyzedVacancyCount ?? null,
    budget: input.budget,
    top3: recommendationsToTop3(input.recommendations ?? input.response.recommendations ?? []),
    error: null,
  };
}

export function listAnalysisSessions(): AnalysisSession[] {
  return readSessions().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findAnalysisSession(id: string | number): AnalysisSession | undefined {
  return readSessions().find(session => session.id === String(id));
}

export function upsertAnalysisSession(session: AnalysisSession): void {
  const sessions = readSessions();
  writeSessions([session, ...sessions.filter(item => item.id !== session.id)]);
}

export function patchAnalysisSessionStatus(id: string | number, status: AnalysisPollingResponse): AnalysisSession | undefined {
  const session = findAnalysisSession(id);
  if (!session) return undefined;
  const next: AnalysisSession = {
    ...session,
    status: status.status,
    progress: status.progress,
    stepLabel: status.step?.label ?? null,
    completedAt: status.completedAt,
    analyzedVacancyCount: status.analyzedVacancyCount ?? session.analyzedVacancyCount ?? null,
    error: status.error,
  };
  upsertAnalysisSession(next);
  return next;
}

export function patchAnalysisSessionEvent(id: string | number, event: AnalysisEventResponse): AnalysisSession | undefined {
  const session = findAnalysisSession(id);
  if (!session) return undefined;
  const next: AnalysisSession = {
    ...session,
    status: event.status,
    progress: event.progress,
    stepLabel: event.step?.label ?? null,
    completedAt: event.status === 'done' ? new Date().toISOString() : session.completedAt,
    error: event.error,
  };
  upsertAnalysisSession(next);
  return next;
}

// Build an AnalysisSession stub from the backend list payload for cases
// where the local cache doesn't have the analysis (different device, cache
// wipe, etc.). Falls back to neutral labels — the detail page should still
// fetch the full recommendations via api.analyses.recommendations(id) to
// patch in real top3 data afterwards.
export function buildSessionFromBackend(
  item: AnalysisPollingResponse,
  businessTypes: BusinessType[],
): AnalysisSession {
  const biz = businessTypes.find(b => b.key === item.businessTypeKey);
  return {
    id: item.id,
    createdAt: item.createdAt,
    completedAt: item.completedAt ?? null,
    status: item.status,
    progress: item.progress,
    stepLabel: item.step?.label ?? null,
    businessType: (item.businessTypeKey ?? 'korean') as BusinessType['key'],
    category: biz?.label ?? '업종 미상',
    categoryEmoji: biz?.emoji ?? '📍',
    areaId: '',
    areaName: '저장된 분석',
    region: '',
    roadAddress: '',
    lat: item.centerLat ?? 0,
    lng: item.centerLng ?? 0,
    radius: item.radiusM ?? 500,
    analyzedVacancyCount: item.analyzedVacancyCount ?? null,
    budget: {
      depositMax: item.budgetDepositMax ?? undefined,
      rentMax: item.budgetRentMax ?? undefined,
      maintenanceFeeMax: item.budgetMaintenanceFeeMax ?? undefined,
      premiumMax: item.budgetPremiumMax ?? undefined,
      salePriceMax: item.budgetSalePriceMax ?? undefined,
    },
    top3: item.topScore != null
      ? [{
        addr: '저장된 추천 매물',
        score: item.topScore,
        rent: 0, deposit: 0, mgmt: 0, area: 0,
        floor: '상가',
        foot: 0, comp: 0, rev: 0, growth: 0,
        footHourly: [] as number[],
        nearby: { subway: '', bus: '', parking: '' },
      }]
      : [],
    error: item.error,
  };
}

export function patchAnalysisSessionTop3(id: string | number, recommendations: AnalysisRecommendation[]): AnalysisSession | undefined {
  const session = findAnalysisSession(id);
  if (!session) return undefined;
  const next: AnalysisSession = {
    ...session,
    top3: recommendationsToTop3(recommendations),
  };
  upsertAnalysisSession(next);
  return next;
}

export function removeAnalysisSession(id: string | number): void {
  writeSessions(readSessions().filter(session => session.id !== String(id)));
}

export function sessionToSavedAnalysis(session: AnalysisSession): SavedAnalysis {
  const { date, time } = formatDateTime(session.createdAt);
  const top3 = session.top3 && session.top3.length > 0
    ? session.top3
    : makeTop3(session.lat, session.lng);
  return {
    id: session.id,
    date,
    time,
    region: session.areaName,
    regionDetail: session.roadAddress,
    radius: session.radius,
    displayName: `${session.areaName} ${session.category} 입지 분석`,
    centerLat: session.lat,
    centerLng: session.lng,
    category: session.category,
    categoryEmoji: session.categoryEmoji,
    budget: formatBudget(session.budget),
    topScore: top3[0].score,
    count: session.analyzedVacancyCount ?? 0,
    saved: true,
    top3,
  };
}

function readSessions(): AnalysisSession[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AnalysisSession[] : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: AnalysisSession[]): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore private-mode/quota issues; the active route state still works.
  }
}

function formatDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) || '--:--' };
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function formatBudget(budget?: AnalysisSession['budget']): string {
  if (!budget?.depositMax
    && !budget?.rentMax
    && !budget?.maintenanceFeeMax
    && !budget?.premiumMax
    && !budget?.salePriceMax) {
    return '예산 조건 없음';
  }
  const deposit = budget.depositMax ? `${budget.depositMax.toLocaleString()}만원` : '미지정';
  const rent = budget.rentMax ? `${budget.rentMax.toLocaleString()}만원` : '미지정';
  const maintenance = budget.maintenanceFeeMax ? `${budget.maintenanceFeeMax.toLocaleString()}만원` : '미지정';
  const premium = budget.premiumMax ? `${budget.premiumMax.toLocaleString()}만원` : '미지정';
  const salePrice = budget.salePriceMax ? `${budget.salePriceMax.toLocaleString()}만원` : '미지정';
  if (budget.salePriceMax) return `매매가 ${salePrice} / 관리비 ${maintenance}`;
  if (budget.rentMax) return `보증금 ${deposit} / 월세 ${rent} / 관리비 ${maintenance} / 권리금 ${premium}`;
  return `보증금 ${deposit} / 관리비 ${maintenance} / 권리금 ${premium}`;
}

function makeTop3(lat: number, lng: number): Top3Item[] {
  const seed: Omit<Top3Item, 'footHourly' | 'nearby'>[] = [
    { addr: '추천 후보 1', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12 },
    { addr: '추천 후보 2', floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9 },
    { addr: '추천 후보 3', floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11 },
  ];
  const offsets = [
    { dLat: 0.0008, dLng: -0.0006 },
    { dLat: -0.0010, dLng: 0.0004 },
    { dLat: 0.0006, dLng: 0.0012 },
  ];
  return seed.map((item, index) => ({
    ...item,
    addr: `${item.addr} · ${lat + offsets[index].dLat > 0 ? 'N' : 'S'}${Math.abs(lat + offsets[index].dLat).toFixed(4)}, ${lng + offsets[index].dLng > 0 ? 'E' : 'W'}${Math.abs(lng + offsets[index].dLng).toFixed(4)}`,
    footHourly: makeHourly(item.foot),
    nearby: {
      subway: '상세 데이터 준비 중',
      bus: '상세 데이터 준비 중',
      parking: '상세 데이터 준비 중',
    },
  }));
}

function recommendationsToTop3(recommendations: AnalysisRecommendation[]): Top3Item[] | undefined {
  if (recommendations.length === 0) return undefined;
  return recommendations
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map(item => {
      const foot = item.floatingPopulationAnnualTotal
        ? Math.round(item.floatingPopulationAnnualTotal / 365)
        : 0;
      const area = item.facilityTotalSize ?? item.locationArea ?? 0;
      return {
        addr: readableLabel(item.roadAddress)
          || readableLabel(item.lotAddress)
          || readableLabel(item.businessSubCategoryName)
          || readableLabel(item.businessMiddleCategoryName)
          || `공실 ${item.vacancyId}`,
        floor: readableLabel(item.category) || '상가',
        area: Math.round(area * 10) / 10,
        rent: item.monthlyRent ?? 0,
        deposit: item.deposit ?? 0,
        mgmt: item.maintenanceFee ?? 0,
        premium: item.premium ?? 0,
        salePrice: item.salePrice ?? 0,
        transactionType: item.transactionType,
        score: Math.round(item.score),
        recommended: item.recommended,
        foot,
        comp: (item.restaurantCount500m ?? 0) + (item.cafeCount500m ?? 0),
        // Scale won → 만원 once so the persisted session matches the UI label.
        rev: Math.round((item.averageSalesPerStore ?? 0) / 10000),
        growth: Math.round((item.industryGrowthRate500m ?? 0) * 10) / 10,
        footHourly: item.hourlyFloatingPopulation?.map(value => Math.round(value)) ?? makeHourly(foot || 1),
        nearby: {
          subway: summarizePlaces(item.subwayStationInfo, `${item.distanceM.toLocaleString()}m 이내 후보`),
          bus: summarizePlaces(item.busStopInfo, `공실 ID ${item.vacancyId}`),
          parking: summarizePlaces(item.parkingInfo, '주차장 정보 없음'),
        },
      };
    });
}

function readableLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return undefined;
  return trimmed;
}

function summarizePlaces(value: string | null | undefined, fallback: string): string {
  const trimmed = readableLabel(value);
  if (!trimmed) return fallback;
  const parts = trimmed.split(';').map(part => part.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(' · ') || trimmed;
  return `${parts[0]} 외 ${parts.length - 1}곳`;
}

const HOURLY_BASE = [
  0.15, 0.10, 0.07, 0.06, 0.10, 0.20, 0.35, 0.55, 0.65, 0.70, 0.75, 0.85,
  0.95, 1.00, 0.92, 0.86, 0.90, 0.98, 0.92, 0.78, 0.60, 0.46, 0.34, 0.22,
];

function makeHourly(peak: number): number[] {
  return HOURLY_BASE.map(rate => Math.round(peak * rate));
}
