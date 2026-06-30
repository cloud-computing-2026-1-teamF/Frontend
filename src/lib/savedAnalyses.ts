// localStorage-backed analysis history. The shape mirrors what the backend
// will eventually return so the rest of the app doesn't need to change.

import type { Property } from '../shared/FactorViz';
import type { HorizonScore } from './horizonScores';

export type Top3Item = Property & {
  vacancyId?: string;
  categoryId?: string | null;
  addr: string;
  // 매물 좌표. 추천 API 응답에는 들어오지만, 주소만 있는 시드 데이터에서는
  // 비어 있을 수 있다(그 경우 지도/로드뷰는 주소를 지오코딩해 좌표를 얻는다).
  lat?: number | null;
  lng?: number | null;
  recommended?: boolean | null;
  score: number;
  horizonScores?: HorizonScore[];
  scoreExplanation?: ScoreExplanation | null;
  rent: number;
  deposit: number;
  mgmt: number;
  premium?: number;
  salePrice?: number;
  transactionType?: string | null;
  area: number;
  floor: string;
  footHourly: number[];
  nearby: { subway: string; bus: string; parking: string };
  // Legacy fields kept on the v1 seed dataset — unused by the new UI but
  // preserved so the mock JSON doesn't need to be sanitised on every push.
  demo?: Record<string, number>;
  weekly?: number[];
  competitors?: { name: string; dist: number; rev: number }[];
  risk?: { level: string; reasons: string[] };
};

export type ScoreExplanation = {
  features: ScoreFeatureReason[];
  positiveFeatures?: ScoreFeatureReason[] | null;
  negativeFeatures?: ScoreFeatureReason[] | null;
  source?: string | null;
};

export type ScoreFeatureEffect = 'positive' | 'negative' | 'neutral' | 'unknown' | string;

export type ScoreFeatureReason = {
  rank: number;
  sourceRank?: number | null;
  sourceTone?: string | null;
  featureKey: string;
  featureLabel: string;
  effect: ScoreFeatureEffect;
  currentValue?: number | null;
  averageValue?: number | null;
  displayUnit?: string | null;
  higherIsPositive?: boolean | null;
  contributionLogOdds?: number | null;
  contributionPp?: number | null;
  percentileLabel?: string | null;
  normalizedImpact?: number | null;
  impactPercentile?: number | null;
  valuePercentile?: number | null;
  valuePercentileLabel?: string | null;
};

export type SavedAnalysis = {
  id: number | string;
  date: string;
  time: string;
  region: string;
  // The next three were added in the v2 marker-pick redesign. v1 seed items
  // don't carry them, so they're optional (UI falls back to `region` and a
  // default radius of 500m).
  regionDetail?: string;
  radius?: number;
  displayName?: string;
  centerLat?: number;
  centerLng?: number;
  category: string;
  businessTypeKey?: string;
  categoryEmoji: string;
  budget: string;
  topScore: number;
  // Total vacancies included in the saved analysis at creation time, not the
  // number of Top 3 recommendation cards.
  count: number;
  saved: boolean;
  top3: Top3Item[];
};

const SAVED_KEY = 'sanggwon_saved_analyses';

export const readSavedAnalyses = (): SavedAnalysis[] => {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
  } catch { return []; }
};

export const writeSavedAnalyses = (items: SavedAnalysis[]): void => {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(items)); } catch { /* ignore quota errors */ }
};
