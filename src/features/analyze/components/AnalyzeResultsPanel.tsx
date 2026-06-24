import { useState } from 'react';
import { api } from '../../../api';
import {
  patchAnalysisSessionSaved,
  patchAnalysisSessionStatus,
} from '../../analysisSessions/store';
import { FactorCard, AccessibilityCard, buildFactorViz } from '../../../shared/FactorViz';
import { Icon } from '../../../shared/Icon';
import { horizonDelta, horizonTone, normalizeHorizonScores, PRIMARY_HORIZON_YEARS } from '../../../lib/horizonScores';
import { useVacancyMetricReference } from '../../vacancies/useVacancyMetricReference';
import type { AnalyzeArea, AnalyzeProperty, BizType } from '../model';

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
                      <div className="rr-sub">{property.floor} · {property.area}㎡ · 상가</div>
                    </div>
                    <div className="rr-score-box">
                      <div className="rr-score">{property.score}<span className="rr-score-suf">%</span></div>
                      <div className="rr-score-lab">3년 생존율</div>
                    </div>
                  </div>
                  <HorizonForecastStrip horizons={horizons} />
                  {property.scoreExplanation && (
                    <ScoreExplanationCue explanation={property.scoreExplanation} />
                  )}
                  <div className="rr-kpis">
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">{property.transactionType === '매매' ? '매매가' : '월세'}</div>
                      <div className="rr-kpi-val">{property.transactionType === '매매' ? property.salePrice ?? 0 : property.rent}<span className="unit">만</span></div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">보증금</div>
                      <div className="rr-kpi-val">{(property.deposit / 1000).toFixed(1)}<span className="unit">천만</span></div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">관리비</div>
                      <div className="rr-kpi-val">{property.mgmt}<span className="unit">만</span></div>
                    </div>
                  </div>
                  {property.history && !isSelected && (
                    <VacancyHistoryCue history={property.history} />
                  )}
                  {isSelected && property.history && (
                    <VacancyHistoryInsight history={property.history} currentScore={property.score} />
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
  const exitCount = history.occupancyTimeline.filter(event => event.status !== 'vacant').length;

  return (
    <div className="rr-history-cue">
      <span>기억 데이터</span>
      <b>{formatSigned(delta)}p</b>
      <em>{exitCount}회 점유 이탈</em>
    </div>
  );
}

function VacancyHistoryInsight({
  history,
  currentScore,
}: {
  history: VacancyHistoryData;
  currentScore: number;
}) {
  const trend = history.scoreTrend.length > 0
    ? history.scoreTrend
    : [{ year: 2026, score: currentScore, delta: null, source: history.summary.source }];
  const first = trend[0];
  const latest = trend[trend.length - 1];
  const delta = history.summary.scoreDelta ?? scoreDelta(trend);
  const direction = directionFromDelta(delta);
  const events = buildEventInsights(history, trend);
  const closedEvents = history.occupancyTimeline.filter(event => event.status !== 'vacant');
  const currentOccupancy = [...history.occupancyTimeline].reverse().find(event => event.status === 'vacant')
    ?? history.occupancyTimeline[history.occupancyTimeline.length - 1];
  const latestExit = [...closedEvents].reverse().find(event => event.exitReasonSummary)
    ?? closedEvents[closedEvents.length - 1];
  const latestExitYear = yearFromDate(latestExit?.endedOn);

  return (
    <div className="rr-history-intel">
      <div className="rr-hi-head">
        <div>
          <div className="rr-hi-kicker">매물 기억 데이터</div>
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
          <span>장기 변화</span>
          <b className={`rr-hi-delta is-${direction}`}>{formatSigned(delta)}p</b>
          <em>{first.year} - {latest.year}</em>
        </div>
        <div className="rr-hi-metric">
          <span>점유 이탈</span>
          <b>{closedEvents.length}회</b>
          <em>{latestExitYear ? `${latestExitYear} 최근` : '기록 없음'}</em>
        </div>
      </div>

      <HistoryTimeline trend={trend} events={history.occupancyTimeline} currentScore={currentScore} />

      <div className="rr-hi-facts">
        <span><em>최근 이탈</em><b>{compactExitReason(latestExit?.exitReasonSummary ?? history.summary.lastExitReason)}</b></span>
        <span><em>현재</em><b>{currentOccupancy?.status === 'vacant' ? '공실' : '운영'}</b></span>
        <span><em>조건</em><b>{formatRentTerm(currentOccupancy)}</b></span>
      </div>

      <div className="rr-hi-ledger">
        {events.map(item => (
          <div key={item.event.id} className={`rr-hi-row is-${item.event.status === 'vacant' ? 'vacant' : 'closed'}`}>
            <div className="rr-hi-row-period">
              <span>{item.period}</span>
            </div>
            <div className="rr-hi-row-main">
              <strong>{item.event.tenantLabel}</strong>
              <em>{item.event.businessCategory ?? (item.event.status === 'vacant' ? '공실' : '업종 미상')} · {formatOccupancyTerms(item.event)}</em>
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
  const eventStarts = events.map(event => dateToYearFraction(event.startedOn, trendYears[0] ?? 2026));
  const eventEnds = events.map(event => event.endedOn
    ? dateToYearFraction(event.endedOn, trendYears[trendYears.length - 1] ?? 2026)
    : (trendYears[trendYears.length - 1] ?? 2026) + 0.92);
  const firstYear = Math.floor(Math.min(...trendYears, ...eventStarts));
  const lastLabelYear = Math.max(...trendYears, ...eventEnds.map(value => Math.floor(value)));
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
  const occupancyBands = events.map(event => {
    const start = dateToYearFraction(event.startedOn, firstYear);
    const end = event.endedOn
      ? dateToYearFraction(event.endedOn, timelineEnd)
      : timelineEnd - 0.08;
    const x = xOfTime(start);
    const nextX = xOfTime(end);
    return {
      event,
      x,
      width: Math.max(14, nextX - x),
      label: compactCategory(event),
      isVacant: event.status === 'vacant',
    };
  });
  const exitMarkers = events
    .filter(event => event.endedOn)
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
      : '±0.0';
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
  if (value == null) return '±0.0';
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toFixed(1)}`;
  if (rounded < 0) return rounded.toFixed(1);
  return '±0.0';
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

function formatOccupancyTerms(event?: VacancyHistoryEvent | null): string {
  if (!event) return '기록 없음';
  const terms = [
    event.monthlyRent != null ? `월 ${formatMan(event.monthlyRent)}` : null,
    event.deposit != null ? `보증 ${formatMan(event.deposit)}` : null,
  ].filter(Boolean);
  return terms.length > 0 ? terms.join(' · ') : '조건 미상';
}

function formatRentTerm(event?: VacancyHistoryEvent | null): string {
  if (!event?.monthlyRent) return '월세 미상';
  return `월 ${formatMan(event.monthlyRent)}`;
}

function compactExitReason(reason?: string | null): string {
  if (!reason) return '기록 없음';
  if (reason.includes('고정비')) return '고정비 부담';
  if (reason.includes('경쟁')) return '경쟁 부담';
  if (reason.includes('수요')) return '수요 약화';
  return reason.replace(' 추정', '').replace(' 가능성', '');
}

function formatMan(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}만`;
}

function HorizonForecastStrip({ horizons }: { horizons: ReturnType<typeof normalizeHorizonScores> }) {
  return (
    <div className="rr-horizon-strip" aria-label="기간별 생존율">
      {horizons.map(item => (
        <div
          key={item.horizonYears}
          className={`rr-horizon-item is-${horizonTone(item.survivalScore)} ${item.horizonYears === PRIMARY_HORIZON_YEARS ? 'is-primary' : ''}`}
        >
          <div className="rr-horizon-top">
            <span>{item.horizonYears}년</span>
            <b>{item.survivalScore}%</b>
          </div>
          <div className="rr-horizon-track">
            <i style={{ width: `${item.survivalScore}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type ScoreExplanationData = NonNullable<AnalyzeProperty['scoreExplanation']>;
type ScoreContribution = ScoreExplanationData['positive'][number];

function ScoreExplanationCue({ explanation }: { explanation: ScoreExplanationData }) {
  const positive = explanation.positive[0];
  const negative = explanation.negative[0];
  if (!positive && !negative) return null;

  return (
    <div className="rr-xai-cue" aria-label="점수 주요 영향 요인">
      {positive && (
        <span className="is-positive">
          <em>상승</em>
          <b>{positive.featureLabel}</b>
        </span>
      )}
      {negative && (
        <span className="is-negative">
          <em>하락</em>
          <b>{negative.featureLabel}</b>
        </span>
      )}
    </div>
  );
}

function SurvivalForecastCard({ property }: { property: AnalyzeProperty }) {
  const horizons = normalizeHorizonScores(property.horizonScores, property.score, property.recommended);
  const primary = horizons.find(item => item.horizonYears === PRIMARY_HORIZON_YEARS) ?? horizons[0];
  const delta = horizonDelta(horizons, property.score);
  const deltaLabel = delta > 0 ? `+${delta.toFixed(1)}p` : `${delta.toFixed(1)}p`;
  const outlook = delta >= 2 ? '장기 상승' : delta <= -2 ? '장기 보수' : '장기 안정';

  return (
    <div className="rr-forecast-card">
      <div className="rr-forecast-head">
        <div>
          <div className="rr-forecast-kicker">생존율 전망</div>
          <h4>{PRIMARY_HORIZON_YEARS}년 기준 {primary?.survivalScore ?? property.score}%</h4>
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
            <b>{item.survivalScore}<em>%</em></b>
            <div className="rr-forecast-bar">
              <i style={{ width: `${item.survivalScore}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreExplanationPanel({ property }: { property: AnalyzeProperty }) {
  const explanation = property.scoreExplanation;
  if (!explanation || (!explanation.positive.length && !explanation.negative.length)) return null;

  const positiveTotal = totalImpact(explanation.positive);
  const negativeTotal = totalImpact(explanation.negative);
  const total = Math.max(1, positiveTotal + negativeTotal);
  const positiveWidth = Math.max(6, Math.round((positiveTotal / total) * 100));
  const negativeWidth = Math.max(6, 100 - positiveWidth);
  const sourceLabel = explanation.source?.startsWith('mock') ? 'MOCK' : 'DATA';

  return (
    <div className="rr-xai-panel">
      <div className="rr-xai-head">
        <div>
          <div className="rr-xai-kicker">점수 산출 근거</div>
          <h4>{Math.round(property.score)}%를 만든 피처 영향</h4>
        </div>
        <span className={`rr-xai-source ${sourceLabel === 'MOCK' ? 'is-mock' : ''}`}>{sourceLabel}</span>
      </div>

      <div className="rr-xai-balance" aria-label="상승 요인과 하락 요인 비중">
        <i className="is-positive" style={{ width: `${positiveWidth}%` }} />
        <i className="is-negative" style={{ width: `${negativeWidth}%` }} />
      </div>
      <div className="rr-xai-balance-labels">
        <span>상승 요인 {positiveTotal}%</span>
        <span>하락 요인 {negativeTotal}%</span>
      </div>

      <div className="rr-xai-columns">
        <ScoreContributionList
          title="점수를 높인 요인"
          tone="positive"
          items={explanation.positive}
        />
        <ScoreContributionList
          title="점수를 낮춘 요인"
          tone="negative"
          items={explanation.negative}
        />
      </div>
    </div>
  );
}

function ScoreContributionList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'positive' | 'negative';
  items: ScoreContribution[];
}) {
  return (
    <div className={`rr-xai-list is-${tone}`}>
      <div className="rr-xai-list-title">{title}</div>
      {items.map(item => (
        <div key={`${item.direction}-${item.rank}-${item.featureKey}`} className="rr-xai-row">
          <div className="rr-xai-row-top">
            <span>{item.rank}</span>
            <b>{item.featureLabel}</b>
            <em>{formatImpactPercent(item.impactPercent)}</em>
          </div>
          <div className="rr-xai-row-meta">
            <span>{item.featureDisplayValue || '값 준비 중'}</span>
            <strong>{formatImpactValue(item.impactValue)}</strong>
          </div>
          <div className="rr-xai-row-bar">
            <i style={{ width: `${impactWidth(item.impactPercent)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function totalImpact(items: ScoreContribution[]): number {
  return Math.round(items.reduce((sum, item) => sum + Math.abs(item.impactPercent || 0), 0));
}

function impactWidth(value: number): number {
  return Math.min(100, Math.max(10, Math.round(Math.abs(value))));
}

function formatImpactPercent(value: number): string {
  return `${Math.round(Math.abs(value))}%`;
}

function formatImpactValue(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded > 0) return `+${rounded.toFixed(3)}`;
  if (rounded < 0) return rounded.toFixed(3);
  return '0.000';
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
        <SurvivalForecastCard property={property} />
        <ScoreExplanationPanel property={property} />
        {factors.map(factor => (
          <FactorCard key={factor.key} {...factor} />
        ))}
        {property.nearby && <AccessibilityCard nearby={property.nearby} />}
      </div>
    </>
  );
}
