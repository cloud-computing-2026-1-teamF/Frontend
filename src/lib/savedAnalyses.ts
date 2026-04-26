// localStorage-backed analysis history. The shape mirrors what the backend
// will eventually return so the rest of the app doesn't need to change.

import type { Property } from '../shared/FactorViz';

export type Top3Item = Property & {
  addr: string;
  score: number;
  rent: number;
  deposit: number;
  mgmt: number;
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

export type SavedAnalysis = {
  id: number;
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
  categoryEmoji: string;
  budget: string;
  topScore: number;
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
