import { Link } from 'react-router-dom';
import type { Vacancy } from '../../../api';
import { Icon } from '../../../shared/Icon';
import {
  formatArea,
  formatCount,
  formatPeople,
  formatPercent,
  formatScore,
  formatWon,
  scoreClass,
  totalCompetition,
  vacancyPriceMetrics,
  vacancySubtitle,
  vacancyTitle,
} from '../model';

type VacancyInspectorProps = {
  vacancy: Vacancy | null;
  loading?: boolean;
  isShortlisted?: boolean;
  isCompared?: boolean;
  compareDisabled?: boolean;
  onToggleShortlist?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
};

export function VacancyInspector({
  vacancy,
  loading = false,
  isShortlisted = false,
  isCompared = false,
  compareDisabled = false,
  onToggleShortlist,
  onToggleCompare,
}: VacancyInspectorProps) {
  if (loading) {
    return (
      <aside className="vacancy-inspector">
        <div className="vacancy-inspector-loading" aria-label="선택 공실 정보를 불러오는 중">
          <span />
          <b />
          <em />
          <div>
            {Array.from({ length: 4 }).map((_, index) => <i key={index} />)}
          </div>
        </div>
      </aside>
    );
  }

  if (!vacancy) {
    return (
      <aside className="vacancy-inspector">
        <div className="vacancy-inspector-empty">
          <Icon name="building" size={28} />
          <h2>공실 선택</h2>
          <p>목록에서 공실을 선택하면 상세 지표가 표시됩니다.</p>
        </div>
      </aside>
    );
  }

  const competition = totalCompetition(vacancy);
  const factors = [
    { label: '저녁', value: vacancy.eveningPopulationRatio, max: 60, tone: 'brand' },
    { label: '심야', value: vacancy.lateNightPopulationRatio, max: 40, tone: 'blue' },
    { label: '주말', value: vacancy.weekendPopulationRatio, max: 60, tone: 'teal' },
    { label: '2030', value: vacancy.age2030PopulationRatio, max: 70, tone: 'amber' },
    { label: '여성', value: vacancy.femalePopulationRatio, max: 70, tone: 'rose' },
  ] as const;

  return (
    <aside className="vacancy-inspector">
      <div className="vacancy-inspector-head">
        <div>
          <span className="vacancy-panel-eyebrow">Selected</span>
          <h2>{vacancyTitle(vacancy)}</h2>
          <p>{vacancySubtitle(vacancy)}</p>
        </div>
        <span className={`vacancy-score-large ${scoreClass(vacancy.survivalScore)}`}>
          {formatScore(vacancy.survivalScore)}
        </span>
      </div>

      <div className="vacancy-inspector-actions">
        <button type="button" className={`btn btn-secondary btn-sm ${isShortlisted ? 'is-on' : ''}`} onClick={() => onToggleShortlist?.(vacancy.id)}>
          <Icon name={isShortlisted ? 'bookmark-filled' : 'bookmark'} size={13} />
          {isShortlisted ? '찜 해제' : '찜하기'}
        </button>
        <button
          type="button"
          className={`btn btn-secondary btn-sm ${isCompared ? 'is-on' : ''}`}
          disabled={compareDisabled}
          onClick={() => onToggleCompare?.(vacancy.id)}
        >
          <Icon name={isCompared ? 'check' : 'plus'} size={13} />
          {isCompared ? '비교 해제' : '비교 추가'}
        </button>
        <Link className="btn btn-primary btn-sm" to={`/vacancies/${vacancy.id}`}>
          상세 보기
        </Link>
      </div>

      <div className="vacancy-price-grid">
        {vacancyPriceMetrics(vacancy).map(metric => (
          <Metric key={metric.label} label={metric.label} value={metric.value} unit={metric.unit} />
        ))}
        <Metric label="전용면적" value={formatArea(vacancy.dedicatedArea ?? vacancy.locationArea)} unit="" />
      </div>

      <div className="vacancy-detail-section">
        <h3>상권 밀도</h3>
        <div className="vacancy-density-grid">
          <Metric label="동종 500m" value={formatCount(vacancy.sameCategoryRestaurantCount500m)} unit="개" />
          <Metric label="식당 500m" value={formatCount(vacancy.restaurantCount500m)} unit="개" />
          <Metric label="카페 500m" value={formatCount(vacancy.cafeCount500m)} unit="개" />
          <Metric label="성장률" value={formatPercent(vacancy.industryGrowthRate500m)} unit="" />
        </div>
      </div>

      <div className="vacancy-detail-section">
        <h3>수요 패턴</h3>
        <div className="vacancy-bars">
          {factors.map(factor => (
            <MetricBar key={factor.label} {...factor} />
          ))}
        </div>
      </div>

      <div className="vacancy-detail-section">
        <h3>운영 지표</h3>
        <div className="vacancy-ops-list">
          <DetailRow label="분기 유동" value={formatPeople(vacancy.floatingPopulationQuarterlyAverage)} />
          <DetailRow label="가게당 평균 매출" value={formatWon(vacancy.averageSalesPerStore)} />
          <DetailRow label="개업률" value={formatPercent(vacancy.openingRate)} />
          <DetailRow label="폐업률" value={formatPercent(vacancy.closureRate)} />
          <DetailRow label="공시지가" value={formatWon(vacancy.officialLandPrice)} />
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="vacancy-metric">
      <span>{label}</span>
      <b>{value}{unit && <small>{unit}</small>}</b>
    </div>
  );
}

function MetricBar({ label, value, max, tone }: {
  label: string;
  value?: number | null;
  max: number;
  tone: string;
}) {
  const ratio = value == null ? 0 : Math.abs(value) <= 1 ? value * 100 : value;
  const normalized = Math.min(100, Math.max(0, (ratio / max) * 100));
  return (
    <div className="vacancy-bar-row">
      <div className="vacancy-bar-meta">
        <span>{label}</span>
        <b>{formatPercent(value)}</b>
      </div>
      <div className="vacancy-bar-track">
        <span className={`tone-${tone}`} style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vacancy-detail-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
