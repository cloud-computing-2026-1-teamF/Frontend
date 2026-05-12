import type { AreaSearchHit } from '../../../api';
import { Icon } from '../../../shared/Icon';
import { AreaSearchPanel } from './AreaSearchPanel';
import {
  FIXED_RADIUS,
  MAX_RADIUS,
  MIN_RADIUS,
  RADIUS_STEP,
  type AnalyzeArea,
  type CandidateStatus,
  type AnalyzePhase,
  type BizKey,
  type BizType,
  type VacancyTransactionType,
} from '../model';

type AnalyzeControlPanelProps = {
  phase: AnalyzePhase;
  step: 1 | 2;
  setStep: (step: 1 | 2) => void;
  bizType: BizKey | null;
  selectedBiz?: BizType;
  bizTypes: BizType[];
  onBizSelect: (key: BizKey) => void;
  area: AnalyzeArea | null;
  budget: {
    depositMax: string;
    rentMax: string;
    maintenanceFeeMax: string;
    premiumMax: string;
    salePriceMax: string;
  };
  transactionType: VacancyTransactionType;
  onTransactionTypeChange: (type: VacancyTransactionType) => void;
  onBudgetChange: (key: 'depositMax' | 'rentMax' | 'maintenanceFeeMax' | 'premiumMax' | 'salePriceMax', value: string) => void;
  onClearBudget: () => void;
  onRadiusChange: (radius: number) => void;
  onClearArea: () => void;
  onSearchPan: (place: AreaSearchHit) => void;
  onRun: () => void;
  canRun: boolean;
  candidateStatus: CandidateStatus;
  candidateCount: number;
  candidateError?: string | null;
  onReset: () => void;
  analysisProgress: number;
  analysisStepLabel?: string | null;
  analysisError?: string | null;
};

export function AnalyzeControlPanel({
  phase,
  step,
  setStep,
  bizType,
  selectedBiz,
  bizTypes,
  onBizSelect,
  area,
  budget,
  transactionType,
  onTransactionTypeChange,
  onBudgetChange,
  onClearBudget,
  onRadiusChange,
  onClearArea,
  onSearchPan,
  onRun,
  canRun,
  candidateStatus,
  candidateCount,
  candidateError,
  onReset,
  analysisProgress,
  analysisStepLabel,
  analysisError,
}: AnalyzeControlPanelProps) {
  const activeBudgetFields = budgetFieldsFor(transactionType);
  const budgetCount = activeBudgetFields
    .map(field => budget[field.key])
    .filter(value => value.trim() !== '').length;
  if (phase === 'analyzing') {
    return (
      <div className="lf-widget analyzing">
        <div className="lf-header lf-header-analyzing">
          <div className="lf-title"><b>분석 중</b></div>
        </div>
        <div className="lf-analyzing">
          <div className="lf-analyzing-ring" aria-hidden>
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#F7F8FB" strokeWidth="4" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="url(#lf-analyzing-grad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="138"
                strokeDashoffset="70"
                transform="rotate(-90 28 28)"
              />
              <defs>
                <linearGradient id="lf-analyzing-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F26B2E" />
                  <stop offset="100%" stopColor="#E85D1F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="lf-analyzing-title">{selectedBiz?.emoji} {selectedBiz?.label} · {area?.displayName}</div>
            <div className="lf-analyzing-sub">{analysisStepLabel || `반경 ${area?.radius ?? FIXED_RADIUS}m 안에서 입지를 찾고 있어요`}</div>
            <div className="lf-progress">
              <div className="lf-progress-track">
                <span style={{ width: `${Math.max(0, Math.min(100, analysisProgress))}%` }} />
              </div>
              <div className="lf-progress-meta">
                <span>Backend analysis</span>
                <b>{Math.round(analysisProgress)}%</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="lf-widget">
        <div className="lf-done lf-failed">
          <div className="lf-done-ico"><Icon name="info" size={18} stroke={2.5} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lf-done-title">분석에 실패했어요</div>
            <div className="lf-done-sub">{analysisError || '잠시 후 다시 시도해주세요.'}</div>
          </div>
          <button className="lf-done-reset" onClick={onReset}>다시</button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="lf-widget">
        <div className="lf-done">
          <div className="lf-done-ico"><Icon name="check" size={18} stroke={2.5} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lf-done-title">분석 완료 · Top 3</div>
            <div className="lf-done-sub">{selectedBiz?.emoji} {selectedBiz?.label} · {area?.displayName}</div>
          </div>
          <button className="lf-done-reset" onClick={onReset}>다시</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-widget">
      <div className="lf-header">
        <div className="lf-logo"><Icon name="sparkles" size={16} /></div>
        <div className="lf-title">입지 분석 <b>시작하기</b></div>
      </div>
      <div className="lf-body">
        <div className={`lf-step ${step === 1 ? 'active' : bizType ? 'complete' : ''}`}>
          <div className="lf-step-head" onClick={() => setStep(1)}>
            <div className="lf-step-num">{bizType ? '✓' : 1}</div>
            <div style={{ flex: 1 }}>
              <div className="lf-step-label">분석 업종</div>
              {bizType && step !== 1 && (
                <div className="lf-step-val" style={{ marginTop: 2 }}>
                  {selectedBiz?.emoji} {selectedBiz?.label}
                </div>
              )}
            </div>
            {bizType && step !== 1 && <span className="edit">변경</span>}
          </div>
          {step === 1 && (
            <div className="lf-step-content">
              <div className="lf-biz-grid">
                {bizTypes.map(type => (
                  <button
                    key={type.key}
                    className={`lf-biz-btn ${bizType === type.key ? 'is-on' : ''}`}
                    onClick={() => onBizSelect(type.key)}
                  >
                    <span style={{ fontSize: 14 }}>{type.emoji}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={`lf-step ${step === 2 ? 'active' : area ? 'complete' : ''}`}
          style={{ opacity: bizType ? 1 : 0.5, pointerEvents: bizType ? 'auto' : 'none' }}
        >
          <div className="lf-step-head" onClick={() => bizType && setStep(2)}>
            <div className="lf-step-num">{area ? '✓' : 2}</div>
            <div style={{ flex: 1 }}>
              <div className="lf-step-label">분석 위치 · 반경</div>
              {area && step !== 2 && (
                <div className="lf-step-val" style={{ marginTop: 2 }}>
                  {area.displayName}
                </div>
              )}
            </div>
            {area && step !== 2 && <span className="edit">변경</span>}
          </div>
          {step === 2 && (
            <div className="lf-step-content">
              <AreaSearchPanel
                area={area}
                onClearArea={onClearArea}
                onSearchPan={onSearchPan}
              />
              {area && (
                <div className="lf-radius">
                  <div className="lf-radius-head">
                    <span>분석 반경</span>
                    <b>{area.radius.toLocaleString()}m</b>
                  </div>
                  <input
                    type="range"
                    min={MIN_RADIUS}
                    max={MAX_RADIUS}
                    step={RADIUS_STEP}
                    value={area.radius}
                    onChange={event => onRadiusChange(Number(event.target.value))}
                    aria-label="분석 반경 조절"
                  />
                  <div className="lf-radius-scale">
                    <span>{MIN_RADIUS}m</span>
                    <span>{MAX_RADIUS.toLocaleString()}m</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {bizType && area && (
          <div className={`lf-budget ${budgetCount > 0 ? 'has-values' : ''}`}>
            <div className="lf-budget-head">
              <div>
                <div className="lf-budget-title">거래 유형 · 희망 조건</div>
                <div className="lf-budget-sub">선택한 거래 유형에 필요한 금액만 필터에 적용돼요</div>
              </div>
              {budgetCount > 0 && (
                <button type="button" className="lf-budget-clear" onClick={onClearBudget}>
                  초기화
                </button>
              )}
            </div>
            <div className="lf-transaction-tabs" role="tablist" aria-label="거래 유형">
              {(['임대', '전세', '매매'] as VacancyTransactionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  className={transactionType === type ? 'is-on' : ''}
                  onClick={() => onTransactionTypeChange(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className={`lf-budget-grid fields-${activeBudgetFields.length}`}>
              {activeBudgetFields.map(field => (
                <MoneyField
                  key={field.key}
                  label={field.label}
                  value={budget[field.key]}
                  onChange={value => onBudgetChange(field.key, value)}
                />
              ))}
            </div>
          </div>
        )}

        {bizType && area && (
          <CandidateGate
            status={candidateStatus}
            count={candidateCount}
            radius={area.radius}
            transactionType={transactionType}
            error={candidateError}
          />
        )}

        {bizType && area && (
          <button className="lf-cta" onClick={onRun} disabled={!canRun}>
            <Icon name="sparkles" size={16} />
            {canRun ? '상권 분석하기' : candidateStatus === 'loading' ? '조건 확인 중' : '조건 조정 필요'}
            <Icon name="arrow-right" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="lf-money">
      <span>{label}</span>
      <div className="lf-money-input">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          placeholder="선택"
          onChange={event => onChange(event.target.value.replace(/[^\d]/g, '').slice(0, 7))}
          aria-label={`${label} 최대 금액`}
        />
        <em>만원</em>
      </div>
    </label>
  );
}

type BudgetFieldKey = 'depositMax' | 'rentMax' | 'maintenanceFeeMax' | 'premiumMax' | 'salePriceMax';

function budgetFieldsFor(transactionType: VacancyTransactionType): Array<{ key: BudgetFieldKey; label: string }> {
  if (transactionType === '매매') {
    return [
      { key: 'salePriceMax', label: '매매가' },
      { key: 'maintenanceFeeMax', label: '관리비' },
    ];
  }
  if (transactionType === '전세') {
    return [
      { key: 'depositMax', label: '전세 보증금' },
      { key: 'maintenanceFeeMax', label: '관리비' },
      { key: 'premiumMax', label: '권리금' },
    ];
  }
  return [
    { key: 'depositMax', label: '보증금' },
    { key: 'rentMax', label: '월세' },
    { key: 'maintenanceFeeMax', label: '관리비' },
    { key: 'premiumMax', label: '권리금' },
  ];
}

function CandidateGate({
  status,
  count,
  radius,
  transactionType,
  error,
}: {
  status: CandidateStatus;
  count: number;
  radius: number;
  transactionType: VacancyTransactionType;
  error?: string | null;
}) {
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasMatches = status === 'ok' && count > 0;
  const className = `lf-candidate ${isLoading ? 'is-loading' : isError ? 'is-error' : hasMatches ? 'is-good' : 'is-empty'}`;

  return (
    <div className={className}>
      <div className="lf-candidate-icon">
        <Icon name={isLoading ? 'clock' : hasMatches ? 'check' : 'info'} size={14} />
      </div>
      <div className="lf-candidate-copy">
        <b>
          {isLoading
            ? '조건에 맞는 공실 확인 중'
            : isError
              ? '공실 확인 실패'
              : hasMatches
                ? `${count.toLocaleString()}개 공실이 분석 가능`
                : '조건에 맞는 공실이 없어요'}
        </b>
        <span>
          {isLoading
            ? `반경 ${radius.toLocaleString()}m · ${transactionType} 조건을 반영하고 있어요`
            : isError
              ? error || '잠시 후 다시 시도하거나 조건을 바꿔주세요'
              : hasMatches
                ? '지도 마커를 확인한 뒤 바로 평가를 시작할 수 있어요'
                : '반경을 넓히거나 금액 조건을 완화하면 평가를 시작할 수 있어요'}
        </span>
      </div>
    </div>
  );
}
