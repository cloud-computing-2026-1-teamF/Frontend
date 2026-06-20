import { useState } from 'react';
import { api } from '../../../api';
import {
  patchAnalysisSessionSaved,
  patchAnalysisSessionStatus,
} from '../../analysisSessions/store';
import { FactorCard, AccessibilityCard, buildFactorViz } from '../../../shared/FactorViz';
import { Icon } from '../../../shared/Icon';
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
                      <div className="rr-score-lab">생존율</div>
                    </div>
                  </div>
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
  const correlation = buildCorrelationCopy(history, trend, delta);
  const events = buildEventInsights(history, trend);

  return (
    <div className="rr-history-intel">
      <div className="rr-hi-head">
        <div>
          <div className="rr-hi-kicker">History Intelligence</div>
          <h4>점수 흐름과 점유 이탈의 연결</h4>
        </div>
        <span className="rr-hi-source">{history.summary.source.startsWith('mock') ? 'MOCK' : 'DATA'}</span>
      </div>

      <div className="rr-hi-summary">
        <div className="rr-hi-summary-main">
          <span className={`rr-hi-delta is-${direction}`}>{formatSigned(delta)}p</span>
          <b>{first.year} → {latest.year}</b>
          <em>{history.summary.scoreLabel}</em>
        </div>
        <div className="rr-hi-current">
          <b>{Math.round(currentScore)}</b>
          <span>현재 점수</span>
        </div>
      </div>

      <CorrelationChart trend={trend} events={history.occupancyTimeline} currentScore={currentScore} />

      <div className="rr-hi-read">
        <span>{correlation.title}</span>
        <p>{correlation.body}</p>
      </div>

      <div className="rr-hi-events">
        {events.map(item => (
          <div key={item.event.id} className={`rr-hi-event is-${item.event.status === 'vacant' ? 'vacant' : 'closed'}`}>
            <div className="rr-hi-event-rail">
              <span>{item.period}</span>
              <b>{item.scoreMove}</b>
            </div>
            <div className="rr-hi-event-body">
              <strong>{item.event.tenantLabel}</strong>
              <div className="rr-hi-event-meta">
                <span>{item.event.businessCategory ?? (item.event.status === 'vacant' ? '공실' : '업종 미상')}</span>
                <span>{item.event.monthlyRent != null ? `월 ${formatMan(item.event.monthlyRent)}` : '월세 미상'}</span>
                {item.event.deposit != null && <span>보증 {formatMan(item.event.deposit)}</span>}
              </div>
              {item.event.exitReasonSummary && <p>{item.event.exitReasonSummary}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationChart({
  trend,
  events,
  currentScore,
}: {
  trend: VacancyScorePoint[];
  events: VacancyHistoryEvent[];
  currentScore: number;
}) {
  const width = 304;
  const height = 150;
  const pad = { left: 20, right: 18, top: 20, bottom: 32 };
  const firstYear = trend[0]?.year ?? 2026;
  const lastYear = trend[trend.length - 1]?.year ?? firstYear;
  const minScore = Math.min(...trend.map(point => point.score), currentScore, 55);
  const maxScore = Math.max(...trend.map(point => point.score), currentScore, 90);
  const scoreRange = Math.max(1, maxScore - minScore);
  const yearRange = Math.max(1, lastYear - firstYear);
  const xOfYear = (year: number) =>
    pad.left + ((Math.max(firstYear, Math.min(lastYear, year)) - firstYear) / yearRange) * (width - pad.left - pad.right);
  const yOfScore = (score: number) =>
    pad.top + (1 - ((score - minScore) / scoreRange)) * (height - pad.top - pad.bottom);
  const points = trend.map(point => ({
    ...point,
    x: xOfYear(point.year),
    y: yOfScore(point.score),
  }));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const occupancyBands = events.map(event => {
    const start = yearFromDate(event.startedOn) ?? firstYear;
    const end = event.endedOn ? (yearFromDate(event.endedOn) ?? lastYear) : lastYear;
    const x = xOfYear(start);
    const nextX = xOfYear(end);
    return {
      event,
      x,
      width: Math.max(14, nextX - x),
      isVacant: event.status === 'vacant',
    };
  });
  const exitMarkers = events
    .filter(event => event.endedOn)
    .map(event => ({
      event,
      x: xOfYear(yearFromDate(event.endedOn) ?? lastYear),
    }));

  return (
    <svg className="rr-hi-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="점유 이탈과 점수 흐름의 상관 그래프">
      <defs>
        <linearGradient id="rrScoreLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="55%" stopColor="#8ED8D1" />
          <stop offset="100%" stopColor="#0FB5A6" />
        </linearGradient>
        <linearGradient id="rrVacantBand" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#CCFBF1" stopOpacity=".8" />
          <stop offset="100%" stopColor="#E0F2FE" stopOpacity=".9" />
        </linearGradient>
      </defs>
      <rect className="rr-hi-chart-bg" x="0" y="0" width={width} height={height} rx="18" />
      {occupancyBands.map(({ event, x, width: bandWidth, isVacant }) => (
        <rect
          key={event.id}
          className={`rr-hi-band ${isVacant ? 'is-vacant' : ''}`}
          x={x}
          y="24"
          width={bandWidth}
          height="74"
          rx="10"
        />
      ))}
      {[0, 1, 2].map(index => (
        <line
          key={index}
          className="rr-hi-grid-line"
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + index * 34}
          y2={pad.top + index * 34}
        />
      ))}
      {exitMarkers.map(({ event, x }) => (
        <g key={event.id} className="rr-hi-exit-marker">
          <line x1={x} x2={x} y1="24" y2="104" />
          <circle cx={x} cy="104" r="4.5" />
        </g>
      ))}
      <polyline className="rr-hi-score-line" points={line} />
      {points.map((point, index) => (
        <g key={point.year} className="rr-hi-score-point">
          <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 3.2} />
          {index === points.length - 1 && <text x={point.x} y={point.y - 10}>{Math.round(point.score)}</text>}
        </g>
      ))}
      {trend.map(point => (
        <text key={point.year} className="rr-hi-year-label" x={xOfYear(point.year)} y={height - 13}>
          {String(point.year).slice(2)}
        </text>
      ))}
      <text className="rr-hi-axis-label" x={pad.left} y={height - 132}>score</text>
      <text className="rr-hi-axis-label rr-hi-axis-label-exit" x={width - pad.right} y={height - 13}>exit</text>
    </svg>
  );
}

function buildCorrelationCopy(
  history: VacancyHistoryData,
  trend: VacancyScorePoint[],
  delta: number | null,
): { title: string; body: string } {
  const exits = history.occupancyTimeline.filter(event => event.status !== 'vacant');
  const latestExit = [...exits].reverse().find(event => event.exitReasonSummary);
  const move = formatSigned(delta);
  if (delta != null && delta >= 3 && exits.length > 0) {
    return {
      title: '이탈은 있었지만 입지 점수는 버텼어요',
      body: `${exits.length}번의 점유 이탈 이후에도 장기 점수는 ${move}p입니다. 마지막 이탈 신호는 ${latestExit?.exitReasonSummary ?? history.summary.lastExitReason ?? '운영 조건 부담'}이라서, 입지 수요보다 업종 적합성과 고정비를 먼저 검증하세요.`,
    };
  }
  if (delta != null && delta <= -3) {
    return {
      title: '이탈과 점수 하락이 같은 방향이에요',
      body: `점유 교체 구간과 함께 장기 점수가 ${move}p 움직였습니다. 최근 이탈 사유와 유동·경쟁 지표를 함께 확인해야 하는 주의 신호입니다.`,
    };
  }
  return {
    title: '점수는 안정, 이탈은 운영 조건 문제에 가까워요',
    body: `${trend[0]?.year ?? '초기'}년부터 최근까지 점수 변화가 ${move}p 수준입니다. 점유 이탈 자체보다 권리금·월세·업종 전환 비용이 수익성을 흔드는지 확인하세요.`,
  };
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
    return {
      event,
      period: formatPeriod(event.startedOn, event.endedOn),
      scoreMove: `${move}p`,
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

function formatPeriod(start?: string | null, end?: string | null): string {
  const startYear = start?.slice(0, 4) ?? '----';
  const endYear = end?.slice(0, 4) ?? '현재';
  return `${startYear} - ${endYear}`;
}

function formatMan(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}만`;
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
        {factors.map(factor => (
          <FactorCard key={factor.key} {...factor} />
        ))}
        {property.nearby && <AccessibilityCard nearby={property.nearby} />}
      </div>
    </>
  );
}
