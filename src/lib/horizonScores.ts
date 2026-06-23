export type HorizonScore = {
  horizonYears: number;
  survivalScore: number;
  recommended?: boolean | null;
};

export const PRIMARY_HORIZON_YEARS = 3;
export const STANDARD_HORIZONS = [1, 3, 5] as const;

export function normalizeHorizonScores(
  raw: HorizonScore[] | null | undefined,
  primaryScore: number,
  recommended?: boolean | null,
): HorizonScore[] {
  const byYear = new Map<number, HorizonScore>();

  raw?.forEach(item => {
    if (!Number.isFinite(item.horizonYears) || !Number.isFinite(item.survivalScore)) return;
    byYear.set(Number(item.horizonYears), {
      horizonYears: Number(item.horizonYears),
      survivalScore: roundScore(item.survivalScore),
      recommended: item.recommended ?? recommended ?? null,
    });
  });

  if (byYear.size === 0) {
    return fallbackHorizonScores(primaryScore, recommended);
  }

  if (!byYear.has(PRIMARY_HORIZON_YEARS)) {
    byYear.set(PRIMARY_HORIZON_YEARS, {
      horizonYears: PRIMARY_HORIZON_YEARS,
      survivalScore: roundScore(primaryScore),
      recommended: recommended ?? null,
    });
  }

  return [...byYear.values()].sort((a, b) => horizonOrder(a.horizonYears) - horizonOrder(b.horizonYears));
}

export function horizonScore(
  scores: HorizonScore[] | null | undefined,
  years: number,
  fallbackScore: number,
): number {
  return normalizeHorizonScores(scores, fallbackScore).find(item => item.horizonYears === years)?.survivalScore
    ?? roundScore(fallbackScore);
}

export function horizonDelta(scores: HorizonScore[] | null | undefined, primaryScore: number): number {
  const normalized = normalizeHorizonScores(scores, primaryScore);
  const first = normalized.find(item => item.horizonYears === 1) ?? normalized[0];
  const last = normalized.find(item => item.horizonYears === 5) ?? normalized[normalized.length - 1];
  return roundOne((last?.survivalScore ?? primaryScore) - (first?.survivalScore ?? primaryScore));
}

export function horizonTone(score: number): 'strong' | 'good' | 'watch' | 'risk' {
  if (score >= 82) return 'strong';
  if (score >= 72) return 'good';
  if (score >= 60) return 'watch';
  return 'risk';
}

export function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fallbackHorizonScores(primaryScore: number, recommended?: boolean | null): HorizonScore[] {
  const primary = roundScore(primaryScore);
  return [
    { horizonYears: 1, survivalScore: roundScore(primary + 5), recommended: recommended ?? null },
    { horizonYears: 3, survivalScore: primary, recommended: recommended ?? null },
    { horizonYears: 5, survivalScore: roundScore(primary - 6), recommended: recommended ?? null },
  ];
}

function horizonOrder(years: number): number {
  const index = STANDARD_HORIZONS.findIndex(item => item === years);
  return index >= 0 ? index : STANDARD_HORIZONS.length + years / 100;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
