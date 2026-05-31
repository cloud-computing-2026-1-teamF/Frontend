import type { AreaSearchHit, BusinessType, VacancySearchQuery, VacancySearchResponse, VacancySearchSort, VacancySearchSummary, VacancyStructuredFilter } from '../../api';
import type { VacancyTransactionType } from '../../features/analyze/model';

export type FilterState = {
  q: string;
  categoryId: string;
  transactionType: VacancyTransactionType;
  rentMax: string;
  depositMax: string;
  maintenanceFeeMax: string;
  salePriceMax: string;
  premiumMax: string;
  scoreMin: string;
  areaMin: string;
  areaMax: string;
  sort: VacancySearchSort;
};

export const TRANSACTION_OPTIONS: Array<{ value: VacancyTransactionType; label: string }> = [
  { value: '전체', label: '전체' },
  // 데이터상 월세 매물의 거래유형 값은 '임대'이므로 화면 라벨만 '월세'로 보여준다.
  { value: '임대', label: '월세' },
  { value: '전세', label: '전세' },
  { value: '매매', label: '매매' },
];

/** 거래유형을 검색 쿼리 파라미터로 변환('전체'는 미지정). */
export function transactionTypeParam(transactionType: VacancyTransactionType): string | undefined {
  return transactionType === '전체' ? undefined : transactionType;
}

/** 선택한 거래유형에 맞는 가격 필터 파라미터만 추려서 반환한다. */
export function priceFilterParams(filters: FilterState): Pick<
  VacancySearchQuery,
  'rentMax' | 'depositMax' | 'maintenanceFeeMax' | 'salePriceMax' | 'premiumMax'
> {
  const maintenanceFeeMax = numberInput(filters.maintenanceFeeMax);
  switch (filters.transactionType) {
    case '매매':
      return {
        salePriceMax: numberInput(filters.salePriceMax),
        premiumMax: numberInput(filters.premiumMax),
        maintenanceFeeMax,
      };
    case '전세':
      return {
        depositMax: numberInput(filters.depositMax),
        maintenanceFeeMax,
      };
    default: // 전체 / 임대(월세)
      return {
        rentMax: numberInput(filters.rentMax),
        depositMax: numberInput(filters.depositMax),
        maintenanceFeeMax,
      };
  }
}

export type LoadStatus = 'loading' | 'ok' | 'error';

export const PAGE_SIZE = 12;
export const MAP_PAGE_SIZE = 600;

export const EMPTY_SUMMARY: VacancySearchResponse['summary'] = {
  total: 0,
  averageScore: null,
  averageRent: null,
  averageDeposit: null,
  averageSalePrice: null,
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
  transactionType: '전체',
  rentMax: '',
  depositMax: '',
  maintenanceFeeMax: '',
  salePriceMax: '',
  premiumMax: '',
  scoreMin: '',
  areaMin: '',
  areaMax: '',
  sort: 'score_desc',
};

export type PromptFilterPatch = {
  filters: Partial<FilterState>;
  areaKeyword?: string;
  areaDistrictHint?: string;
  labels: string[];
};

type BusinessTypeAlias = {
  aliases: string[];
  preferredKeys: string[];
  labelNeedles: string[];
};

const BUSINESS_TYPE_ALIASES: BusinessTypeAlias[] = [
  { aliases: ['고기집', '고깃집', '삼겹살', '갈비', '한식', '국밥', '백반', '식당'], preferredKeys: ['1', 'korean'], labelNeedles: ['한식', '한식당'] },
  { aliases: ['카페', '커피', '디저트', '베이커리', '빵집', '제과'], preferredKeys: ['9', 'cafe', 'bakery'], labelNeedles: ['카페', '디저트', '베이커리'] },
  { aliases: ['중식', '중국집', '짜장', '짜장면', '짬뽕', '마라탕'], preferredKeys: ['2', 'chinese'], labelNeedles: ['중식'] },
  { aliases: ['일식', '초밥', '스시', '라멘', '돈카츠', '이자카야'], preferredKeys: ['3', 'japanese'], labelNeedles: ['일식'] },
  { aliases: ['양식', '파스타', '피자', '스테이크', '브런치'], preferredKeys: ['4', 'western'], labelNeedles: ['서양식', '양식'] },
  { aliases: ['뷔페', '구내식당', '단체급식'], preferredKeys: ['6'], labelNeedles: ['뷔페', '구내식당'] },
  { aliases: ['패스트푸드', '햄버거', '버거', '샌드위치'], preferredKeys: ['7', 'fastfood'], labelNeedles: ['패스트푸드'] },
  { aliases: ['술집', '주점', '포차', '호프', '바'], preferredKeys: ['8', 'bar'], labelNeedles: ['주점'] },
  { aliases: ['분식', '떡볶이', '김밥'], preferredKeys: ['bunsik', '5'], labelNeedles: ['분식', '기타'] },
  { aliases: ['치킨'], preferredKeys: ['chicken', '7'], labelNeedles: ['치킨', '패스트푸드'] },
];

const TRANSACTION_WORDS: Array<{ value: FilterState['transactionType']; aliases: string[]; label: string }> = [
  { value: '임대', aliases: ['월세', '임대', '렌트'], label: '월세' },
  { value: '전세', aliases: ['전세'], label: '전세' },
  { value: '매매', aliases: ['매매', '매입', '매수'], label: '매매' },
];

export function interpretVacancyPrompt(prompt: string, businessTypes: BusinessType[]): PromptFilterPatch {
  const normalized = normalizePrompt(prompt);
  const filters: Partial<FilterState> = {};
  const labels: string[] = [];

  const category = detectBusinessType(normalized, businessTypes);
  if (category) {
    filters.categoryId = category.key;
    filters.sort = 'score_desc';
    labels.push(`${category.label} 적합도`);
  }

  const transactionType = detectTransactionType(normalized);
  if (transactionType) {
    filters.transactionType = transactionType.value;
    labels.push(transactionType.label);
  }

  const rent = detectMoneyAfter(normalized, ['월세', '임대료', '월 임대료', '월']);
  if (rent !== undefined) {
    filters.transactionType = '임대';
    filters.rentMax = formatPromptNumber(applyAroundSlack(rent, normalized));
    labels.push(`월세 ${formatPromptNumber(rent)}만원 내외`);
  }

  const deposit = detectMoneyAfter(normalized, ['보증금', '전세금', '전세']);
  if (deposit !== undefined) {
    filters.depositMax = formatPromptNumber(applyAroundSlack(deposit, normalized));
    if (normalized.includes('전세') && !normalized.includes('월세')) filters.transactionType = '전세';
    labels.push(`${normalized.includes('전세') && !normalized.includes('보증금') ? '전세금' : '보증금'} ${formatLargePromptManWon(deposit)} 내외`);
  }

  const salePrice = detectMoneyAfter(normalized, ['매매가', '매매', '매입가']);
  if (salePrice !== undefined) {
    filters.transactionType = '매매';
    filters.salePriceMax = formatPromptNumber(applyAroundSlack(salePrice, normalized));
    labels.push(`매매가 ${formatLargePromptManWon(salePrice)} 내외`);
  }

  const premium = detectMoneyAfter(normalized, ['권리금']);
  if (premium !== undefined) {
    filters.premiumMax = formatPromptNumber(applyAroundSlack(premium, normalized));
    labels.push(`권리금 ${formatLargePromptManWon(premium)} 내외`);
  }

  const maintenance = detectMoneyAfter(normalized, ['관리비']);
  if (maintenance !== undefined) {
    filters.maintenanceFeeMax = formatPromptNumber(applyAroundSlack(maintenance, normalized));
    labels.push(`관리비 ${formatPromptNumber(maintenance)}만원 내외`);
  }

  const scoreMin = detectScoreMin(normalized);
  if (scoreMin !== undefined) {
    filters.scoreMin = formatPromptNumber(scoreMin);
    labels.push(`점수 ${scoreMin}점 이상`);
  }

  const areaRange = detectAreaRange(normalized);
  if (areaRange.min !== undefined) {
    filters.areaMin = formatPromptNumber(areaRange.min);
    labels.push(`면적 ${formatPromptNumber(areaRange.min)}㎡ 이상`);
  }
  if (areaRange.max !== undefined) {
    filters.areaMax = formatPromptNumber(areaRange.max);
    labels.push(`면적 ${formatPromptNumber(areaRange.max)}㎡ 이하`);
  }

  const stationKeyword = normalized.match(/([가-힣A-Za-z0-9]+역)/)?.[1];
  if (stationKeyword) {
    filters.q = stationKeyword;
    labels.push(stationKeyword);
  }

  if (normalized.includes('싼') || normalized.includes('저렴') || normalized.includes('낮은 월세')) {
    filters.sort = 'rent_asc';
    labels.push('월세 낮은 순');
  } else if (normalized.includes('넓은') || normalized.includes('큰 매장') || normalized.includes('큰 공실')) {
    filters.sort = 'area_desc';
    labels.push('면적 큰 순');
  } else if (normalized.includes('최근') || normalized.includes('신규')) {
    filters.sort = 'updated_desc';
    labels.push('최근 갱신 순');
  } else if (normalized.includes('적합') || normalized.includes('추천') || normalized.includes('좋은')) {
    filters.sort = 'score_desc';
  }

  const area = detectAreaKeyword(normalized);
  if (area.areaKeyword) labels.push(area.areaKeyword);

  if (labels.length === 0 && normalized.length > 0) {
    filters.q = normalized;
    labels.push('키워드 검색');
  }

  return {
    filters,
    areaKeyword: area.areaKeyword,
    areaDistrictHint: area.areaDistrictHint,
    labels: Array.from(new Set(labels)).slice(0, 5),
  };
}

export function promptPatchFromStructuredFilter(
  structured: VacancyStructuredFilter,
  businessTypes: BusinessType[],
): PromptFilterPatch {
  const filters: Partial<FilterState> = {};
  const labels: string[] = [];
  const location = structured.location ?? undefined;
  const category = structured.category ?? undefined;
  const price = structured.price ?? undefined;
  const space = structured.space ?? undefined;

  if (structured.q) {
    filters.q = structured.q;
    labels.push('키워드 검색');
  }

  if (category?.categoryId) {
    filters.categoryId = category.categoryId;
    const label = category.categoryLabel ||
      businessTypes.find(type => type.key === category.categoryId)?.label ||
      `업종 ${category.categoryId}`;
    labels.push(`${label} 적합도`);
  }

  if (structured.transactionType === '임대' || structured.transactionType === '전세' || structured.transactionType === '매매') {
    filters.transactionType = structured.transactionType;
    labels.push(structured.transactionType === '임대' ? '월세' : structured.transactionType);
  }

  if (price?.monthlyRentMax != null) {
    filters.transactionType = '임대';
    filters.rentMax = formatPromptNumber(price.monthlyRentMax);
    labels.push(formatRangeLabel('월세', price.monthlyRentMin, price.monthlyRentMax, '만원'));
  }
  if (price?.depositMax != null) {
    filters.depositMax = formatPromptNumber(price.depositMax);
    labels.push(formatRangeLabel(structured.transactionType === '전세' ? '전세금' : '보증금', price.depositMin, price.depositMax, '만원'));
  }
  if (price?.salePriceMax != null) {
    filters.transactionType = '매매';
    filters.salePriceMax = formatPromptNumber(price.salePriceMax);
    labels.push(formatRangeLabel('매매가', price.salePriceMin, price.salePriceMax, '만원'));
  }
  if (price?.premiumMax != null) {
    filters.premiumMax = formatPromptNumber(price.premiumMax);
    labels.push(formatRangeLabel('권리금', price.premiumMin, price.premiumMax, '만원'));
  }
  if (price?.maintenanceFeeMax != null) {
    filters.maintenanceFeeMax = formatPromptNumber(price.maintenanceFeeMax);
    labels.push(formatRangeLabel('관리비', price.maintenanceFeeMin, price.maintenanceFeeMax, '만원'));
  }

  if (category?.scoreMin != null) {
    filters.scoreMin = formatPromptNumber(category.scoreMin);
    labels.push(`점수 ${formatPromptNumber(category.scoreMin)}점 이상`);
  }

  const areaMin = space?.dedicatedAreaMin ?? space?.supplyAreaMin;
  const areaMax = space?.dedicatedAreaMax ?? space?.supplyAreaMax;
  if (areaMin != null) {
    filters.areaMin = formatPromptNumber(areaMin);
    labels.push(`면적 ${formatPromptNumber(areaMin)}㎡ 이상`);
  }
  if (areaMax != null) {
    filters.areaMax = formatPromptNumber(areaMax);
    labels.push(`면적 ${formatPromptNumber(areaMax)}㎡ 이하`);
  }

  if (structured.sort) {
    filters.sort = structured.sort;
    const sortLabel = SORT_OPTIONS.find(option => option.value === structured.sort)?.label;
    if (sortLabel && structured.sort !== 'score_desc') labels.push(sortLabel);
  }

  const areaKeyword = location?.dong || location?.district || location?.address || location?.subway || undefined;
  if (areaKeyword) labels.push(areaKeyword);

  return {
    filters,
    areaKeyword,
    areaDistrictHint: location?.district || undefined,
    labels: Array.from(new Set(labels.filter(Boolean))).slice(0, 6),
  };
}

export function withStructuredPromptArea(
  structured: VacancyStructuredFilter,
  area: AreaSearchHit,
): VacancyStructuredFilter {
  return {
    ...structured,
    location: {
      ...(structured.location ?? {}),
      areaId: area.id,
    },
  };
}

export function withStructuredPromptPaging(
  structured: VacancyStructuredFilter,
  page: number,
  size: number,
): VacancyStructuredFilter {
  return {
    ...structured,
    page,
    size,
  };
}

function normalizePrompt(prompt: string): string {
  return prompt
    .replace(/\s+/g, ' ')
    .replace(/[~〜]/g, ' ')
    .trim();
}

function detectBusinessType(prompt: string, businessTypes: BusinessType[]): BusinessType | undefined {
  const normalized = compactForMatch(prompt);
  for (const rule of BUSINESS_TYPE_ALIASES) {
    if (!rule.aliases.some(alias => normalized.includes(compactForMatch(alias)))) continue;
    const byKey = rule.preferredKeys
      .map(key => businessTypes.find(type => type.key === key))
      .find(Boolean);
    if (byKey) return byKey;

    const byLabel = businessTypes.find(type => {
      const label = compactForMatch(type.label);
      return rule.labelNeedles.some(needle => label.includes(compactForMatch(needle)));
    });
    if (byLabel) return byLabel;
  }

  return businessTypes.find(type => normalized.includes(compactForMatch(type.label)));
}

function compactForMatch(value: string): string {
  return value.toLowerCase().replace(/[\s/·.,()[\]{}-]/g, '');
}

function detectTransactionType(prompt: string): { value: FilterState['transactionType']; label: string } | undefined {
  return TRANSACTION_WORDS.find(option => option.aliases.some(alias => prompt.includes(alias)));
}

function detectMoneyAfter(prompt: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = prompt.match(new RegExp(`${escaped}\\s*(?:은|는|이|가|으로|로|:)?\\s*([0-9,.]+)\\s*(억|천|백|만원|만)?`, 'i'));
    const value = parseKoreanMoneyToManWon(match?.[1], match?.[2]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseKoreanMoneyToManWon(rawAmount?: string, unit?: string): number | undefined {
  if (!rawAmount) return undefined;
  const numeric = Number(rawAmount.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return undefined;
  switch (unit) {
    case '억':
      return numeric * 10000;
    case '천':
      return numeric * 1000;
    case '백':
      return numeric * 100;
    default:
      return numeric;
  }
}

function applyAroundSlack(value: number, prompt: string): number {
  if (/(이하|까지|미만|최대|안쪽|아래)/.test(prompt)) return value;
  if (/(내외|정도|쯤|근처|언저리|전후|around)/i.test(prompt)) return value * 1.1;
  return value;
}

function detectScoreMin(prompt: string): number | undefined {
  const match = prompt.match(/(?:점수|생존점수|스코어)\s*([0-9]{1,3})(?:점)?\s*(?:이상|넘|부터)?/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

function detectAreaRange(prompt: string): { min?: number; max?: number } {
  const match = prompt.match(/([0-9,.]+)\s*(평|㎡|m2|제곱미터)\s*(이상|넘|부터|이하|까지|미만|내외|정도)?/i);
  if (!match) return {};
  const rawValue = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(rawValue)) return {};
  const value = match[2] === '평' ? rawValue * 3.3058 : rawValue;
  const qualifier = match[3] ?? '';
  if (/(이하|까지|미만)/.test(qualifier)) return { max: value };
  if (/(내외|정도)/.test(qualifier)) return { min: value * 0.9, max: value * 1.1 };
  return { min: value };
}

function detectAreaKeyword(prompt: string): { areaKeyword?: string; areaDistrictHint?: string } {
  const areaDistrictHint = prompt.match(/([가-힣]{2,}구)/)?.[1];
  const dongMatches = Array.from(prompt.matchAll(/([가-힣0-9]{2,}동)(?:쯤|근처|쪽|에서|에|으로|로)?/g));
  const areaKeyword = dongMatches.length > 0 ? dongMatches[dongMatches.length - 1]?.[1] : undefined;
  if (areaKeyword) return { areaKeyword, areaDistrictHint };
  if (areaDistrictHint) return { areaKeyword: areaDistrictHint, areaDistrictHint };
  return {};
}

function formatRangeLabel(label: string, min?: number | null, max?: number | null, unit = ''): string {
  if (min != null && max != null) return `${label} ${formatPromptNumber(min)}~${formatPromptNumber(max)}${unit}`;
  if (min != null) return `${label} ${formatPromptNumber(min)}${unit} 이상`;
  if (max != null) return `${label} ${formatPromptNumber(max)}${unit} 이하`;
  return label;
}

function formatPromptNumber(value: number): string {
  return String(Math.max(0, Math.round(value)));
}

function formatLargePromptManWon(value: number): string {
  if (value >= 10000) {
    const eok = value / 10000;
    return `${Number.isInteger(eok) ? eok.toFixed(0) : eok.toFixed(1)}억원`;
  }
  return `${formatPromptNumber(value)}만원`;
}

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

/** 상단 요약 타일의 가격 항목 — 선택한 거래유형에 맞춰 라벨/값/단위를 바꾼다. */
export function summaryPriceMetric(
  transactionType: VacancyTransactionType,
  summary: VacancySearchSummary,
): PriceMetric {
  switch (transactionType) {
    case '매매':
      return { label: '평균 매매가', value: formatLargeManWon(summary.averageSalePrice), unit: '' };
    case '전세':
      return { label: '평균 전세금', value: formatLargeManWon(summary.averageDeposit), unit: '' };
    default: // 전체 / 월세(임대)
      return { label: '평균 월세', value: formatManWon(summary.averageRent), unit: '만원' };
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
