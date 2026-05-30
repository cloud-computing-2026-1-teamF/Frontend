import type { VacancySearchResponse, VacancySearchSort } from '../../api';

export type FilterState = {
  q: string;
  categoryId: string;
  rentMax: string;
  depositMax: string;
  maintenanceFeeMax: string;
  scoreMin: string;
  areaMin: string;
  areaMax: string;
  sort: VacancySearchSort;
};

export type LoadStatus = 'loading' | 'ok' | 'error';

export const PAGE_SIZE = 12;
export const MAP_PAGE_SIZE = 600;

export const EMPTY_SUMMARY: VacancySearchResponse['summary'] = {
  total: 0,
  averageScore: null,
  averageRent: null,
  averageDeposit: null,
  averageMaintenanceFee: null,
  minRent: null,
  maxRent: null,
  areaCount: 0,
};

export const SORT_OPTIONS: Array<{ value: VacancySearchSort; label: string }> = [
  { value: 'score_desc', label: '생존점수 높은 순' },
  { value: 'rent_asc', label: '월세 낮은 순' },
  { value: 'rent_desc', label: '월세 높은 순' },
  { value: 'deposit_asc', label: '보증금 낮은 순' },
  { value: 'area_desc', label: '면적 큰 순' },
  { value: 'updated_desc', label: '최근 갱신 순' },
];

export const defaultFilters: FilterState = {
  q: '',
  categoryId: '',
  rentMax: '',
  depositMax: '',
  maintenanceFeeMax: '',
  scoreMin: '',
  areaMin: '',
  areaMax: '',
  sort: 'score_desc',
};

export function numberInput(value: string): number | undefined {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function scoreClass(score?: number | null): string {
  const value = Number(score ?? 0);
  if (value >= 88) return 'score-high';
  if (value >= 75) return 'score-mid';
  return 'score-low';
}

export function formatCount(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  return Number(value).toLocaleString('ko-KR');
}

export function formatScore(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  return Number(value).toFixed(1);
}

export function formatManWon(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  return Math.round(Number(value)).toLocaleString('ko-KR');
}

export function formatLargeManWon(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  const numeric = Number(value);
  if (numeric >= 10000) {
    const rounded = numeric / 10000;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}억`;
  }
  return `${Math.round(numeric).toLocaleString('ko-KR')}만`;
}

export function formatArea(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  return `${Number(value).toFixed(1)}㎡`;
}

export function formatPeople(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  const numeric = Number(value);
  if (numeric >= 10000) return `${(numeric / 10000).toFixed(1)}만명`;
  return `${Math.round(numeric).toLocaleString('ko-KR')}명`;
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  const numeric = Number(value);
  const percentValue = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${percentValue.toFixed(1)}%`;
}

export function formatWon(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';
  const numeric = Number(value);
  if (numeric >= 100000000) return `${(numeric / 100000000).toFixed(1)}억원`;
  if (numeric >= 10000) return `${Math.round(numeric / 10000).toLocaleString('ko-KR')}만원`;
  return `${Math.round(numeric).toLocaleString('ko-KR')}원`;
}

export function compactText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function vacancyTitle(vacancy: {
  id: string;
  buildingName?: string | null;
  roadAddress?: string | null;
  lotAddress?: string | null;
  detailAddress?: string | null;
  floor?: string | null;
  dedicatedArea?: number | null;
  locationArea?: number | null;
  businessSubCategoryName?: string | null;
  middleBusinessCategory?: string | null;
}): string {
  const building = compactText(vacancy.buildingName);
  if (building) {
    const unit = vacancyUnitLabel(vacancy);
    return unit ? `${building} · ${unit}` : building;
  }
  const address = compactText(vacancy.roadAddress) || compactText(vacancy.lotAddress);
  if (address) {
    const unit = vacancyUnitLabel(vacancy);
    return unit ? `${address} · ${unit}` : address;
  }
  return compactText(vacancy.businessSubCategoryName)
    || compactText(vacancy.middleBusinessCategory)
    || vacancy.id;
}

function vacancyUnitLabel(vacancy: {
  roadAddress?: string | null;
  lotAddress?: string | null;
  detailAddress?: string | null;
  floor?: string | null;
  dedicatedArea?: number | null;
  locationArea?: number | null;
}): string | undefined {
  const detail = meaningfulUnitText(vacancy.detailAddress);
  const road = compactText(vacancy.roadAddress);
  const lot = compactText(vacancy.lotAddress);
  if (detail && detail !== road && detail !== lot && !detail.startsWith(`${lot ?? ''} `)) {
    return detail;
  }

  const floor = compactText(vacancy.floor);
  const floorLabel = floor ? formatFloorLabel(floor) : undefined;
  const area = vacancy.dedicatedArea ?? vacancy.locationArea;
  const areaLabel = typeof area === 'number' && Number.isFinite(area) ? `${area.toFixed(1)}㎡` : undefined;
  return [floorLabel, areaLabel].filter(Boolean).join(' · ') || undefined;
}

function meaningfulUnitText(value?: string | null): string | undefined {
  const normalized = compactText(value);
  if (!normalized || /^[.\-_/]+$/.test(normalized)) return undefined;
  return normalized;
}

function formatFloorLabel(floor: string): string {
  const numeric = Number(floor);
  if (Number.isInteger(numeric) && numeric < 0) return `B${Math.abs(numeric)}`;
  if (Number.isInteger(numeric) && numeric === 0) return '층 미상';
  return `${floor}층`;
}

export function vacancySubtitle(vacancy: {
  areaId: string;
  areaName?: string | null;
  district?: string | null;
  dong?: string | null;
  roadAddress?: string | null;
  businessMiddleCategoryName?: string | null;
  majorBusinessCategory?: string | null;
  category?: string | null;
}): string {
  const area = compactText(vacancy.areaName)
    || [vacancy.district, vacancy.dong].map(compactText).filter(Boolean).join(' ')
    || compactText(vacancy.areaId)
    || '행정동 미확인';
  const category = compactText(vacancy.businessMiddleCategoryName)
    || compactText(vacancy.majorBusinessCategory)
    || compactText(vacancy.category)
    || '업종 미분류';
  return `${area} · ${category}`;
}

export function totalCompetition(vacancy: {
  restaurantCount500m?: number | null;
  cafeCount500m?: number | null;
  sameCategoryRestaurantCount500m?: number | null;
}): number {
  if (vacancy.sameCategoryRestaurantCount500m !== undefined && vacancy.sameCategoryRestaurantCount500m !== null) {
    return vacancy.sameCategoryRestaurantCount500m;
  }
  return (vacancy.restaurantCount500m ?? 0) + (vacancy.cafeCount500m ?? 0);
}

export function rentBurden(vacancy: {
  monthlyRent?: number | null;
  maintenanceFee?: number | null;
  averageSalesPerStore?: number | null;
}): number | null {
  const rentWon = ((vacancy.monthlyRent ?? 0) + (vacancy.maintenanceFee ?? 0)) * 10000;
  const sales = vacancy.averageSalesPerStore ?? null;
  if (!sales || sales <= 0) return null;
  return (rentWon / sales) * 100;
}

// ── 거래유형(월세 / 전세 / 매매)별 가격 표기 ────────────────────────────────
// 데이터의 `transactionType` 값은 '임대'(월세) / '전세' / '매매' / '월세' 등으로 들어온다.
// 매물 종류에 따라 의미 있는 가격 필드가 다르므로(전세→보증금, 매매→매매가) 표기를
// 한 곳에서 통일한다.
export type TransactionKind = 'rent' | 'jeonse' | 'sale';

export function transactionKind(transactionType?: string | null): TransactionKind {
  switch (transactionType?.trim()) {
    case '매매':
      return 'sale';
    case '전세':
      return 'jeonse';
    default:
      // '임대', '월세', 빈 값 등은 모두 월세로 취급
      return 'rent';
  }
}

type VacancyPriceFields = {
  transactionType?: string | null;
  monthlyRent?: number | null;
  deposit?: number | null;
  maintenanceFee?: number | null;
  premium?: number | null;
  salePrice?: number | null;
};

export type PriceMetric = { label: string; value: string; unit: string };

/** 우측 인스펙터·지표 카드용 가격 메트릭(전용면적 제외, 가격 3종). */
export function vacancyPriceMetrics(vacancy: VacancyPriceFields): PriceMetric[] {
  const maintenance: PriceMetric = {
    label: '관리비',
    value: formatManWon(vacancy.maintenanceFee),
    unit: '만원',
  };
  switch (transactionKind(vacancy.transactionType)) {
    case 'sale':
      return [
        { label: '매매가', value: formatLargeManWon(vacancy.salePrice), unit: '' },
        { label: '권리금', value: formatLargeManWon(vacancy.premium), unit: '' },
        maintenance,
      ];
    case 'jeonse':
      return [
        { label: '전세보증금', value: formatLargeManWon(vacancy.deposit), unit: '' },
        { label: '권리금', value: formatLargeManWon(vacancy.premium), unit: '' },
        maintenance,
      ];
    default:
      return [
        { label: '월세', value: formatManWon(vacancy.monthlyRent), unit: '만원' },
        { label: '보증금', value: formatLargeManWon(vacancy.deposit), unit: '' },
        maintenance,
      ];
  }
}

/** 단일 가격만 보여주는 곳(지도 말풍선 등)을 위한 대표 가격. */
export function vacancyPrimaryPrice(vacancy: VacancyPriceFields): PriceMetric {
  return vacancyPriceMetrics(vacancy)[0];
}

/** 목록 '임대 조건' 컬럼용 — 짧은 접두사(월/전/매)와 보조 줄. */
export function vacancyRentTerms(vacancy: VacancyPriceFields): {
  prefix: string;
  primary: string;
  secondary: string;
} {
  const maintenance = `관 ${formatManWon(vacancy.maintenanceFee)}`;
  switch (transactionKind(vacancy.transactionType)) {
    case 'sale':
      return { prefix: '매', primary: formatLargeManWon(vacancy.salePrice), secondary: maintenance };
    case 'jeonse':
      return { prefix: '전', primary: formatLargeManWon(vacancy.deposit), secondary: maintenance };
    default:
      return {
        prefix: '월',
        primary: formatManWon(vacancy.monthlyRent),
        secondary: `보 ${formatLargeManWon(vacancy.deposit)} · ${maintenance}`,
      };
  }
}
