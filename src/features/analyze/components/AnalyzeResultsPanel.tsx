import { useState, type FormEvent } from 'react';
import { api, type MenuPriceEstimate } from '../../../api';
import {
  patchAnalysisSessionSaved,
  patchAnalysisSessionStatus,
} from '../../analysisSessions/store';
import { FactorCard, AccessibilityCard, buildFactorViz } from '../../../shared/FactorViz';
import { Icon } from '../../../shared/Icon';
import { horizonDelta, horizonTone, normalizeHorizonScores, PRIMARY_HORIZON_YEARS } from '../../../lib/horizonScores';
import { useVacancyMetricReference } from '../../vacancies/useVacancyMetricReference';
import { ensureScoreExplanation, type AnalyzeArea, type AnalyzeProperty, type BizType } from '../model';

type SaveState = 'idle' | 'saving' | 'saved';

type AnalyzeResultsPanelProps = {
  properties: AnalyzeProperty[];
  selected: number;
  setSelected: (rank: number) => void;
  selectedBiz?: BizType;
  area: AnalyzeArea | null;
  analysisId?: string | null;
  onClose: () => void;
};

export function AnalyzeResultsPanel({
  properties,
  selected,
  setSelected,
  selectedBiz,
  area,
  analysisId,
  onClose,
}: AnalyzeResultsPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const sel = properties.find(property => property.rank === selected) || properties[0];
  const hasProperties = properties.length > 0;
  const { data: metricReference } = useVacancyMetricReference(selectedBiz?.key, sel?.vacancyId);

  const handleCardClick = (rank: number) => {
    if (selected === rank && detailOpen) {
      setDetailOpen(false);
      return;
    }

    setSelected(rank);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (saveState !== 'idle' || !analysisId) return;
    setSaveState('saving');
    try {
      const status = await api.analyses.patch(analysisId, { saved: true });
      patchAnalysisSessionStatus(analysisId, status);
      patchAnalysisSessionSaved(analysisId, true);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  };

  return (
    <div className={`rr-widget ${detailOpen ? 'is-expanded' : ''}`}>
      <div className="rr-list-pane">
        <div className="rr-head">
          <div className="rr-head-left">
            <div className="rr-head-ico"><Icon name="sparkles" size={15} /></div>
            <div>
              <div className="rr-head-title">추천 공실매물 Top 3</div>
              <div className="rr-head-sub">{selectedBiz?.emoji} {selectedBiz?.label} · {area?.displayName}</div>
            </div>
          </div>
          <button className="rr-close" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>

        <div className="rr-body">
          {hasProperties ? (
            <div className="rr-list">
              {properties.map(property => {
              const isSelected = property.rank === selected && detailOpen;
              const recommended = property.recommended !== false;
              const horizons = normalizeHorizonScores(property.horizonScores, property.score, property.recommended);
              const scoreExplanation = ensureScoreExplanation(property.scoreExplanation, property.rank, property.score);
              return (
                <div
                  key={property.rank}
                  className={`rr-card ${isSelected ? 'is-sel' : ''} ${recommended ? 'is-recommended' : 'is-not-recommended'}`}
                  onClick={() => handleCardClick(property.rank)}
                >
                  <div className="rr-card-main">
                    <div className={`rr-rank r${property.rank}`}>{property.rank}</div>
                    <div className="rr-info">
                      <div className={`rr-rec-badge ${recommended ? 'is-good' : 'is-caution'}`}>
                        {recommended ? '추천' : '비추천'}
                      </div>
                      <div className="rr-addr">{property.addr}</div>
                      <div className="rr-sub">{formatPropertySubline(property)}</div>
                    </div>
                    <div className="rr-score-box">
                      <div className="rr-score">{formatLocationScore(property.score)}</div>
                      <div className="rr-score-lab">입지 점수</div>
                    </div>
                  </div>
                  <HorizonForecastStrip horizons={horizons} />
                  <ScoreExplanationCue explanation={scoreExplanation} />
                  <div className="rr-kpis">
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">{property.transactionType === '매매' ? '매매가' : '월세'}</div>
                      <div className="rr-kpi-val">{formatManCurrency(property.transactionType === '매매' ? property.salePrice : property.rent)}</div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">보증금</div>
                      <div className="rr-kpi-val">{formatManCurrency(property.deposit)}</div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">관리비</div>
                      <div className="rr-kpi-val">{formatManCurrency(property.mgmt)}</div>
                    </div>
                  </div>
                  <MenuPriceEstimator property={property} selectedBiz={selectedBiz} />
                  {property.history && !isSelected && (
                    <VacancyHistoryCue history={property.history} />
                  )}
                  {isSelected && property.history && (
                    <VacancyHistoryInsight
                      history={property.history}
                      currentScore={property.score}
                      scoreExplanation={scoreExplanation}
                    />
                  )}
                  {isSelected && (
                    <div className="rr-card-footer">
                      <span>주변 상권 상세 보기</span>
                      <Icon name="chevron-right" size={14} />
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          ) : (
            <div className="rr-empty">
              <Icon name="database" size={18} />
              <div>
                <b>조건에 맞는 공실이 없어요</b>
                <p>검색 반경이나 예산 조건을 넓혀 다시 분석해주세요.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rr-save-wrap">
          <button
            className={`rr-save-btn rr-save-${saveState}`}
            onClick={handleSave}
            disabled={saveState !== 'idle'}
          >
            {saveState === 'saved' ? (
              <><Icon name="check" size={14} stroke={2.5} /> 분석 이력에 저장됨</>
            ) : saveState === 'saving' ? (
              <>저장 중…</>
            ) : (
              <><Icon name="bookmark" size={14} /> 분석 이력에 저장</>
            )}
          </button>
          {saveState === 'saved' && (
            <a href="/history" className="rr-save-link">
              분석 이력에서 보기 <Icon name="arrow-right" size={11} />
            </a>
          )}
        </div>

        <div className="rr-foot">
          <Icon name="info" size={11} />
          추천 결과는 창업 의사결정을 돕는 참고 자료예요
        </div>
      </div>

      {detailOpen && sel && (
        <div className="rr-detail-pane">
          <PropertyDetail property={sel} metricReference={metricReference} onClose={() => setDetailOpen(false)} />
        </div>
      )}
    </div>
  );
}

type VacancyHistoryData = NonNullable<AnalyzeProperty['history']>;
type VacancyHistoryEvent = VacancyHistoryData['occupancyTimeline'][number];
type VacancyScorePoint = VacancyHistoryData['scoreTrend'][number];

function VacancyHistoryCue({
  history,
}: {
  history: VacancyHistoryData;
}) {
  const delta = history.summary.scoreDelta ?? scoreDelta(history.scoreTrend);
  const transitionCount = closedHistoryEvents(history.occupancyTimeline).length;

  return (
    <div className="rr-history-cue">
      <span>상권 변화 이력</span>
      <b>{formatSigned(delta)}p</b>
      <em>{transitionCount}회 업종 변동</em>
    </div>
  );
}

function VacancyHistoryInsight({
  history,
  currentScore,
  scoreExplanation,
}: {
  history: VacancyHistoryData;
  currentScore: number;
  scoreExplanation: ScoreExplanationData;
}) {
  const trend = history.scoreTrend.length > 0
    ? history.scoreTrend
    : [{ year: 2026, score: currentScore, delta: null, source: history.summary.source }];
  const first = trend[0];
  const latest = trend[trend.length - 1];
  const delta = history.summary.scoreDelta ?? scoreDelta(trend);
  const direction = directionFromDelta(delta);
  const events = buildEventInsights(history, trend);
  const closedEvents = closedHistoryEvents(history.occupancyTimeline);
  const turnoverSignal = evacuationSignalCandidate(scoreExplanation);

  return (
    <div className="rr-history-intel">
      <div className="rr-hi-head">
        <div>
          <div className="rr-hi-kicker">매물·상권 변화 이력</div>
          <h4>{first.year} - {latest.year}</h4>
        </div>
        <span className="rr-hi-source">{history.summary.source.startsWith('mock') ? 'MOCK' : 'DATA'}</span>
      </div>

      <div className="rr-hi-summary">
        <div className="rr-hi-metric">
          <span>현재 점수</span>
          <b>{Math.round(currentScore)}</b>
          <em>{history.summary.scoreLabel}</em>
        </div>
        <div className="rr-hi-metric">
          <span>장기 점수 변화</span>
          <b className={`rr-hi-delta is-${direction}`}>{formatSigned(delta)}p</b>
          <em>{first.year} - {latest.year}</em>
        </div>
        <div className="rr-hi-metric">
          <span>업종 변동</span>
          <b>{closedEvents.length}회</b>
          <em>{closedEvents.length > 0 ? '전환 이력' : '현재 공실'}</em>
        </div>
      </div>

      <HistoryTimeline trend={trend} events={history.occupancyTimeline} currentScore={currentScore} />

      {turnoverSignal && (
        <div className={`rr-hi-facts is-${effectTone(turnoverSignal.item.effect)} ${turnoverSignal.isFallback ? 'is-fallback' : ''}`}>
          <span>
            <em>{turnoverSignal.isFallback ? '가장 약한 조건' : '전환 의심 조건'}</em>
            <b>{turnoverSignalText(turnoverSignal.item, turnoverSignal.isFallback)}</b>
          </span>
        </div>
      )}

      <div className="rr-hi-ledger">
        {events.map(item => (
          <div key={item.event.id} className={`rr-hi-row is-${item.event.status === 'vacant' ? 'vacant' : 'closed'}`}>
            <div className="rr-hi-row-period">
              <span>{item.period}</span>
            </div>
            <div className="rr-hi-row-main">
              <strong>{item.event.tenantLabel}</strong>
              <em>{formatOccupancySubline(item.event)}</em>
            </div>
            <b className={`rr-hi-row-score is-${directionFromDelta(item.rawScoreMove)}`}>{item.scoreMove}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTimeline({
  trend,
  events,
  currentScore,
}: {
  trend: VacancyScorePoint[];
  events: VacancyHistoryEvent[];
  currentScore: number;
}) {
  const width = 312;
  const height = 158;
  const pad = { left: 18, right: 18 };
  const trendYears = trend.map(point => point.year);
  const firstYear = Math.floor(trendYears.length > 0 ? Math.min(...trendYears) : 2026);
  const lastLabelYear = Math.floor(trendYears.length > 0 ? Math.max(...trendYears) : firstYear);
  const timelineEnd = lastLabelYear + 1;
  const scoreValues = [...trend.map(point => point.score), currentScore];
  const rawMinScore = Math.min(...scoreValues);
  const rawMaxScore = Math.max(...scoreValues);
  const rawScoreSpread = Math.max(0, rawMaxScore - rawMinScore);
  const scoreCenter = (rawMinScore + rawMaxScore) / 2;
  const visualScoreRange = Math.min(16, Math.max(6, rawScoreSpread * 1.25));
  const visualMinScore = Math.max(0, scoreCenter - visualScoreRange / 2);
  const visualMaxScore = Math.min(100, scoreCenter + visualScoreRange / 2);
  const scoreRange = Math.max(1, visualMaxScore - visualMinScore);
  const timeRange = Math.max(1, timelineEnd - firstYear);
  const xOfTime = (value: number) =>
    pad.left + ((Math.max(firstYear, Math.min(timelineEnd, value)) - firstYear) / timeRange) * (width - pad.left - pad.right);
  const yOfScore = (score: number) =>
    24 + (1 - ((score - visualMinScore) / scoreRange)) * 58;
  const points = trend.map(point => ({
    ...point,
    x: xOfTime(point.year + 0.5),
    y: yOfScore(point.score),
  }));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = points.length > 0
    ? `${points[0].x.toFixed(1)},88 ${line} ${points[points.length - 1].x.toFixed(1)},88`
    : '';
  const occupancyBands = events.flatMap(event => {
    const rawStart = dateToYearFraction(event.startedOn, firstYear);
    const rawEnd = event.endedOn
      ? dateToYearFraction(event.endedOn, timelineEnd)
      : timelineEnd - 0.08;
    if (rawEnd < firstYear || rawStart > timelineEnd) return [];
    const start = Math.max(firstYear, rawStart);
    const end = Math.min(timelineEnd, rawEnd);
    const x = xOfTime(start);
    const nextX = xOfTime(end);
    return [{
      event,
      x,
      width: Math.max(14, nextX - x),
      label: compactCategory(event),
      isVacant: event.status === 'vacant',
    }];
  });
  const exitMarkers = events
    .filter(event => {
      if (!event.endedOn) return false;
      const ended = dateToYearFraction(event.endedOn, timelineEnd);
      return ended >= firstYear && ended <= timelineEnd;
    })
    .map(event => ({
      event,
      x: xOfTime(dateToYearFraction(event.endedOn, timelineEnd)),
    }));
  const yearLabels = Array.from({ length: lastLabelYear - firstYear + 1 }, (_, index) => firstYear + index)
    .filter(year => year === firstYear || year === lastLabelYear || year % 2 === 0);

  return (
    <svg className="rr-hi-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="매물 점수와 점유 이력 그래프">
      <defs>
        <linearGradient id="rrScoreArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity=".2" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect className="rr-hi-chart-bg" x="0.5" y="0.5" width={width - 1} height={height - 1} rx="13" />
      {yearLabels.map(year => (
        <line
          key={year}
          className="rr-hi-year-grid"
          x1={xOfTime(year)}
          x2={xOfTime(year)}
          y1="18"
          y2="132"
        />
      ))}
      {area && <polygon className="rr-hi-score-area" points={area} />}
      <polyline className="rr-hi-score-line" points={line} />
      {points.map(point => (
        <circle key={point.year} className="rr-hi-score-dot" cx={point.x} cy={point.y} r="3.1" />
      ))}
      {occupancyBands.map(({ event, x, width: bandWidth, label, isVacant }) => (
        <g key={event.id}>
          <rect
            className={`rr-hi-band ${isVacant ? 'is-vacant' : ''}`}
            x={x}
            y="104"
            width={bandWidth}
            height="22"
            rx="7"
          />
          {bandWidth >= 42 && (
            <text className={`rr-hi-band-label ${isVacant ? 'is-vacant' : ''}`} x={x + bandWidth / 2} y="119">
              {label}
            </text>
          )}
        </g>
      ))}
      {exitMarkers.map(({ event, x }) => (
        <g key={event.id} className="rr-hi-exit-marker">
          <line x1={x} x2={x} y1="24" y2="129" />
          <circle cx={x} cy="94" r="3.4" />
        </g>
      ))}
      {yearLabels.map(year => (
        <text key={year} className="rr-hi-year-label" x={xOfTime(year + 0.5)} y={height - 10}>
          {String(year).slice(2)}
        </text>
      ))}
    </svg>
  );
}

function buildEventInsights(history: VacancyHistoryData, trend: VacancyScorePoint[]) {
  return history.occupancyTimeline.map(event => {
    const startYear = yearFromDate(event.startedOn) ?? trend[0]?.year;
    const endYear = event.endedOn
      ? yearFromDate(event.endedOn) ?? trend[trend.length - 1]?.year
      : trend[trend.length - 1]?.year;
    const startScore = scoreAtYear(trend, startYear);
    const endScore = scoreAtYear(trend, endYear);
    const move = startScore != null && endScore != null
      ? formatSigned(Math.round((endScore - startScore) * 10) / 10)
      : '±0';
    const rawScoreMove = startScore != null && endScore != null
      ? Math.round((endScore - startScore) * 10) / 10
      : null;
    return {
      event,
      period: formatShortPeriod(event.startedOn, event.endedOn),
      scoreMove: `${move}p`,
      rawScoreMove,
    };
  });
}

function closedHistoryEvents(events: VacancyHistoryEvent[]): VacancyHistoryEvent[] {
  return events.filter(event => event.status === 'closed' || Boolean(event.endedOn));
}

function scoreAtYear(trend: VacancyScorePoint[], year?: number | null): number | null {
  if (!trend.length || year == null) return null;
  const exact = trend.find(point => point.year === year);
  if (exact) return exact.score;
  return trend.reduce((closest, point) =>
    Math.abs(point.year - year) < Math.abs(closest.year - year) ? point : closest,
  trend[0]).score;
}

function yearFromDate(value?: string | null): number | null {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function dateToYearFraction(value: string | null | undefined, fallbackYear: number): number {
  if (!value) return fallbackYear;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7)) || 1;
  const day = Number(value.slice(8, 10)) || 1;
  if (!Number.isFinite(year)) return fallbackYear;
  return year + (month - 1) / 12 + Math.min(day - 1, 30) / 365;
}

function scoreDelta(trend: NonNullable<AnalyzeProperty['history']>['scoreTrend']): number | null {
  if (trend.length < 2) return null;
  return Math.round((trend[trend.length - 1].score - trend[0].score) * 10) / 10;
}

function directionFromDelta(delta: number | null): string {
  if (delta == null) return 'flat';
  if (delta >= 3) return 'up';
  if (delta <= -3) return 'down';
  return 'flat';
}

function formatSigned(value?: number | null): string {
  if (value == null) return '±0';
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `${rounded}`;
  return '±0';
}

function formatShortPeriod(start?: string | null, end?: string | null): string {
  const startYear = start?.slice(2, 4) ?? '--';
  const endYear = end?.slice(2, 4) ?? '현재';
  return `${startYear}-${endYear}`;
}

function compactCategory(event: VacancyHistoryEvent): string {
  if (event.status === 'vacant') return '공실';
  if (!event.businessCategory) return '운영';
  return event.businessCategory.replace('일반음식점', '음식점').replace('근린생활', '근린');
}

function formatOccupancySubline(event: VacancyHistoryEvent): string {
  const category = event.businessCategory ?? (event.status === 'vacant' ? '공실' : '업종 미상');
  const terms = formatOccupancyTerms(event);
  return terms ? `${category} · ${terms}` : category;
}

function formatOccupancyTerms(event?: VacancyHistoryEvent | null): string | null {
  if (!event) return null;
  const terms = [
    event.monthlyRent != null ? `월 ${formatMan(event.monthlyRent)}` : null,
    event.deposit != null ? `보증 ${formatMan(event.deposit)}` : null,
  ].filter(Boolean);
  return terms.length > 0 ? terms.join(' · ') : null;
}

function formatMan(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}만`;
}

function formatManCurrency(value?: number | null): string {
  const amountMan = Math.max(0, Math.round(value ?? 0));
  if (amountMan >= 10_000) {
    const eok = Math.floor(amountMan / 10_000);
    const man = amountMan % 10_000;
    return man > 0
      ? `${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만`
      : `${eok.toLocaleString('ko-KR')}억`;
  }
  return `${amountMan.toLocaleString('ko-KR')}만`;
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatLocationScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPropertySubline(property: AnalyzeProperty): string {
  const parts: string[] = [];
  const floor = cleanPropertyMeta(property.floor);
  if (floor && floor !== '상가') parts.push(floor);
  if (Number.isFinite(property.area) && property.area > 0) {
    parts.push(`${Math.round(property.area).toLocaleString('ko-KR')}㎡`);
  }
  parts.push('상가');
  const distance = formatDistance(property.distanceM);
  if (distance) parts.push(`${distance} 거리`);
  return parts.join(' · ');
}

function cleanPropertyMeta(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes('_')) return null;
  return trimmed;
}

function formatDistance(value?: number): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return `${Math.round(value).toLocaleString('ko-KR')}m`;
}

function HorizonForecastStrip({ horizons }: { horizons: ReturnType<typeof normalizeHorizonScores> }) {
  return (
    <div className="rr-horizon-strip" aria-label="기간별 입지 점수">
      {horizons.map(item => (
        <div
          key={item.horizonYears}
          className={`rr-horizon-item is-${horizonTone(item.survivalScore)} ${item.horizonYears === PRIMARY_HORIZON_YEARS ? 'is-primary' : ''}`}
        >
          <div className="rr-horizon-top">
            <span>{item.horizonYears}년</span>
            <b>{formatLocationScore(item.survivalScore)}</b>
          </div>
          <div className="rr-horizon-track">
            <i style={{ width: `${formatLocationScore(item.survivalScore)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuPriceEstimator({
  property,
  selectedBiz,
}: {
  property: AnalyzeProperty;
  selectedBiz?: BizType;
}) {
  const [menuName, setMenuName] = useState('');
  const [estimate, setEstimate] = useState<MenuPriceEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const trimmed = menuName.trim();
    if (!trimmed || loading) return;
    const vacancyId = property.vacancyId;
    if (!vacancyId) {
      setError('매물 정보를 다시 불러와 주세요');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextEstimate = await api.vacancies.estimateMenuPrice(vacancyId, trimmed);
      setEstimate(nextEstimate);
    } catch {
      setError('가격 계산에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  const placeholder = selectedBiz?.key === 'cafe' ? '아메리카노' : '대표 메뉴';

  return (
    <div className={`rr-menu-price ${estimate ? 'has-result' : ''}`} onClick={event => event.stopPropagation()}>
      <form className="rr-menu-form" onSubmit={handleSubmit}>
        <div className="rr-menu-label">
          <Icon name="cpu" size={13} />
          <span>메뉴 판매가</span>
        </div>
        <div className="rr-menu-input-wrap">
          <input
            value={menuName}
            onChange={event => setMenuName(event.target.value)}
            onFocus={event => event.stopPropagation()}
            placeholder={placeholder}
            aria-label="판매가를 계산할 메뉴"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !menuName.trim()} aria-label="판매가 계산">
            {loading ? <span className="rr-menu-spinner" /> : <Icon name="arrow-right" size={13} />}
          </button>
        </div>
      </form>

      {loading && (
        <div className="rr-menu-status">
          <span className="rr-menu-pulse" />
          가격 계산 중
        </div>
      )}

      {!loading && estimate && (
        <div className="rr-menu-result">
          <div>
            <span>{estimate.positioning}</span>
            <b>{formatWon(estimate.recommendedPrice)}</b>
          </div>
          <p>{formatWon(estimate.minPrice)} - {formatWon(estimate.maxPrice)} · 신뢰도 {estimate.confidence}</p>
        </div>
      )}

      {!loading && error && <div className="rr-menu-error">{error}</div>}
    </div>
  );
}

type ScoreExplanationData = NonNullable<AnalyzeProperty['scoreExplanation']>;
type ScoreFeatureReason = ScoreExplanationData['features'][number];
type EvacuationSignal = {
  item: ScoreFeatureReason;
  isFallback: boolean;
};

function ScoreExplanationCue({ explanation }: { explanation: ScoreExplanationData }) {
  const features = topScoreFeatures(explanation);
  const positive = features.find(item => effectTone(item.effect) === 'positive');
  const caution = features.find(item => effectTone(item.effect) === 'negative')
    ?? features.find(item => item.featureKey !== positive?.featureKey);
  const cueItems = [positive, caution]
    .filter((item): item is ScoreFeatureReason => Boolean(item))
    .filter((item, index, items) => items.findIndex(candidate => candidate.featureKey === item.featureKey) === index);
  if (!cueItems.length) return null;

  return (
    <div className="rr-xai-cue" aria-label="추천 이유 요약">
      {cueItems.map(item => {
        const tone = effectTone(item.effect);
        return (
          <span key={item.featureKey} className={`is-${tone}`}>
            <em>{cueLabel(tone)}</em>
            <b>{item.featureLabel}</b>
          </span>
        );
      })}
    </div>
  );
}

function cueLabel(tone: ReturnType<typeof effectTone>): string {
  if (tone === 'positive') return '강점';
  if (tone === 'negative') return '주의';
  if (tone === 'neutral') return '보통';
  return '조건';
}

function LocationScoreForecastCard({ property }: { property: AnalyzeProperty }) {
  const horizons = normalizeHorizonScores(property.horizonScores, property.score, property.recommended);
  const primary = horizons.find(item => item.horizonYears === PRIMARY_HORIZON_YEARS) ?? horizons[0];
  const delta = horizonDelta(horizons, property.score);
  const roundedDelta = Math.round(delta);
  const deltaLabel = roundedDelta > 0 ? `+${roundedDelta}p` : `${roundedDelta}p`;
  const outlook = delta >= 2 ? '상승 흐름' : delta <= -2 ? '보수 점검' : '안정 흐름';
  const primaryScore = formatLocationScore(primary?.survivalScore ?? property.score);

  return (
    <div className="rr-forecast-card">
      <div className="rr-forecast-head">
        <div>
          <div className="rr-forecast-kicker">기간별 입지 점수</div>
          <h4>{PRIMARY_HORIZON_YEARS}년 기준 {primaryScore}점</h4>
        </div>
        <span className={`rr-forecast-delta ${delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : 'is-flat'}`}>
          {outlook} {deltaLabel}
        </span>
      </div>
      <div className="rr-forecast-grid">
        {horizons.map(item => (
          <div
            key={item.horizonYears}
            className={`rr-forecast-cell is-${horizonTone(item.survivalScore)} ${item.horizonYears === PRIMARY_HORIZON_YEARS ? 'is-primary' : ''}`}
          >
            <span>{item.horizonYears}년</span>
            <b>{formatLocationScore(item.survivalScore)}</b>
            <div className="rr-forecast-bar">
              <i style={{ width: `${formatLocationScore(item.survivalScore)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreExplanationPanel({ property }: { property: AnalyzeProperty }) {
  const explanation = ensureScoreExplanation(property.scoreExplanation, property.rank, property.score);
  const features = topScoreFeatures(explanation);
  if (!features.length) return null;

  const positiveCount = features.filter(item => effectTone(item.effect) === 'positive').length;
  const cautionCount = features.filter(item => effectTone(item.effect) === 'negative').length;
  const sourceLabel = scoreSourceLabel(explanation.source);

  return (
    <div className="rr-xai-panel">
      <div className="rr-xai-head">
        <div>
          <div className="rr-xai-kicker">추천 이유</div>
          <h4>결정적으로 본 조건 Top 3</h4>
        </div>
        <span className={`rr-xai-source ${sourceLabel === '예시' ? 'is-mock' : ''}`}>{sourceLabel}</span>
      </div>

      <div className="rr-xai-summary" aria-label="평균 대비 조건 요약">
        <span className="is-positive"><b>{positiveCount}</b> 유리</span>
        <span className="is-negative"><b>{cautionCount}</b> 주의</span>
      </div>

      <div className="rr-xai-feature-list">
        {features.map(item => (
          <ScoreFeatureReasonRow key={`${item.rank}-${item.featureKey}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function ScoreFeatureReasonRow({ item }: { item: ScoreFeatureReason }) {
  const tone = effectTone(item.effect);
  const marker = comparisonMarker(item);
  const current = finiteNumber(item.currentValue);
  const average = finiteNumber(item.averageValue);
  const hasValues = current != null && average != null;
  const currentLabelLeft = marker == null ? 50 : railLabelPosition(marker);
  const fillStyle = marker == null
    ? undefined
    : {
        left: `${Math.min(50, marker)}%`,
        width: `${Math.max(2, Math.abs(marker - 50))}%`,
      };

  return (
    <div className={`rr-xai-feature is-${tone}`}>
      <div className="rr-xai-feature-main">
        <span className="rr-xai-rank">{item.rank}</span>
        <div className="rr-xai-feature-copy">
          <div className="rr-xai-feature-top">
            <b>{item.featureLabel}</b>
            <em>{effectLabel(tone)}</em>
          </div>
          <p>{comparisonText(item)}</p>
        </div>
      </div>
      <div
        className="rr-xai-rail"
        aria-label={hasValues
          ? `${item.featureLabel} 평균 ${formatFeatureValue(average, item.displayUnit)}, 이 매물 ${formatFeatureValue(current, item.displayUnit)}`
          : `${item.featureLabel} 평균 대비 위치`
        }
      >
        <div className="rr-xai-rail-graph">
          {hasValues && (
            <span className="rr-xai-rail-value is-current" style={{ left: `${currentLabelLeft}%` }}>
              이 매물 <b>{formatFeatureValue(current, item.displayUnit)}</b>
            </span>
          )}
          <div className="rr-xai-rail-track" aria-hidden="true">
          {fillStyle && <i style={fillStyle} />}
          {marker != null && <b style={{ left: `${marker}%` }} />}
          </div>
          {hasValues && (
            <span className="rr-xai-rail-value is-average" style={{ left: '50%' }}>
              평균 <b>{formatFeatureValue(average, item.displayUnit)}</b>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function topScoreFeatures(explanation: ScoreExplanationData): ScoreFeatureReason[] {
  return explanation.features
    .filter(item => item && item.featureKey && item.featureLabel)
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
}

function evacuationSignalCandidate(explanation: ScoreExplanationData): EvacuationSignal | null {
  const features = topScoreFeatures(explanation);
  const negative = features.find(item => effectTone(item.effect) === 'negative');
  if (negative) return { item: negative, isFallback: false };

  const weakestPositive = features
    .filter(item => effectTone(item.effect) === 'positive')
    .slice()
    .sort((a, b) => positiveMargin(a) - positiveMargin(b))[0];
  return weakestPositive ? { item: weakestPositive, isFallback: true } : null;
}

function effectTone(effect: ScoreFeatureReason['effect']): 'positive' | 'negative' | 'neutral' | 'unknown' {
  if (effect === 'positive') return 'positive';
  if (effect === 'negative') return 'negative';
  if (effect === 'neutral') return 'neutral';
  return 'unknown';
}

function effectLabel(tone: ReturnType<typeof effectTone>): string {
  if (tone === 'positive') return '유리';
  if (tone === 'negative') return '주의';
  if (tone === 'neutral') return '보통';
  return '확인중';
}

function scoreSourceLabel(source: string | null | undefined): string {
  if (!source || source.startsWith('mock')) return '예시';
  if (source.includes('top_features')) return 'AI 근거';
  return '데이터';
}

function comparisonText(item: ScoreFeatureReason): string {
  const current = finiteNumber(item.currentValue);
  const average = finiteNumber(item.averageValue);
  if (current == null || average == null) return '상권 평균과 비교 준비 중';

  const delta = current - average;
  if (Math.abs(delta) < 0.000001) return '상권 평균과 거의 같아요';

  const direction = featureDirection(item, 'clause');
  const tone = effectTone(item.effect);
  if (tone === 'positive') return `상권 평균보다 ${direction} 재입점 조건이 좋아요`;
  if (tone === 'negative') return `상권 평균보다 ${direction} 공실 전환 부담으로 보여요`;
  return `상권 평균보다 ${direction} 보여요`;
}

function turnoverSignalText(item: ScoreFeatureReason, isFallback = false): string {
  if (isFallback) return `${item.featureLabel} 유리폭 약함`;
  const direction = featureDirection(item);
  return direction ? `${item.featureLabel} ${direction}` : item.featureLabel;
}

function positiveMargin(item: ScoreFeatureReason): number {
  const current = finiteNumber(item.currentValue);
  const average = finiteNumber(item.averageValue);
  if (current == null || average == null) return Number.POSITIVE_INFINITY;
  const delta = current - average;
  const favorableDelta = item.higherIsPositive === false ? -delta : delta;
  const base = Math.max(Math.abs(average), 1);
  return favorableDelta / base;
}

type FeatureDirectionMode = 'label' | 'clause';

type FeatureDirectionWords = {
  highLabel: string;
  lowLabel: string;
  highClause: string;
  lowClause: string;
};

const SIZE_DIRECTION: FeatureDirectionWords = {
  highLabel: '큼',
  lowLabel: '작음',
  highClause: '커',
  lowClause: '작아',
};

const COUNT_DIRECTION: FeatureDirectionWords = {
  highLabel: '많음',
  lowLabel: '적음',
  highClause: '많아',
  lowClause: '적어',
};

const LEVEL_DIRECTION: FeatureDirectionWords = {
  highLabel: '높음',
  lowLabel: '낮음',
  highClause: '높아',
  lowClause: '낮아',
};

const DISTANCE_DIRECTION: FeatureDirectionWords = {
  highLabel: '멂',
  lowLabel: '가까움',
  highClause: '멀어',
  lowClause: '가까워',
};

const DURATION_DIRECTION: FeatureDirectionWords = {
  highLabel: '긺',
  lowLabel: '짧음',
  highClause: '길어',
  lowClause: '짧아',
};

const PRICE_DIRECTION: FeatureDirectionWords = {
  highLabel: '비쌈',
  lowLabel: '저렴함',
  highClause: '비싸',
  lowClause: '저렴해',
};

const SIGNAL_DIRECTION: FeatureDirectionWords = {
  highLabel: '강함',
  lowLabel: '약함',
  highClause: '강해',
  lowClause: '약해',
};

const FEATURE_DIRECTION_WORDS: Record<string, FeatureDirectionWords> = {
  facility_total_size: SIZE_DIRECTION,
  store_site_area: SIZE_DIRECTION,
  exclusive_area: SIZE_DIRECTION,
  supply_area: SIZE_DIRECTION,
  location_area: SIZE_DIRECTION,
  floor_area_per_floor: SIZE_DIRECTION,
  gross_floor_area: SIZE_DIRECTION,
  cafe_count_1000m: COUNT_DIRECTION,
  neighborhood_store_count: COUNT_DIRECTION,
  seat_closed_count: COUNT_DIRECTION,
  same_category_count_1000m: COUNT_DIRECTION,
  same_category_count_500m: COUNT_DIRECTION,
  same_category_competition_500m: COUNT_DIRECTION,
  restaurant_count_500m: COUNT_DIRECTION,
  cafe_count_500m: COUNT_DIRECTION,
  seat_open_count: COUNT_DIRECTION,
  ground_floors: COUNT_DIRECTION,
  resident_population_density_annual: COUNT_DIRECTION,
  evening_population_density: COUNT_DIRECTION,
  weekend_population_density: COUNT_DIRECTION,
  daily_floating_population: COUNT_DIRECTION,
  cafe_2030_fit: COUNT_DIRECTION,
  cityhall_distance_km: DISTANCE_DIRECTION,
  gangnam_distance_km: DISTANCE_DIRECTION,
  seat_avg_lifetime_months: DURATION_DIRECTION,
  seat_median_lifetime_months: DURATION_DIRECTION,
  monthly_rent: PRICE_DIRECTION,
  deposit: PRICE_DIRECTION,
  maintenance_fee: PRICE_DIRECTION,
  premium: PRICE_DIRECTION,
  sale_price: PRICE_DIRECTION,
  official_land_price: PRICE_DIRECTION,
  commercial_turnover_type: SIGNAL_DIRECTION,
};

function featureDirection(item: ScoreFeatureReason, mode: FeatureDirectionMode = 'label'): string | null {
  const current = finiteNumber(item.currentValue);
  const average = finiteNumber(item.averageValue);
  if (current == null || average == null) return null;
  const delta = current - average;
  if (Math.abs(delta) < 0.000001) return '평균 수준';
  const words = FEATURE_DIRECTION_WORDS[item.featureKey] ?? LEVEL_DIRECTION;
  const high = delta > 0;
  if (mode === 'clause') return high ? words.highClause : words.lowClause;
  return high ? words.highLabel : words.lowLabel;
}

function formatFeatureValue(value: number, unit: string | null | undefined): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const formatted = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  const normalizedUnit = normalizeFeatureUnit(unit);
  return normalizedUnit ? `${formatted}${normalizedUnit}` : formatted;
}

function normalizeFeatureUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  return unit
    .trim()
    .replace(/km(?:\^?2|²)/gi, '㎢')
    .replace(/m(?:\^?2|²)/gi, '㎡');
}

function comparisonMarker(item: ScoreFeatureReason): number | null {
  const current = finiteNumber(item.currentValue);
  const average = finiteNumber(item.averageValue);
  if (current == null || average == null) return null;
  const base = Math.max(Math.abs(average), 1);
  const delta = current - average;
  if (Math.abs(delta) < 0.000001) return 50;

  // Nonlinear display scale keeps close-to-average values visibly legible without changing the data.
  const deltaRatio = Math.min(1, Math.abs(delta) / base);
  const amplifiedRatio = Math.min(1, 0.28 + Math.sqrt(deltaRatio) * 0.72);
  const marker = 50 + Math.sign(delta) * amplifiedRatio * 43;
  return Math.round(Math.max(7, Math.min(93, marker)) * 10) / 10;
}

function railLabelPosition(marker: number): number {
  return Math.round(Math.max(18, Math.min(82, marker)) * 10) / 10;
}

function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function PropertyDetail({
  property,
  metricReference,
  onClose,
}: {
  property: AnalyzeProperty;
  metricReference: Parameters<typeof buildFactorViz>[1];
  onClose: () => void;
}) {
  const factors = buildFactorViz(property, metricReference);

  return (
    <>
      <div className="rr-detail-head-bar">
        <button className="rr-detail-back" onClick={onClose}>
          <Icon name="chevron-left" size={14} />
          <span>뒤로</span>
        </button>
        <div className="rr-detail-title">
          <div className="rr-detail-title-main">{property.addr}</div>
          <div className="rr-detail-title-sub">주변 상권 상세 분석</div>
        </div>
      </div>
      <div className="rr-detail-body">
        <LocationScoreForecastCard property={property} />
        <ScoreExplanationPanel property={property} />
        {factors.map(factor => (
          <FactorCard key={factor.key} {...factor} />
        ))}
        {property.nearby && <AccessibilityCard nearby={property.nearby} />}
      </div>
    </>
  );
}
