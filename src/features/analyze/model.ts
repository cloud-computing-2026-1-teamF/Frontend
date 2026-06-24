import type { AnalysisRecommendation, BusinessType, Vacancy, VacancyHistory, VacancyScoreExplanation } from '../../api';
import type { HorizonScore } from '../../lib/horizonScores';
import { normalizeHorizonScores } from '../../lib/horizonScores';

export const DEFAULT_RADIUS = 500;
export const MIN_RADIUS = 200;
export const MAX_RADIUS = 2000;
export const RADIUS_STEP = 100;
export const FIXED_RADIUS = DEFAULT_RADIUS;
export const DEFAULT_CENTER = { lat: 37.5572, lng: 126.9237 };

export type BizKey = string;
export type BizType = Pick<BusinessType, 'key' | 'label' | 'emoji'>;
export type AnalyzePhase = 'idle' | 'analyzing' | 'done' | 'failed';
export type VacancyTransactionType = '전체' | '임대' | '전세' | '매매';
export type CandidateStatus = 'idle' | 'loading' | 'ok' | 'error';

export type AnalyzeArea = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  roadAddress: string;
  dong: string;
  gu: string;
  displayName: string;
  regionLabel: string;
};

export type AnalyzeProperty = {
  vacancyId?: string;
  rank: number;
  recommended?: boolean | null;
  addr: string;
  floor: string;
  area: number;
  rent: number;
  deposit: number;
  mgmt: number;
  premium?: number;
  salePrice?: number;
  transactionType?: string | null;
  score: number;
  horizonScores?: HorizonScore[];
  scoreExplanation?: VacancyScoreExplanation | null;
  foot: number;
  comp: number;
  rev: number;
  growth: number;
  lat: number;
  lng: number;
  distanceM?: number;
  hourlyFloatingPopulation?: number[];
  nearby?: {
    subway: string;
    bus: string;
    parking: string;
  };
  history?: VacancyHistory | null;
};

export type ScoreFeatureBenchmark = {
  average: number;
  unit: string;
  deltaUnit?: string;
  lowerIsBetter: boolean;
  maxAbsDelta: number;
};

export const SCORE_FEATURE_GLOBAL_AVERAGES: Record<string, ScoreFeatureBenchmark> = {
  evening_foot_traffic: { average: 28, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 16 },
  floating_population_annual_total: { average: 2600000, unit: '명', lowerIsBetter: false, maxAbsDelta: 1600000 },
  daily_floating_population: { average: 7200, unit: '명/일', lowerIsBetter: false, maxAbsDelta: 5200 },
  industry_growth_500m: { average: 7.5, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 8 },
  industry_growth_rate_500m: { average: 7.5, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 8 },
  sales_per_store: { average: 1300, unit: '만원', lowerIsBetter: false, maxAbsDelta: 900 },
  average_sales_per_store: { average: 1300, unit: '만원', lowerIsBetter: false, maxAbsDelta: 900 },
  monthly_rent: { average: 220, unit: '만원', lowerIsBetter: true, maxAbsDelta: 220 },
  deposit: { average: 3000, unit: '만원', lowerIsBetter: true, maxAbsDelta: 3000 },
  maintenance_fee: { average: 16, unit: '만원', lowerIsBetter: true, maxAbsDelta: 22 },
  premium: { average: 900, unit: '만원', lowerIsBetter: true, maxAbsDelta: 3600 },
  same_category_competition_500m: { average: 12, unit: '곳', lowerIsBetter: true, maxAbsDelta: 18 },
  competition_500m: { average: 12, unit: '곳', lowerIsBetter: true, maxAbsDelta: 18 },
  restaurant_count_500m: { average: 28, unit: '곳', lowerIsBetter: true, maxAbsDelta: 34 },
  cafe_count_500m: { average: 18, unit: '곳', lowerIsBetter: true, maxAbsDelta: 24 },
  closure_rate: { average: 7.6, unit: '%', deltaUnit: '%p', lowerIsBetter: true, maxAbsDelta: 6 },
  opening_rate: { average: 8.2, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 6 },
  weekend_population_ratio: { average: 30, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 16 },
  age2030_population_ratio: { average: 41, unit: '%', deltaUnit: '%p', lowerIsBetter: false, maxAbsDelta: 22 },
  resident_to_floating_ratio: { average: 0.22, unit: '', lowerIsBetter: false, maxAbsDelta: 0.2 },
  worker_to_floating_ratio: { average: 0.24, unit: '', lowerIsBetter: false, maxAbsDelta: 0.2 },
};

export const FALLBACK_BIZ_TYPES: BizType[] = [
  { key: '1', label: '한식', emoji: '🍚' },
  { key: '2', label: '중식', emoji: '🥟' },
  { key: '3', label: '일식', emoji: '🍣' },
  { key: '4', label: '서양식', emoji: '🍝' },
  { key: '5', label: '기타', emoji: '🍽️' },
  { key: '6', label: '구내식당 및 뷔페', emoji: '🥘' },
  { key: '7', label: '패스트푸드', emoji: '🍔' },
  { key: '8', label: '주점업', emoji: '🍻' },
  { key: '9', label: '카페/디저트', emoji: '☕' },
];

export function coordAreaId(lat: number, lng: number): string {
  return `coord:${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function createFallbackArea(lat: number, lng: number, bizLabel: string): AnalyzeArea {
  return {
    id: coordAreaId(lat, lng),
    lat,
    lng,
    radius: DEFAULT_RADIUS,
    roadAddress: '주소 조회 실패',
    dong: '미지정',
    gu: '',
    displayName: bizLabel ? `미지정 ${bizLabel} 입지 분석` : '미지정 일대',
    regionLabel: '미지정',
  };
}

export function reverseGeocode(
  lat: number,
  lng: number,
  bizLabel: string,
): Promise<AnalyzeArea> {
  return new Promise(resolve => {
    const geocoder = new kakao.maps.services.Geocoder();
    let dong = '';
    let gu = '';
    let roadAddress = '';
    let pending = 2;
    const finish = () => {
      if (--pending > 0) return;
      const regionLabel = dong || gu || '미지정';
      resolve({
        id: coordAreaId(lat, lng),
        lat,
        lng,
        radius: DEFAULT_RADIUS,
        roadAddress: roadAddress || `${gu} ${dong}`.trim() || '주소 정보 없음',
        dong: regionLabel,
        gu,
        displayName: bizLabel ? `${regionLabel} ${bizLabel} 입지 분석` : `${regionLabel} 일대`,
        regionLabel,
      });
    };
    geocoder.coord2RegionCode(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const h = result.find(r => r.region_type === 'H') || result[0];
        if (h) {
          dong = h.region_3depth_name || '';
          gu = h.region_2depth_name || '';
        }
      }
      finish();
    });
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        roadAddress = result[0].road_address?.address_name
          || result[0].address?.address_name
          || '';
      }
      finish();
    });
  });
}

const TOP3_OFFSETS: { dLat: number; dLng: number }[] = [
  { dLat: +0.00080, dLng: -0.00060 },
  { dLat: -0.00100, dLng: +0.00040 },
  { dLat: +0.00060, dLng: +0.00120 },
];

const COMPETITOR_OFFSETS: [number, number][] = [
  [-0.00140, -0.00100], [-0.00080, -0.00040], [+0.00020, -0.00120], [+0.00100, -0.00080],
  [-0.00140, +0.00080], [-0.00060, +0.00100], [+0.00120, +0.00140], [-0.00100, +0.00180],
  [+0.00060, -0.00140], [-0.00180, -0.00020], [+0.00160, -0.00060], [+0.00000, +0.00200],
];

const PROPERTY_SEED: Omit<AnalyzeProperty, 'lat' | 'lng'>[] = [
  { rank: 1, addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, scoreExplanation: createMockScoreExplanation(1, 92), foot: 9200, comp: 3, rev: 1850, growth: 12 },
  { rank: 2, addr: '동교동 154-8', floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, scoreExplanation: createMockScoreExplanation(2, 86), foot: 7800, comp: 5, rev: 1640, growth: 9 },
  { rank: 3, addr: '서교동 401-3', floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, scoreExplanation: createMockScoreExplanation(3, 79), foot: 6400, comp: 4, rev: 1380, growth: 11 },
];

export const buildProperties = (center: { lat: number; lng: number }): AnalyzeProperty[] =>
  PROPERTY_SEED.map((p, i) => ({
    ...p,
    lat: center.lat + TOP3_OFFSETS[i].dLat,
    lng: center.lng + TOP3_OFFSETS[i].dLng,
    horizonScores: normalizeHorizonScores(undefined, p.score),
    history: createMockVacancyHistory(p.score, p.rent, p.deposit, p.rank),
  }));

export const buildPropertiesFromRecommendations = (
  recommendations: AnalysisRecommendation[],
): AnalyzeProperty[] =>
  recommendations
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map(item => {
      const foot = item.floatingPopulationAnnualTotal
        ? Math.round(item.floatingPopulationAnnualTotal / 365)
        : 0;
      const restaurantCount = item.restaurantCount500m ?? 0;
      const cafeCount = item.cafeCount500m ?? 0;
      const area = item.facilityTotalSize ?? item.locationArea ?? 0;
      // Surface the actual location first — the business-category labels
      // ("기타주점", "맥주호프점", …) describe the previous/current tenant,
      // which is noise for someone scouting a new spot. Fall back to the
      // legacy category labels only when no address is available.
      const addr = readableLabel(item.roadAddress)
        || readableLabel(item.lotAddress)
        || readableLabel(item.businessSubCategoryName)
        || readableLabel(item.businessMiddleCategoryName)
        || `공실 ${item.vacancyId}`;

      return {
        vacancyId: item.vacancyId,
        rank: item.rank,
        recommended: item.recommended,
        addr,
        floor: readableLabel(item.category) || '상가',
        area: roundOne(area),
        rent: item.monthlyRent ?? 0,
        deposit: item.deposit ?? 0,
        mgmt: item.maintenanceFee ?? 0,
        premium: item.premium ?? 0,
        salePrice: item.salePrice ?? 0,
        transactionType: item.transactionType,
        score: Math.round(item.score),
        horizonScores: normalizeHorizonScores(item.horizonScores, item.score, item.recommended),
        scoreExplanation: ensureScoreExplanation(item.scoreExplanation, item.rank, Math.round(item.score)),
        foot,
        comp: restaurantCount + cafeCount,
        // Backend ships average_sales_per_store in won; the UI labels this
        // field as "만원" at every render site, so scale down by 10,000 once
        // here instead of at each display point.
        rev: Math.round((item.averageSalesPerStore ?? 0) / 10000),
        growth: roundOne(item.industryGrowthRate500m ?? 0),
        lat: item.latitude,
        lng: item.longitude,
        distanceM: item.distanceM,
        hourlyFloatingPopulation: item.hourlyFloatingPopulation?.map(value => Math.round(value)) ?? undefined,
        nearby: {
          subway: summarizePlaces(item.subwayStationInfo, '지하철 정보 없음'),
          bus: summarizePlaces(item.busStopInfo, '버스 정류장 정보 없음'),
          parking: summarizePlaces(item.parkingInfo, '주차장 정보 없음'),
        },
        history: item.history ?? createMockVacancyHistory(
          Math.round(item.score),
          item.monthlyRent ?? 0,
          item.deposit ?? 0,
          item.rank,
        ),
      };
    });

export const buildPropertiesFromVacancies = (vacancies: Vacancy[]): AnalyzeProperty[] =>
  vacancies
    .filter(vacancy => typeof vacancy.latitude === 'number' && typeof vacancy.longitude === 'number')
    .map((vacancy, index) => {
      const foot = vacancy.floatingPopulationAnnualTotal
        ? Math.round(vacancy.floatingPopulationAnnualTotal / 365)
        : Math.round((vacancy.hourlyFloatingPopulation?.reduce((sum, value) => sum + value, 0) ?? 0) / 24);
      const area = vacancy.facilityTotalSize ?? vacancy.locationArea ?? vacancy.dedicatedArea ?? 0;
      return {
        vacancyId: vacancy.id,
        rank: index + 1,
        recommended: vacancy.recommended,
        addr: readableLabel(vacancy.roadAddress)
          || readableLabel(vacancy.lotAddress)
          || readableLabel(vacancy.businessSubCategoryName)
          || vacancy.id,
        floor: readableLabel(vacancy.floor) || readableLabel(vacancy.category) || '상가',
        area: roundOne(area),
        rent: vacancy.monthlyRent ?? 0,
        deposit: vacancy.deposit ?? 0,
        mgmt: vacancy.maintenanceFee ?? 0,
        premium: vacancy.premium ?? 0,
        salePrice: vacancy.salePrice ?? 0,
        transactionType: vacancy.transactionType,
        score: Math.round(vacancy.survivalScore ?? 0),
        horizonScores: normalizeHorizonScores(vacancy.horizonScores, vacancy.survivalScore ?? 0, vacancy.recommended),
        scoreExplanation: ensureScoreExplanation(vacancy.scoreExplanation, index + 1, Math.round(vacancy.survivalScore ?? 0)),
        foot,
        comp: (vacancy.restaurantCount500m ?? 0) + (vacancy.cafeCount500m ?? 0),
        rev: Math.round((vacancy.averageSalesPerStore ?? 0) / 10000),
        growth: roundOne(vacancy.industryGrowthRate500m ?? 0),
        lat: vacancy.latitude as number,
        lng: vacancy.longitude as number,
        hourlyFloatingPopulation: vacancy.hourlyFloatingPopulation?.map(value => Math.round(value)) ?? undefined,
        nearby: {
          subway: summarizePlaces(vacancy.subwayStationInfo || vacancy.subway, '지하철 정보 없음'),
          bus: summarizePlaces(vacancy.busStopInfo, '버스 정류장 정보 없음'),
          parking: summarizePlaces(vacancy.parkingInfo, '주차장 정보 없음'),
        },
        history: createMockVacancyHistory(Math.round(vacancy.survivalScore ?? 0), vacancy.monthlyRent ?? 0, vacancy.deposit ?? 0, index + 1),
      };
    });

function createMockScoreExplanation(seed: number, score: number): VacancyScoreExplanation {
  return {
    source: 'mock_score_explanation',
    positive: [
      {
        direction: 'positive',
        rank: 1,
        featureKey: 'evening_foot_traffic',
        featureLabel: '저녁 유동인구',
        featureDisplayValue: `${Math.round(28 + seed * 3)}%`,
        impactValue: Number((0.13 + score / 1000).toFixed(3)),
        impactPercent: 34,
      },
      {
        direction: 'positive',
        rank: 2,
        featureKey: 'industry_growth_500m',
        featureLabel: '업종 성장률',
        featureDisplayValue: `${Math.round(8 + seed * 1.4)}%`,
        impactValue: Number((0.09 + score / 1600).toFixed(3)),
        impactPercent: 25,
      },
      {
        direction: 'positive',
        rank: 3,
        featureKey: 'sales_per_store',
        featureLabel: '점포당 평균매출',
        featureDisplayValue: `${Math.round(1300 + seed * 180).toLocaleString('ko-KR')}만원`,
        impactValue: Number((0.07 + score / 2200).toFixed(3)),
        impactPercent: 18,
      },
    ],
    negative: [
      {
        direction: 'negative',
        rank: 1,
        featureKey: 'monthly_rent',
        featureLabel: '월세',
        featureDisplayValue: `${Math.round(210 + seed * 34).toLocaleString('ko-KR')}만원`,
        impactValue: Number((-0.12 - seed / 100).toFixed(3)),
        impactPercent: 29,
      },
      {
        direction: 'negative',
        rank: 2,
        featureKey: 'same_category_competition_500m',
        featureLabel: '동종 경쟁점포',
        featureDisplayValue: `${Math.round(11 + seed * 4)}곳`,
        impactValue: Number((-0.08 - seed / 120).toFixed(3)),
        impactPercent: 22,
      },
      {
        direction: 'negative',
        rank: 3,
        featureKey: 'premium',
        featureLabel: '권리금',
        featureDisplayValue: `${Math.round(800 + seed * 700).toLocaleString('ko-KR')}만원`,
        impactValue: Number((-0.05 - seed / 160).toFixed(3)),
        impactPercent: 13,
      },
    ],
  };
}

export function ensureScoreExplanation(
  explanation: VacancyScoreExplanation | null | undefined,
  seed: number,
  score: number,
): VacancyScoreExplanation {
  if (explanation && ((explanation.positive?.length ?? 0) > 0 || (explanation.negative?.length ?? 0) > 0)) {
    return explanation;
  }
  return createMockScoreExplanation(seed, score);
}

export function getScoreFeatureBenchmark(featureKey: string): ScoreFeatureBenchmark | undefined {
  return SCORE_FEATURE_GLOBAL_AVERAGES[featureKey];
}

export const buildCompetitors = (center: { lat: number; lng: number }) =>
  COMPETITOR_OFFSETS.map(([dLat, dLng]) => ({
    lat: center.lat + dLat,
    lng: center.lng + dLng,
  }));

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
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

function createMockVacancyHistory(score: number, rent: number, deposit: number, rank: number): VacancyHistory {
  const offsets = [-8.2, -7.1, -5.6, -3.2, -1.4, 0.9, 2.0, 0];
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const scoreTrend = years.map((year, index) => {
    const current = clampScore(score + offsets[index] - rank * 0.4);
    const previous = index > 0 ? clampScore(score + offsets[index - 1] - rank * 0.4) : null;
    return {
      year,
      score: current,
      delta: previous == null ? null : roundOne(current - previous),
      confidenceLabel: scoreLabel(current),
      basis: year >= 2020 && year <= 2021 ? '코로나 충격 보정 포함' : '공공데이터 기반 모의 추세',
      source: 'mock_preview',
    };
  });
  const occupancyTimeline = [
    {
      id: `mock-${rank}-2018`,
      startedOn: '2018-03-01',
      endedOn: '2020-12-31',
      tenantLabel: '이전 음식점 운영',
      businessCategory: '일반음식점',
      status: 'closed',
      monthlyRent: Math.round(rent * 0.78),
      deposit: Math.round(deposit * 0.8),
      exitReasonCode: 'demand_shift',
      exitReasonSummary: '코로나 이후 저녁·심야 수요 약화 추정',
      source: 'mock_preview',
    },
    {
      id: `mock-${rank}-2021`,
      startedOn: '2021-04-01',
      endedOn: '2023-08-31',
      tenantLabel: '근린생활 업종 재입점',
      businessCategory: '근린생활',
      status: 'closed',
      monthlyRent: Math.round(rent * 0.88),
      deposit: Math.round(deposit * 0.9),
      exitReasonCode: 'competition_pressure',
      exitReasonSummary: '동종 경쟁과 임대료 부담이 겹친 이탈 가능성',
      source: 'mock_preview',
    },
    {
      id: `mock-${rank}-2024`,
      startedOn: '2024-01-01',
      endedOn: '2025-11-30',
      tenantLabel: '단기 운영 업종',
      businessCategory: '요식업',
      status: 'closed',
      monthlyRent: Math.round(rent * 0.96),
      deposit,
      exitReasonCode: 'fixed_cost_burden',
      exitReasonSummary: '매출 대비 고정비 부담 추정',
      source: 'mock_preview',
    },
    {
      id: `mock-${rank}-2026`,
      startedOn: '2026-01-01',
      endedOn: null,
      tenantLabel: '현재 공실',
      businessCategory: null,
      status: 'vacant',
      monthlyRent: rent,
      deposit,
      exitReasonCode: null,
      exitReasonSummary: null,
      source: 'mock_preview',
    },
  ];

  return {
    scoreTrend,
    occupancyTimeline,
    summary: {
      scoreDirection: 'up',
      scoreDelta: roundOne(scoreTrend[scoreTrend.length - 1].score - scoreTrend[0].score),
      scoreLabel: scoreLabel(score),
      occupancyPatternLabel: '업종 교체 이력 보유',
      lastExitReason: '매출 대비 고정비 부담 추정',
      source: 'mock_preview',
    },
  };
}

function clampScore(value: number): number {
  return Math.max(35, Math.min(97, roundOne(value)));
}

function scoreLabel(score: number): string {
  if (score >= 84) return '강한 안정 신호';
  if (score >= 75) return '양호한 안정 신호';
  if (score >= 65) return '관찰 필요';
  return '리스크 우선 점검';
}
