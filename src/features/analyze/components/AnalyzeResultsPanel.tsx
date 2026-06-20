import { useState } from 'react';
import type { CSSProperties } from 'react';
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
                  {property.history && (
                    <VacancyHistoryPreview history={property.history} currentScore={property.score} />
                  )}
                  {isSelected && property.history && (
                    <VacancyHistoryPanel history={property.history} />
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

function VacancyHistoryPreview({
  history,
  currentScore,
}: {
  history: NonNullable<AnalyzeProperty['history']>;
  currentScore: number;
}) {
  const trend = history.scoreTrend ?? [];
  const timeline = history.occupancyTimeline ?? [];
  const delta = history.summary.scoreDelta ?? scoreDelta(trend);
  const direction = directionFromDelta(delta);

  return (
    <div className="rr-history-preview">
      <div className="rr-hp-top">
        <div>
          <div className="rr-hp-eyebrow">HISTORY INTELLIGENCE</div>
          <div className="rr-hp-title">{history.summary.scoreLabel}</div>
        </div>
        <span className={`rr-hp-delta is-${direction}`}>
          {formatSigned(delta)}
        </span>
      </div>
      <div className="rr-hp-chart-row">
        <ScoreTrendSparkline trend={trend} fallbackScore={currentScore} />
        <div className="rr-hp-score-now">
          <b>{currentScore}</b>
          <span>현재</span>
        </div>
      </div>
      <div className="rr-hp-life">
        {timeline.slice(-4).map((event, index) => (
          <span
            key={event.id}
            className={`rr-hp-life-dot is-${event.status === 'vacant' ? 'vacant' : 'occupied'}`}
            style={{ '--i': index } as CSSProperties}
            title={event.tenantLabel}
          />
        ))}
        <b>{history.summary.occupancyPatternLabel}</b>
      </div>
    </div>
  );
}

function VacancyHistoryPanel({
  history,
}: {
  history: NonNullable<AnalyzeProperty['history']>;
}) {
  const latest = history.scoreTrend[history.scoreTrend.length - 1];
  const first = history.scoreTrend[0];

  return (
    <div className="rr-history-panel">
      <div className="rr-hi-head">
        <div>
          <div className="rr-hi-kicker">매물 기억 데이터</div>
          <h4>점수 흐름과 점유 이탈 이력</h4>
        </div>
        <span className="rr-hi-source">{history.summary.source.startsWith('mock') ? 'MOCK' : 'DATA'}</span>
      </div>
      <div className="rr-hi-grid">
        <div className="rr-hi-card">
          <span>장기 점수 변화</span>
          <b>{first && latest ? `${first.year} → ${latest.year}` : '준비 중'}</b>
          <small>{formatSigned(history.summary.scoreDelta ?? scoreDelta(history.scoreTrend))}p</small>
        </div>
        <div className="rr-hi-card">
          <span>마지막 이탈 시그널</span>
          <b>{history.summary.lastExitReason ?? '이탈 사유 데이터 준비 중'}</b>
        </div>
      </div>
      <div className="rr-hi-trend">
        {history.scoreTrend.map(point => (
          <div key={point.year} className="rr-hi-year">
            <span>{String(point.year).slice(2)}</span>
            <i style={{ height: `${Math.max(16, Math.min(54, point.score * 0.54))}px` }} />
            <b>{Math.round(point.score)}</b>
          </div>
        ))}
      </div>
      <div className="rr-hi-timeline">
        {history.occupancyTimeline.map(event => (
          <div key={event.id} className={`rr-hi-event is-${event.status === 'vacant' ? 'vacant' : 'closed'}`}>
            <div className="rr-hi-event-period">{formatPeriod(event.startedOn, event.endedOn)}</div>
            <div className="rr-hi-event-body">
              <strong>{event.tenantLabel}</strong>
              <span>{event.businessCategory ?? (event.status === 'vacant' ? '공실' : '업종 미상')}</span>
              <em>
                {event.monthlyRent != null ? `월 ${formatMan(event.monthlyRent)}` : '월세 미상'}
                {event.deposit != null ? ` · 보증 ${formatMan(event.deposit)}` : ''}
              </em>
              {event.exitReasonSummary && <p>{event.exitReasonSummary}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreTrendSparkline({
  trend,
  fallbackScore,
}: {
  trend: NonNullable<AnalyzeProperty['history']>['scoreTrend'];
  fallbackScore: number;
}) {
  const points = trend.length > 0 ? trend : [{ year: 2026, score: fallbackScore }];
  const width = 142;
  const height = 42;
  const min = Math.min(...points.map(point => point.score), 55);
  const max = Math.max(...points.map(point => point.score), 90);
  const range = Math.max(1, max - min);
  const line = points.map((point, index) => {
    const x = points.length === 1 ? width - 12 : 8 + (index * (width - 16)) / (points.length - 1);
    const y = height - 7 - ((point.score - min) / range) * (height - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="rr-hp-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="연도별 생존점수 추세">
      <path d={`M 6 ${height - 8} H ${width - 6}`} />
      <polyline points={line} />
      {points.map((point, index) => {
        const [x, y] = line.split(' ')[index].split(',').map(Number);
        return <circle key={point.year} cx={x} cy={y} r={index === points.length - 1 ? 3.5 : 2.3} />;
      })}
    </svg>
  );
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
