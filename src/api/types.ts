// Shared response types. Shape mirrors `API_명세_수정본.md`.
// All success bodies are wrapped in `{ data: ... }` per the API contract;
// errors throw `ApiError` so callers can `try/catch` instead of branching on
// a status field. Mock and real transports share these types.

import type { SavedAnalysis, Top3Item } from '../lib/savedAnalyses';

export type ApiEnvelope<T> = { data: T };

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string>;
  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'business';
  createdAt?: string;
};

export type LoginRequest = { email: string; password: string };
export type SignupRequest = {
  email: string;
  password: string;
  name: string;
};
export type AuthLoginResponse = {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};
export type RefreshResponse = {
  accessToken: string;
  expiresIn: number;
};

// ── Business types / Areas ──────────────────────────────────────────────────
export type BusinessType = {
  key: string;
  label: string;
  emoji: string;
  sortOrder: number;
};

export type AreaSearchHit = {
  id: string;
  name: string;
  region: string;
  fullName: string;
  center: { lat: number; lng: number };
};

export type CreateAnalysisResponse = {
  id: string;
  vacancyId?: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  createdAt: string;
  estimatedSeconds: number;
  analyzedVacancyCount?: number | null;
  saved?: boolean | null;
  links: {
    self: string;
    events: string;
  };
  recommendations?: AnalysisRecommendation[];
};

export type AnalysisPollingResponse = {
  id: string;
  vacancyId?: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  step: {
    index: number;
    total: number;
    label: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
  error: {
    code: string;
    message: string;
  } | null;
  saved?: boolean | null;
  // Summary fields, populated by GET /v1/analyses (list endpoint). Lets the
  // History page render cards straight from the API without dipping into
  // localStorage. The single-analysis polling endpoint leaves them undefined.
  businessTypeKey?: string | null;
  transactionType?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusM?: number | null;
  budgetDepositMax?: number | null;
  budgetRentMax?: number | null;
  budgetMaintenanceFeeMax?: number | null;
  budgetPremiumMax?: number | null;
  budgetSalePriceMax?: number | null;
  topScore?: number | null;
  analyzedVacancyCount?: number | null;
  recommendationCount?: number | null;
};
export type AnalysisEventResponse = {
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  step: AnalysisPollingResponse['step'];
  error: AnalysisPollingResponse['error'];
};

// ── Analyses ────────────────────────────────────────────────────────────────
export type AnalysisBudgetRequest = {
  depositMax?: number;
  rentMax?: number;
  maintenanceFeeMax?: number;
  premiumMax?: number;
  salePriceMax?: number;
};

export type AnalysisLocationRequest = {
  lat: number;
  lng: number;
};

export type AnalysisRecommendation = {
  rank: number;
  vacancyId: string;
  recommended?: boolean | null;
  score: number;
  distanceM: number;
  areaId: string;
  latitude: number;
  longitude: number;
  monthlyRent?: number | null;
  deposit?: number | null;
  maintenanceFee?: number | null;
  premium?: number | null;
  salePrice?: number | null;
  transactionType?: string | null;
  facilityTotalSize?: number | null;
  locationArea?: number | null;
  category?: string | null;
  roadAddress?: string | null;
  lotAddress?: string | null;
  businessMiddleCategoryName?: string | null;
  businessSubCategoryName?: string | null;
  floatingPopulationAnnualTotal?: number | null;
  restaurantCount500m?: number | null;
  cafeCount500m?: number | null;
  industryGrowthRate500m?: number | null;
  averageSalesPerStore?: number | null;
  busStopInfo?: string | null;
  subwayStationInfo?: string | null;
  parkingInfo?: string | null;
  hourlyFloatingPopulation?: number[] | null;
};

export type CreateAnalysisRequest = {
  businessType: BusinessType['key'];
  areaId: string;
  transactionType?: string;
  budget?: AnalysisBudgetRequest;
  center?: AnalysisLocationRequest;
  x?: number;
  y?: number;
  radiusM?: number;
};

export type CreateAnalysisClientRequest = CreateAnalysisRequest & {
  roadAddress?: string;
  displayName?: string;
  // Mock/session convenience fields. Real backend receives the searchable
  // analysis fields above; these labels stay frontend-local.
  category?: string;
  categoryEmoji?: string;
  region?: string;
};

export type AnalysisSectionKey =
  | 'recommended_properties'
  | 'key_metrics'
  | 'foot_traffic'
  | 'competition'
  | 'estimated_revenue'
  | 'industry_growth'
  | 'accessibility';

export type AnalysisSectionTodo = {
  analysisId: string;
  sectionKey: AnalysisSectionKey;
  sectionLabel: string;
  todo: string;
  updatedAt: string;
};

export type AnalysisRecommendationsSection = AnalysisSectionTodo & {
  recommendations: AnalysisRecommendation[];
};

// Shape that the UI consumes for both list-row and detail.
// In the spec these are slightly different (list row has `summary.top_three`
// only, detail has full `properties[]`) — we keep both as the same `SavedAnalysis`
// shape for simplicity since the seed data already carries Top3 inline.
export type AnalysisDetail = SavedAnalysis;
// Two shapes flow through this slot:
//   - Mock router returns rich SavedAnalysis rows (legacy seed contract).
//   - Real backend returns AnalysisPollingResponse rows with summary fields
//     populated (see GET /v1/analyses on Backend).
// Call sites discriminate via USE_MOCK or a runtime presence check.
export type AnalysisListItem = SavedAnalysis | AnalysisPollingResponse;

export type ListAnalysesQuery = {
  cursor?: string;
  limit?: number;
  sort?: 'recent' | 'score';
  saved?: boolean;
  status?: 'done' | 'failed';
  q?: string;
};

export type ListAnalysesResponse = {
  items: AnalysisListItem[];
  next_cursor: string | null;
};

export type PatchAnalysisRequest = {
  saved?: boolean;
  memo?: string;
};

/** `GET|PUT /vacancies/shortlist` — 서버에 저장된 공실 찜 id 목록 */
export type VacancyShortlistPayload = {
  vacancyIds: string[];
};

// ── Vacancies ──────────────────────────────────────────────────────────────
export type Vacancy = {
  id: string;
  areaId: string;
  areaName?: string | null;
  categoryId?: string | null;
  category?: string | null;
  recommended?: boolean | null;
  monthlyRent?: number | null;
  deposit?: number | null;
  maintenanceFee?: number | null;
  premium?: number | null;
  salePrice?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  survivalScore?: number | null;
  listingId?: string | null;
  listingNumber?: string | null;
  roadAddress?: string | null;
  lotAddress?: string | null;
  postalCode?: string | null;
  buildingName?: string | null;
  province?: string | null;
  district?: string | null;
  dong?: string | null;
  detailAddress?: string | null;
  transactionType?: string | null;
  dedicatedArea?: number | null;
  supplyArea?: number | null;
  floor?: string | null;
  totalFloors?: string | null;
  basementFloors?: string | null;
  buildingType?: string | null;
  buildingUse?: string | null;
  buildingGrade?: string | null;
  approvalDate?: string | null;
  direction?: string | null;
  elevatorAvailable?: boolean | null;
  elevatorCount?: number | null;
  heatingType?: string | null;
  restroomType?: string | null;
  restroomCount?: number | null;
  parkingAvailable?: boolean | null;
  parkingCount?: number | null;
  terrace?: boolean | null;
  rooftop?: boolean | null;
  interior?: boolean | null;
  storage?: boolean | null;
  airConditioner?: boolean | null;
  heater?: boolean | null;
  lateNightOperationAvailable?: boolean | null;
  priceNegotiable?: boolean | null;
  rentAdjustable?: boolean | null;
  rentFreePeriodAvailable?: boolean | null;
  subway?: string | null;
  busStopInfo?: string | null;
  subwayStationInfo?: string | null;
  parkingInfo?: string | null;
  hourlyFloatingPopulation?: number[] | null;
  brokerageFee?: number | null;
  brokerageRate?: number | null;
  viewCount?: number | null;
  favoriteCount?: number | null;
  majorBusinessCategory?: string | null;
  middleBusinessCategory?: string | null;
  floatingPopulationAnnualTotal?: number | null;
  residentPopulationAnnualTotal?: number | null;
  workerPopulationAnnualTotal?: number | null;
  floatingPopulationQuarterlyAverage?: number | null;
  residentPopulationQuarterlyAverage?: number | null;
  workerPopulationQuarterlyAverage?: number | null;
  restaurantCount250m?: number | null;
  cafeCount250m?: number | null;
  industryGrowthRate250m?: number | null;
  restaurantCount500m?: number | null;
  cafeCount500m?: number | null;
  industryGrowthRate500m?: number | null;
  restaurantCount1000m?: number | null;
  cafeCount1000m?: number | null;
  industryGrowthRate1000m?: number | null;
  sameCategoryRestaurantCount250m?: number | null;
  sameCategoryRestaurantCount500m?: number | null;
  sameCategoryRestaurantCount1000m?: number | null;
  businessMiddleCategoryName?: string | null;
  businessSubCategoryName?: string | null;
  multiUseFacility?: boolean | null;
  facilityTotalSize?: number | null;
  locationArea?: number | null;
  eveningPopulationRatio?: number | null;
  lateNightPopulationRatio?: number | null;
  morningPopulationRatio?: number | null;
  weekendPopulationRatio?: number | null;
  age2030PopulationRatio?: number | null;
  age40PlusPopulationRatio?: number | null;
  femalePopulationRatio?: number | null;
  residentToFloatingRatio?: number | null;
  workerToFloatingRatio?: number | null;
  officialLandPrice?: number | null;
  closureRate?: number | null;
  openingRate?: number | null;
  averageSalesPerStore?: number | null;
  timeBasedSalesRatio?: number | null;
  lateNightSalesRatio?: number | null;
  weekendSalesRatio?: number | null;
  age2030SalesRatio?: number | null;
  femaleSalesRatio?: number | null;
  totalSpending?: number | null;
  foodSpending?: number | null;
  spendingPerStore?: number | null;
  commercialTurnoverType?: number | null;
  commercialGrowthType?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type VacancySearchSort =
  | 'score_desc'
  | 'rent_asc'
  | 'rent_desc'
  | 'deposit_asc'
  | 'area_desc'
  | 'updated_desc';

export type VacancySearchQuery = {
  areaId?: string;
  categoryId?: string;
  transactionType?: string;
  q?: string;
  latitude?: number;
  longitude?: number;
  radiusM?: number;
  rentMax?: number;
  depositMax?: number;
  maintenanceFeeMax?: number;
  premiumMax?: number;
  salePriceMax?: number;
  scoreMin?: number;
  areaMin?: number;
  areaMax?: number;
  page?: number;
  size?: number;
  sort?: VacancySearchSort;
};

export type VacancySearchSummary = {
  total: number;
  averageScore?: number | null;
  averageRent?: number | null;
  averageDeposit?: number | null;
  averageMaintenanceFee?: number | null;
  minRent?: number | null;
  maxRent?: number | null;
  areaCount: number;
};

export type VacancySearchResponse = {
  items: Vacancy[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  summary: VacancySearchSummary;
};

export type VacancyMetricDistribution = {
  selected?: number | null;
  average?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  p10?: number | null;
  p25?: number | null;
  p75?: number | null;
  p90?: number | null;
  percentile?: number | null;
};

export type VacancyMetricReference = {
  categoryId?: string | null;
  vacancyId?: string | null;
  peerCount: number;
  footTrafficDaily: VacancyMetricDistribution;
  competition500m: VacancyMetricDistribution;
  averageSalesMonthly: VacancyMetricDistribution;
};

// ── User stats ──────────────────────────────────────────────────────────────
export type UserStats = {
  total_analyses: number;
  saved_analyses: number;
  avg_top_score: number;
};

// Re-export for convenience so callers don't import from two places.
export type { Top3Item };
