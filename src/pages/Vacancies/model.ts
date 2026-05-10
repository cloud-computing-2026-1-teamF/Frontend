import type { VacancySearchResponse, VacancySearchSort } from '../../api';

export type FilterState = {
  q: string;
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

export function vacancyTitle(vacancy: { id: string; businessSubCategoryName?: string | null }): string {
  return vacancy.businessSubCategoryName || vacancy.id;
}

export function vacancySubtitle(vacancy: {
  areaId: string;
  businessMiddleCategoryName?: string | null;
  category?: string | null;
}): string {
  return `${vacancy.areaId} · ${vacancy.businessMiddleCategoryName ?? vacancy.category ?? '업종 미분류'}`;
}

export function totalCompetition(vacancy: {
  restaurantCount500m?: number | null;
  cafeCount500m?: number | null;
}): number {
  return (vacancy.restaurantCount500m ?? 0) + (vacancy.cafeCount500m ?? 0);
}

export function rentBurden(vacancy: {
  monthlyRent?: number | null;
  maintenanceFee?: number | null;
  averageSalesPerStore?: number | null;
}): number | null {
  const rent = (vacancy.monthlyRent ?? 0) + (vacancy.maintenanceFee ?? 0);
  const sales = vacancy.averageSalesPerStore ?? null;
  if (!sales || sales <= 0) return null;
  return (rent / sales) * 100;
}
