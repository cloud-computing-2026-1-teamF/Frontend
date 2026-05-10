import type { Vacancy } from '../../../api';
import {
  formatArea,
  formatCount,
  formatLargeManWon,
  formatManWon,
  formatPeople,
  formatPercent,
  formatScore,
} from '../model';

export function VacancyMetricGrid({ vacancy }: { vacancy: Vacancy }) {
  const competition = (vacancy.restaurantCount500m ?? 0) + (vacancy.cafeCount500m ?? 0);
  return (
    <div className="vf-metric-grid">
      <MetricCard label="생존점수" value={formatScore(vacancy.survivalScore)} unit="/100" tone="brand" />
      <MetricCard label="월세" value={formatManWon(vacancy.monthlyRent)} unit="만원" tone="teal" />
      <MetricCard label="보증금" value={formatLargeManWon(vacancy.deposit)} unit="" tone="blue" />
      <MetricCard label="관리비" value={formatManWon(vacancy.maintenanceFee)} unit="만원" tone="amber" />
      <MetricCard label="전용면적" value={formatArea(vacancy.locationArea)} unit="" />
      <MetricCard label="경쟁 점포 500m" value={formatCount(competition)} unit="개" />
      <MetricCard label="분기 유동" value={formatPeople(vacancy.floatingPopulationQuarterlyAverage)} unit="" />
      <MetricCard label="가게당 평균 매출" value={formatManWon(vacancy.averageSalesPerStore)} unit="만원" />
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

