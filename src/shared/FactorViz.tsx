import type { ReactNode } from 'react';
import type { VacancyMetricDistribution, VacancyMetricReference } from '../api';

export type Property = {
  foot: number;
  comp: number;
  rev: number;
  growth: number;
};

type Tone = 'up' | 'down' | 'flat';
type Badge = { label: string; tone: Tone };

export type FactorCardProps = {
  title: string;
  subtitle: string;
  value: ReactNode;
  unit?: string | null;
  badge?: Badge;
  viz?: ReactNode;
  desc?: string;
};

type MetricKind = 'higher-better' | 'lower-better' | 'balanced';

type MetricModel = {
  selected: number;
  average: number | null;
  median: number | null;
  min: number;
  max: number;
  p10: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  percentile: number | null;
  peerCount: number;
};

export function FactorCard({ title, subtitle, value, unit, badge, viz, desc }: FactorCardProps) {
  return (
    <div className="fv-card">
      <div className="fv-card-head">
        <div className="fv-card-title">{title}</div>
        <div className="fv-card-sub">{subtitle}</div>
      </div>
      <div className="fv-value-row">
        <span className="fv-value">{value}</span>
        {unit && <span className="fv-unit">{unit}</span>}
      </div>
      {badge && (
        <div className={`fv-badge fv-badge-${badge.tone}`}>
          <span className="fv-badge-dot" />
          <span>{badge.label}</span>
        </div>
      )}
      {viz}
      {desc && <p className="fv-desc">{desc}</p>}
    </div>
  );
}

function DistributionBar({
  metric,
  unit,
  averageLabel = '평균',
}: {
  metric: MetricModel;
  unit: string;
  averageLabel?: string;
}) {
  const selectedPct = valueToPct(metric.selected, metric.min, metric.max);
  const averagePct = metric.average == null ? null : valueToPct(metric.average, metric.min, metric.max);
  const p10Pct = metric.p10 == null ? null : valueToPct(metric.p10, metric.min, metric.max);
  const p25Pct = metric.p25 == null ? null : valueToPct(metric.p25, metric.min, metric.max);
  const p75Pct = metric.p75 == null ? null : valueToPct(metric.p75, metric.min, metric.max);
  const p90Pct = metric.p90 == null ? null : valueToPct(metric.p90, metric.min, metric.max);
  const selectedEdgeClass = edgeClass(selectedPct);
  const averageEdgeClass = averagePct == null ? '' : edgeClass(averagePct);
  const selectedLabel = metric.percentile == null
    ? `현재 ${formatCompact(metric.selected)}${unit}`
    : `현재 P${Math.round(metric.percentile)} · ${formatCompact(metric.selected)}${unit}`;

  return (
    <div className="fv-viz fv-dist">
      <div className="fv-dist-axis">
        <span>{formatCompact(metric.min)}{unit}</span>
        <span>{metric.median != null ? `중앙 ${formatCompact(metric.median)}${unit}` : ''}</span>
        <span>{formatCompact(metric.max)}{unit}</span>
      </div>
      <div className="fv-dist-track">
        {p10Pct != null && p90Pct != null && (
          <div className="fv-dist-band fv-dist-band-wide" style={rangeStyle(p10Pct, p90Pct)} />
        )}
        {p25Pct != null && p75Pct != null && (
          <div className="fv-dist-band fv-dist-band-core" style={rangeStyle(p25Pct, p75Pct)} />
        )}
        {averagePct != null && (
          <div className={`fv-dist-avg ${averageEdgeClass}`} style={{ left: `${averagePct}%` }}>
            <span>{averageLabel} {formatCompact(metric.average ?? 0)}{unit}</span>
          </div>
        )}
        <div className={`fv-dist-current ${selectedEdgeClass}`} style={{ left: `${selectedPct}%` }}>
          <span>{selectedLabel}</span>
        </div>
      </div>
      <div className="fv-dist-legend">
        <span>P10-P90</span>
        <b>P25-P75</b>
      </div>
    </div>
  );
}

export function buildFactorViz(
  sel: Property,
  reference?: VacancyMetricReference | null,
): (FactorCardProps & { key: string })[] {
  const peerCount = reference?.peerCount ?? 0;
  const peerLabel = peerCount > 0 ? `동일 업종 공실 ${peerCount.toLocaleString()}개 기준` : '선택 공실 기준';
  const foot = metricModel(reference?.footTrafficDaily, sel.foot, peerCount);
  const comp = metricModel(reference?.competition500m, sel.comp, peerCount);
  const rev = metricModel(reference?.averageSalesMonthly, sel.rev, peerCount);
  const footComparison = compareToAverage(foot, 'higher-better');
  const compComparison = compareToAverage(comp, 'lower-better');
  const revComparison = compareToAverage(rev, 'higher-better');

  return [
    {
      key: 'foot',
      title: '유동인구',
      subtitle: `하루 평균 · ${peerLabel}`,
      value: Math.round(foot.selected).toLocaleString(),
      unit: '명/일',
      badge: footComparison.badge,
      viz: <DistributionBar metric={foot} unit="명" />,
      desc: metricDescription(foot, '유동인구', footComparison.kind, 'higher-better'),
    },
    {
      key: 'comp',
      title: '경쟁점포',
      subtitle: `반경 500m · ${peerLabel}`,
      value: Math.round(comp.selected).toLocaleString(),
      unit: '곳',
      badge: compComparison.badge,
      viz: <DistributionBar metric={comp} unit="곳" />,
      desc: metricDescription(comp, '경쟁 밀집도', compComparison.kind, 'lower-better'),
    },
    {
      key: 'rev',
      title: '동네 평균 추정 매출',
      subtitle: `월 추정 · ${peerLabel}`,
      value: Math.round(rev.selected).toLocaleString(),
      unit: '만원',
      badge: revComparison.badge,
      viz: <DistributionBar metric={rev} unit="만" />,
      desc: metricDescription(rev, '추정 매출', revComparison.kind, 'higher-better'),
    },
  ];
}

function metricModel(
  distribution: VacancyMetricDistribution | undefined,
  fallbackSelected: number,
  peerCount: number,
): MetricModel {
  const selected = toFiniteNumber(distribution?.selected) ?? fallbackSelected;
  const average = toFiniteNumber(distribution?.average);
  const median = toFiniteNumber(distribution?.median);
  const p10 = toFiniteNumber(distribution?.p10);
  const p25 = toFiniteNumber(distribution?.p25);
  const p75 = toFiniteNumber(distribution?.p75);
  const p90 = toFiniteNumber(distribution?.p90);
  const values = [
    selected,
    average,
    median,
    p10,
    p25,
    p75,
    p90,
  ].filter((value): value is number => value != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padded = paddedDomain(min, max);
  return {
    selected,
    average,
    median,
    min: padded.min,
    max: padded.max,
    p10,
    p25,
    p75,
    p90,
    percentile: toFiniteNumber(distribution?.percentile),
    peerCount,
  };
}

function compareToAverage(metric: MetricModel, kind: MetricKind): { badge: Badge; kind: 'above' | 'below' | 'near' | 'unknown' } {
  if (metric.average == null || metric.average <= 0) {
    return { badge: { label: '비교 기준 수집 중', tone: 'flat' }, kind: 'unknown' };
  }
  const delta = metric.selected - metric.average;
  const percent = Math.round((delta / metric.average) * 100);
  const absDelta = formatCompact(Math.abs(delta));
  const near = Math.abs(percent) <= 5;
  if (near) {
    return { badge: { label: '평균과 비슷', tone: 'flat' }, kind: 'near' };
  }
  const above = delta > 0;
  const tone: Tone = kind === 'lower-better'
    ? (above ? 'down' : 'up')
    : (above ? 'up' : 'down');
  const label = `평균보다 ${above ? '+' : '-'}${absDelta} (${above ? '+' : ''}${percent}%)`;
  return { badge: { label, tone }, kind: above ? 'above' : 'below' };
}

function metricDescription(
  metric: MetricModel,
  label: string,
  relation: 'above' | 'below' | 'near' | 'unknown',
  kind: MetricKind,
): string {
  const percentile = metric.percentile == null ? null : Math.round(metric.percentile);
  const percentileContext = percentile == null
    ? ''
    : percentileLabel(percentile, kind);
  const topic = topicLabel(label);
  if (relation === 'unknown' || metric.average == null) {
    return `${topic} 비교 기준을 불러오면 평균선과 현재 위치가 함께 표시됩니다.`;
  }
  if (relation === 'near') {
    return `${topic} 평균선 근처에 있습니다${percentileContext}.`;
  }
  return `${topic} 평균선 ${relation === 'above' ? '오른쪽' : '왼쪽'}에 있습니다${percentileContext}.`;
}

function valueToPct(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function rangeStyle(startPct: number, endPct: number) {
  return {
    left: `${Math.min(startPct, endPct)}%`,
    width: `${Math.max(1, Math.abs(endPct - startPct))}%`,
  };
}

function edgeClass(percent: number): string {
  if (percent <= 8) return 'is-left-edge';
  if (percent >= 92) return 'is-right-edge';
  return '';
}

function percentileLabel(percentile: number, kind: MetricKind): string {
  if (kind === 'lower-better') {
    return percentile >= 50
      ? ` · P${percentile}, 경쟁이 많은 쪽`
      : ` · P${percentile}, 경쟁이 적은 쪽`;
  }
  return percentile >= 50
    ? ` · P${percentile}, 상위 ${Math.max(1, 100 - percentile)}%권`
    : ` · P${percentile}, 하위 ${Math.max(1, percentile)}%권`;
}

function topicLabel(label: string): string {
  return `${label}${hasFinalConsonant(label) ? '은' : '는'}`;
}

function hasFinalConsonant(value: string): boolean {
  const last = value.charCodeAt(value.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

function paddedDomain(min: number, max: number): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.2);
    return { min: Math.max(0, min - pad), max: max + pad };
  }
  const pad = (max - min) * 0.08;
  return { min: Math.max(0, min - pad), max: max + pad };
}

function toFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatCompact(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 10000) return `${Math.round(rounded / 1000).toLocaleString()}k`;
  return rounded.toLocaleString();
}
