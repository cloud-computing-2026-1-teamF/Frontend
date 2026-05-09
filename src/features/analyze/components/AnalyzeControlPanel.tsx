import type { AreaSearchHit } from '../../../api';
import { Icon } from '../../../shared/Icon';
import { AreaSearchPanel } from './AreaSearchPanel';
import {
  FIXED_RADIUS,
  type AnalyzeArea,
  type AnalyzePhase,
  type BizKey,
  type BizType,
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
  onClearArea: () => void;
  onSearchPan: (place: AreaSearchHit) => void;
  onRun: () => void;
  onReset: () => void;
  sdkReady: boolean;
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
  onClearArea,
  onSearchPan,
  onRun,
  onReset,
  sdkReady,
  analysisProgress,
  analysisStepLabel,
  analysisError,
}: AnalyzeControlPanelProps) {
  if (phase === 'analyzing') {
    return (
      <div className="lf-widget analyzing">
        <div className="lf-header">
          <div className="lf-logo"><Icon name="sparkles" size={16} /></div>
          <div className="lf-title"><b>분석 중</b></div>
        </div>
        <div className="lf-analyzing">
          <div className="lf-analyzing-ring">
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#F7F8FB" strokeWidth="4" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="url(#lfgrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="138"
                strokeDashoffset="70"
                transform="rotate(-90 28 28)"
              />
              <defs>
                <linearGradient id="lfgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F26B2E" />
                  <stop offset="100%" stopColor="#E85D1F" />
                </linearGradient>
              </defs>
            </svg>
            <div className="inner"><Icon name="cpu" size={20} stroke={2} /></div>
          </div>
          <div>
            <div className="lf-analyzing-title">{selectedBiz?.emoji} {selectedBiz?.label} · {area?.displayName}</div>
            <div className="lf-analyzing-sub">{analysisStepLabel || `반경 ${FIXED_RADIUS}m 안에서 입지를 찾고 있어요`}</div>
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
                sdkReady={sdkReady}
              />
            </div>
          )}
        </div>

        {bizType && area && (
          <button className="lf-cta" onClick={onRun}>
            <Icon name="sparkles" size={16} />
            상권 분석하기
            <Icon name="arrow-right" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
