import type { Vacancy } from '../../../api';
import {
  formatArea,
  formatCount,
  formatPeople,
  formatPercent,
  formatScore,
  formatWon,
  totalCompetition,
  vacancyPriceMetrics,
} from '../model';

const PRICE_TONES = ['teal', 'blue', 'amber'] as const;

export function VacancyMetricGrid({ vacancy }: { vacancy: Vacancy }) {
  const competition = totalCompetition(vacancy);
  return (
    <div className="vf-metric-grid">
      <MetricCard label="예상 생존률" value={formatScore(vacancy.survivalScore)} unit="%" tone="brand" />
      {vacancyPriceMetrics(vacancy).map((metric, index) => (
        <MetricCard key={metric.label} label={metric.label} value={metric.value} unit={metric.unit} tone={PRICE_TONES[index]} />
      ))}
      <MetricCard label="전용면적" value={formatArea(vacancy.dedicatedArea ?? vacancy.locationArea)} unit="" />
      <MetricCard label="동종 경쟁 500m" value={formatCount(competition)} unit="개" />
      <MetricCard label="분기 유동" value={formatPeople(vacancy.floatingPopulationQuarterlyAverage)} unit="" />
      <MetricCard label="가게당 평균 매출" value={formatWon(vacancy.averageSalesPerStore)} unit="" />
    </div>
  );
}

export function MetricCard({ label, value, unit, tone = 'neutral' }: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'brand' | 'teal' | 'blue' | 'amber' | 'neutral';
}) {
  return (
    <div className={`vf-metric-card tone-${tone}`}>
      <span>{label}</span>
      <b>{value}{unit && <small>{unit}</small>}</b>
    </div>
  );
}

export function RatioBars({ vacancy }: { vacancy: Vacancy }) {
  const ratios = [
    { label: '저녁', value: vacancy.eveningPopulationRatio, max: 60, tone: 'brand' },
    { label: '심야', value: vacancy.lateNightPopulationRatio, max: 45, tone: 'blue' },
    { label: '아침', value: vacancy.morningPopulationRatio, max: 45, tone: 'teal' },
    { label: '주말', value: vacancy.weekendPopulationRatio, max: 60, tone: 'amber' },
    { label: '2030', value: vacancy.age2030PopulationRatio, max: 75, tone: 'brand' },
    { label: '40+', value: vacancy.age40PlusPopulationRatio, max: 75, tone: 'blue' },
    { label: '여성', value: vacancy.femalePopulationRatio, max: 75, tone: 'teal' },
  ] as const;

  return (
    <div className="vf-bars">
      {ratios.map(ratio => (
        <div className="vf-bar-row" key={ratio.label}>
          <div className="vf-bar-meta">
            <span>{ratio.label}</span>
            <b>{formatPercent(ratio.value)}</b>
          </div>
          <div className="vf-bar-track">
            <span className={`tone-${ratio.tone}`} style={{ width: `${normalizedRatio(ratio.value, ratio.max)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizedRatio(value: number | null | undefined, max: number): number {
  if (value === null || value === undefined) return 0;
  const ratio = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, (ratio / max) * 100));
}
