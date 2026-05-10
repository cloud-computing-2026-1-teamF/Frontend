import type { AnalysisRecommendation, BusinessType } from '../../api';

export const FIXED_RADIUS = 500;
export const DEFAULT_CENTER = { lat: 37.5572, lng: 126.9237 };

export type BizKey = string;
export type BizType = Pick<BusinessType, 'key' | 'label' | 'emoji'>;
export type AnalyzePhase = 'idle' | 'analyzing' | 'done' | 'failed';

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
  addr: string;
  floor: string;
  area: number;
  rent: number;
  deposit: number;
  mgmt: number;
  score: number;
  foot: number;
  comp: number;
  rev: number;
  growth: number;
  lat: number;
  lng: number;
  distanceM?: number;
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
    radius: FIXED_RADIUS,
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
        radius: FIXED_RADIUS,
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
  { rank: 1, addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12 },
  { rank: 2, addr: '동교동 154-8', floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9 },
  { rank: 3, addr: '서교동 401-3', floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11 },
];

export const buildProperties = (center: { lat: number; lng: number }): AnalyzeProperty[] =>
  PROPERTY_SEED.map((p, i) => ({
    ...p,
    lat: center.lat + TOP3_OFFSETS[i].dLat,
    lng: center.lng + TOP3_OFFSETS[i].dLng,
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
      const addr = readableLabel(item.businessSubCategoryName)
        || readableLabel(item.businessMiddleCategoryName)
        || `공실 ${item.vacancyId}`;

      return {
        vacancyId: item.vacancyId,
        rank: item.rank,
        addr,
        floor: readableLabel(item.category) || '상가',
        area: roundOne(area),
        rent: item.monthlyRent ?? 0,
        deposit: item.deposit ?? 0,
        mgmt: item.maintenanceFee ?? 0,
        score: Math.round(item.score),
        foot,
        comp: restaurantCount + cafeCount,
        rev: Math.round(item.averageSalesPerStore ?? 0),
        growth: roundOne(item.industryGrowthRate500m ?? 0),
        lat: item.latitude,
        lng: item.longitude,
        distanceM: item.distanceM,
      };
    });

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
