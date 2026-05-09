// Analyze page — fullscreen Kakao map + step widget + Top 3 results
//
// Map is the real Kakao Maps JS SDK via `react-kakao-maps-sdk`.
//   - Step 1 picks a 업종, Step 2 lets the user search a place (kakao Places)
//     or right-click to drop a marker. Radius fixed at 500m.
//   - Pressing 분석 calls `POST /analyses` and reveals Top 3 properties
//     overlaid on the map as numbered pins.
//   - Selecting a property opens the right-side detail panel with the four
//     factor visualisations from <FactorCard/>.
import { useEffect, useMemo, useState } from 'react';
import './analyze.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { api, type AreaSearchHit } from '../../api';
import { AreaSearchPanel } from '../../features/analyze/components/AreaSearchPanel';
import { KakaoCanvas } from '../../features/analyze/components/KakaoCanvas';
import {
  DEFAULT_CENTER,
  FALLBACK_BIZ_TYPES,
  FIXED_RADIUS,
  buildCompetitors,
  buildProperties,
  createFallbackArea,
  reverseGeocode,
  type AnalyzeArea,
  type AnalyzePhase,
  type AnalyzeProperty,
  type BizKey,
  type BizType,
} from '../../features/analyze/model';
import {
  useKakaoLoader,
} from 'react-kakao-maps-sdk';

// =============================================================================
//  AnalyzeApp
// =============================================================================
export function Analyze() {
  // Loads kakao SDK once per page; subsequent renders reuse the global script.
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  const [phase, setPhase] = useState<AnalyzePhase>('idle');
  const [bizType, setBizType] = useState<BizKey | null>(null);
  const [bizTypes, setBizTypes] = useState<BizType[]>(FALLBACK_BIZ_TYPES);
  const [area, setArea] = useState<AnalyzeArea | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState(1);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [showMarkers, setShowMarkers] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.catalog.listBusinessTypes()
      .then(types => {
        if (!cancelled && types.length > 0) setBizTypes(types);
      })
      .catch(() => {
        if (!cancelled) setBizTypes(FALLBACK_BIZ_TYPES);
      });
    return () => { cancelled = true; };
  }, []);

  const handleBizSelect = (key: BizKey) => {
    setBizType(key);
    setStep(2);
  };

  // Right-clicking the map drops a pin → reverse-geocode → set Area.
  const handlePickLatLng = async (lat: number, lng: number) => {
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    try {
      const next = await reverseGeocode(lat, lng, bizLabel);
      setArea(next);
      setMapCenter({ lat, lng });
    } catch {
      setArea(createFallbackArea(lat, lng, bizLabel));
    }
  };

  // 검색 결과 클릭도 우클릭과 동일하게 "지점 선택" — 마커 + 반경 원이 바로
  // 그려지고 화면은 panTo 로 부드럽게 이동한다.
  const handleSearchPick = (hit: AreaSearchHit) => {
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    const lat = hit.center.lat;
    const lng = hit.center.lng;
    setArea({
      id: hit.id,
      lat,
      lng,
      radius: FIXED_RADIUS,
      roadAddress: hit.fullName,
      dong: hit.name,
      gu: hit.region,
      displayName: bizLabel ? `${hit.name} ${bizLabel} 입지 분석` : `${hit.name} 일대`,
      regionLabel: hit.name,
    });
    setMapCenter({ lat, lng });
  };

  // Re-label area when biz type changes after a marker is dropped — needs to
  // re-run the reverse-geocode? No — we keep the same coords, just re-derive
  // the displayName label.
  useEffect(() => {
    if (!area) return;
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    setArea(a => a ? {
      ...a,
      displayName: bizLabel ? `${a.regionLabel} ${bizLabel} 입지 분석` : `${a.regionLabel} 일대`,
    } : a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizType]);

  const runAnalysis = async () => {
    if (!bizType || !area) return;
    setPhase('analyzing');
    setShowMarkers(false);
    setMapCenter({ lat: area.lat, lng: area.lng });
    try {
      const result = await api.analyses.create({
        businessType: bizType,
        areaId: area.id,
        center: { lat: area.lat, lng: area.lng },
        radius_m: FIXED_RADIUS,
        road_address: area.roadAddress,
        display_name: area.displayName,
        region: area.dong,
        category: bizTypes.find(b => b.key === bizType)?.label,
        category_emoji: bizTypes.find(b => b.key === bizType)?.emoji,
      });
      setAnalysisId(result.id);
      setPhase('done');
      setShowMarkers(true);
    } catch {
      setPhase('idle');
    }
  };

  const reset = () => {
    setPhase('idle');
    setBizType(null);
    setArea(null);
    setStep(1);
    setShowMarkers(false);
    setMapCenter(DEFAULT_CENTER);
    setAnalysisId(null);
  };

  const selectedBiz = bizTypes.find(b => b.key === bizType);

  // Synthesised demo coords. Memo so the same object reference is shared
  // across renders (avoids unnecessary marker re-mounts).
  const propertiesCenter = area ?? DEFAULT_CENTER;
  const properties = useMemo(
    () => buildProperties(propertiesCenter),
    [propertiesCenter.lat, propertiesCenter.lng],
  );
  const competitors = useMemo(
    () => buildCompetitors(propertiesCenter),
    [propertiesCenter.lat, propertiesCenter.lng],
  );

  return (
    <div className="analyze-shell">
      {sdkError ? (
        <div className="kakao-map" style={{ display: 'grid', placeItems: 'center', color: '#6B7490' }}>
          지도를 불러오지 못했어요. VITE_KAKAO_MAP_KEY 와 사이트 도메인 등록을 확인해주세요.
        </div>
      ) : sdkLoading ? (
        <div className="kakao-map" style={{ display: 'grid', placeItems: 'center', color: '#6B7490' }}>
          지도를 불러오는 중…
        </div>
      ) : (
        <KakaoCanvas
          center={mapCenter}
          area={area}
          properties={properties}
          competitors={competitors}
          showMarkers={showMarkers}
          selected={selected}
          setSelected={setSelected}
          phase={phase}
          step={step}
          bizTypeReady={!!bizType}
          onPickLatLng={handlePickLatLng}
        />
      )}

      <LeftWidget
        phase={phase}
        step={step}
        setStep={setStep}
        bizType={bizType}
        selectedBiz={selectedBiz}
        onBizSelect={handleBizSelect}
        bizTypes={bizTypes}
        area={area}
        onClearArea={() => setArea(null)}
        onSearchPan={handleSearchPick}
        onRun={runAnalysis}
        onReset={reset}
        sdkReady={!sdkLoading && !sdkError}
      />

      {phase === 'done' && (
        <RightResults
          properties={properties}
          selected={selected}
          setSelected={setSelected}
          selectedBiz={selectedBiz}
          area={area}
          analysisId={analysisId}
          onClose={reset}
        />
      )}
    </div>
  );
}

// =============================================================================
//  LeftWidget — step controls + analyzing spinner + done summary
// =============================================================================
type LeftWidgetProps = {
  phase: AnalyzePhase;
  step: 1 | 2;
  setStep: (s: 1 | 2) => void;
  bizType: BizKey | null;
  selectedBiz?: BizType;
  bizTypes: BizType[];
  onBizSelect: (k: BizKey) => void;
  area: AnalyzeArea | null;
  onClearArea: () => void;
  onSearchPan: (place: AreaSearchHit) => void;
  onRun: () => void;
  onReset: () => void;
  sdkReady: boolean;
};

function LeftWidget({ phase, step, setStep, bizType, selectedBiz, bizTypes, onBizSelect, area, onClearArea, onSearchPan, onRun, onReset, sdkReady }: LeftWidgetProps) {
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
              <circle cx="28" cy="28" r="22" fill="none" stroke="url(#lfgrad)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray="138" strokeDashoffset="70" transform="rotate(-90 28 28)" />
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
            <div className="lf-analyzing-sub">반경 {FIXED_RADIUS}m 안에서 입지를 찾고 있어요</div>
          </div>
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

  // idle
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
                {bizTypes.map(t => (
                  <button key={t.key}
                    className={`lf-biz-btn ${bizType === t.key ? 'is-on' : ''}`}
                    onClick={() => onBizSelect(t.key)}>
                    <span style={{ fontSize: 14 }}>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`lf-step ${step === 2 ? 'active' : area ? 'complete' : ''}`}
          style={{ opacity: bizType ? 1 : 0.5, pointerEvents: bizType ? 'auto' : 'none' }}>
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

// =============================================================================
//  RightResults — list pane + expandable detail pane
// =============================================================================
type SaveState = 'idle' | 'saving' | 'saved';

function RightResults({ properties, selected, setSelected, selectedBiz, area, analysisId, onClose }: {
  properties: AnalyzeProperty[];
  selected: number;
  setSelected: (n: number) => void;
  selectedBiz?: BizType;
  area: AnalyzeArea | null;
  analysisId?: string | null;
  onClose: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const sel = properties.find(p => p.rank === selected) || properties[0];

  const handleCardClick = (rank: number) => {
    if (selected === rank && detailOpen) {
      setDetailOpen(false);
    } else {
      setSelected(rank);
      setDetailOpen(true);
    }
  };

  // The analysis was already persisted by `POST /analyses` during runAnalysis,
  // so saving = `PATCH /analyses/:id { saved: true }`.
  const handleSave = async () => {
    if (saveState !== 'idle' || !analysisId) return;
    setSaveState('saving');
    try {
      await api.analyses.patch(analysisId, { saved: true });
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
          <div className="rr-list">
            {properties.map(p => {
              const isSel = p.rank === selected && detailOpen;
              return (
                <div key={p.rank} className={`rr-card ${isSel ? 'is-sel' : ''}`} onClick={() => handleCardClick(p.rank)}>
                  <div className="rr-card-main">
                    <div className={`rr-rank r${p.rank}`}>{p.rank}</div>
                    <div className="rr-info">
                      <div className="rr-addr">{p.addr}</div>
                      <div className="rr-sub">{p.floor} · {p.area}㎡ · 상가</div>
                    </div>
                    <div className="rr-score-box">
                      <div className="rr-score">{p.score}<span className="rr-score-suf">%</span></div>
                      <div className="rr-score-lab">생존율</div>
                    </div>
                  </div>
                  <div className="rr-kpis">
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">월세</div>
                      <div className="rr-kpi-val">{p.rent}<span className="unit">만</span></div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">보증금</div>
                      <div className="rr-kpi-val">{(p.deposit / 1000).toFixed(1)}<span className="unit">천만</span></div>
                    </div>
                    <div className="rr-kpi">
                      <div className="rr-kpi-lab">관리비</div>
                      <div className="rr-kpi-val">{p.mgmt}<span className="unit">만</span></div>
                    </div>
                  </div>
                  {isSel && (
                    <div className="rr-card-footer">
                      <span>주변 상권 상세 보기</span>
                      <Icon name="chevron-right" size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {detailOpen && (
        <div className="rr-detail-pane">
          <PropertyDetail sel={sel} onClose={() => setDetailOpen(false)} />
        </div>
      )}
    </div>
  );
}

function PropertyDetail({ sel, onClose }: { sel: AnalyzeProperty; onClose: () => void }) {
  const factors = buildFactorViz(sel);
  return (
    <>
      <div className="rr-detail-head-bar">
        <button className="rr-detail-back" onClick={onClose}>
          <Icon name="chevron-left" size={14} />
          <span>뒤로</span>
        </button>
        <div className="rr-detail-title">
          <div className="rr-detail-title-main">{sel.addr}</div>
          <div className="rr-detail-title-sub">주변 상권 상세 분석</div>
        </div>
      </div>
      <div className="rr-detail-body">
        {factors.map(f => (
          <FactorCard key={f.key} {...f} />
        ))}
      </div>
    </>
  );
}
