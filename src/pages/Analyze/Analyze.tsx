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
import { api, type AreaSearchHit, type BusinessType } from '../../api';
import {
  Map as KakaoMapView,
  MapMarker,
  Circle,
  CustomOverlayMap,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';

const FIXED_RADIUS = 500;
// Initial map view — 홍대입구역 부근. Used until the user picks a marker
// or the search box pans the map.
const DEFAULT_CENTER = { lat: 37.5572, lng: 126.9237 };

type BizKey = 'korean' | 'cafe' | 'chicken' | 'bunsik' | 'bakery' | 'japanese' | 'bar' | 'western' | 'chinese' | 'fastfood';
type BizType = Pick<BusinessType, 'key' | 'label' | 'emoji'>;

const FALLBACK_BIZ_TYPES: BizType[] = [
  { key: 'korean',   label: '한식당',    emoji: '🍚' },
  { key: 'cafe',     label: '카페',       emoji: '☕' },
  { key: 'chicken',  label: '치킨집',    emoji: '🍗' },
  { key: 'bunsik',   label: '분식점',    emoji: '🍜' },
  { key: 'bakery',   label: '베이커리',  emoji: '🥐' },
  { key: 'japanese', label: '일식',      emoji: '🍣' },
  { key: 'bar',      label: '주점',      emoji: '🍺' },
  { key: 'western',  label: '양식',      emoji: '🍝' },
  { key: 'chinese',  label: '중식',      emoji: '🥢' },
  { key: 'fastfood', label: '패스트푸드', emoji: '🍔' },
];

type Phase = 'idle' | 'analyzing' | 'done';

type Area = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  roadAddress: string;
  dong: string;
  gu: string;
  displayName: string;
  regionLabel: string;
};

type AnalyzeProperty = {
  rank: number;
  addr: string;
  floor: string;
  area: number;
  rent: number;
  deposit: number;
  mgmt: number;
  score: number;
  foot: number;
  comp: number;
  rev: number;
  growth: number;
  // Real lat/lng for placement on the Kakao map. The mock backend doesn't
  // return per-property coordinates yet, so we synthesise them as small
  // offsets around the picked area in `buildProperties`.
  lat: number;
  lng: number;
};

// ---- Reverse-geocode helpers (kakao.maps.services) -------------------------
// Resolves the picked lat/lng into a road address and admin region (행정동/구).
// Both calls are async; we wait for both before returning the Area.
function reverseGeocode(
  lat: number,
  lng: number,
  bizLabel: string,
): Promise<Area> {
  return new Promise(resolve => {
    const geocoder = new kakao.maps.services.Geocoder();
    let dong = '';
    let gu = '';
    let roadAddress = '';
    let pending = 2;
    const finish = () => {
      if (--pending > 0) return;
      const regionLabel = dong || gu || '미지정';
      resolve({
        id: `coord:${lat.toFixed(6)},${lng.toFixed(6)}`,
        lat, lng,
        radius: FIXED_RADIUS,
        roadAddress: roadAddress || `${gu} ${dong}`.trim() || '주소 정보 없음',
        dong: regionLabel,
        gu,
        displayName: bizLabel ? `${regionLabel} ${bizLabel} 입지 분석` : `${regionLabel} 일대`,
        regionLabel,
      });
    };
    geocoder.coord2RegionCode(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const h = result.find(r => r.region_type === 'H') || result[0];
        if (h) {
          dong = h.region_3depth_name || '';
          gu = h.region_2depth_name || '';
        }
      }
      finish();
    });
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        roadAddress = result[0].road_address?.address_name
          || result[0].address?.address_name
          || '';
      }
      finish();
    });
  });
}

// ---- Synthesised demo coords -----------------------------------------------
// Until the backend returns per-property lat/lng, we offset the picked area
// by a few hundred metres so the Top 3 pins land *near* the user's pick
// instead of always at 홍대입구.
const TOP3_OFFSETS: { dLat: number; dLng: number }[] = [
  { dLat: +0.00080, dLng: -0.00060 },
  { dLat: -0.00100, dLng: +0.00040 },
  { dLat: +0.00060, dLng: +0.00120 },
];

const COMPETITOR_OFFSETS: [number, number][] = [
  [-0.00140, -0.00100], [-0.00080, -0.00040], [+0.00020, -0.00120], [+0.00100, -0.00080],
  [-0.00140, +0.00080], [-0.00060, +0.00100], [+0.00120, +0.00140], [-0.00100, +0.00180],
  [+0.00060, -0.00140], [-0.00180, -0.00020], [+0.00160, -0.00060], [+0.00000, +0.00200],
];

const PROPERTY_SEED: Omit<AnalyzeProperty, 'lat' | 'lng'>[] = [
  { rank: 1, addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12 },
  { rank: 2, addr: '동교동 154-8',  floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9  },
  { rank: 3, addr: '서교동 401-3',  floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11 },
];

const buildProperties = (center: { lat: number; lng: number }): AnalyzeProperty[] =>
  PROPERTY_SEED.map((p, i) => ({
    ...p,
    lat: center.lat + TOP3_OFFSETS[i].dLat,
    lng: center.lng + TOP3_OFFSETS[i].dLng,
  }));

const buildCompetitors = (center: { lat: number; lng: number }) =>
  COMPETITOR_OFFSETS.map(([dLat, dLng]) => ({
    lat: center.lat + dLat,
    lng: center.lng + dLng,
  }));

// =============================================================================
//  AnalyzeApp
// =============================================================================
export function Analyze() {
  // Loads kakao SDK once per page; subsequent renders reuse the global script.
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  const [phase, setPhase] = useState<Phase>('idle');
  const [bizType, setBizType] = useState<BizKey | null>(null);
  const [bizTypes, setBizTypes] = useState<BizType[]>(FALLBACK_BIZ_TYPES);
  const [area, setArea] = useState<Area | null>(null);
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
      // Fall back to coords-only Area when geocoding fails.
      setArea({
        lat, lng,
        id: `coord:${lat.toFixed(6)},${lng.toFixed(6)}`,
        radius: FIXED_RADIUS,
        roadAddress: '주소 조회 실패',
        dong: '미지정', gu: '',
        displayName: bizLabel ? `미지정 ${bizLabel} 입지 분석` : '미지정 일대',
        regionLabel: '미지정',
      });
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
  phase: Phase;
  step: 1 | 2;
  setStep: (s: 1 | 2) => void;
  bizType: BizKey | null;
  selectedBiz?: BizType;
  bizTypes: BizType[];
  onBizSelect: (k: BizKey) => void;
  area: Area | null;
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
              <MapPickPanel
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
//  MapPickPanel — keyword search via kakao.maps.services.Places
// =============================================================================
function MapPickPanel({ area, onClearArea, onSearchPan, sdkReady }: {
  area: Area | null;
  onClearArea: () => void;
  onSearchPan: (place: AreaSearchHit) => void;
  sdkReady: boolean;
}) {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<AreaSearchHit[]>([]);

  // Debounced live keyword search. Empty input → clear matches without
  // hitting Kakao (saves quota).
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed || !sdkReady) { setMatches([]); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      api.catalog.searchAreas(trimmed)
        .then(data => {
          if (cancelled) return;
          setMatches(data.slice(0, 6));
        })
        .catch(() => {
        if (cancelled) return;
          setMatches([]);
        });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, sdkReady]);

  const handleSearchClick = (p: AreaSearchHit) => {
    onSearchPan(p);
    setQ('');
  };

  return (
    <>
      <div className="lf-mapsearch">
        <div className="lf-mapsearch-input">
          <span className="lf-mapsearch-icon"><Icon name="search" size={14} /></span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="장소·주소·지하철역 검색"
          />
          {q && (
            <button className="lf-mapsearch-clear" onClick={() => setQ('')}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <ul className="lf-mapsearch-list">
            {matches.map((p, i) => (
              <li key={i} onClick={() => handleSearchClick(p)}>
                <div className="lf-mapsearch-ico"><Icon name="map-pin" size={12} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lf-mapsearch-name">{p.name}</div>
                  <div className="lf-mapsearch-meta">{p.region} · {p.fullName}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length > 0 && matches.length === 0 && (
          <div className="lf-mapsearch-empty">검색 결과가 없어요</div>
        )}
      </div>

      {!area ? (
        <div className="lf-pick-hint">
          <div className="lf-pick-hint-ico"><Icon name="map-pin" size={16} /></div>
          <div className="lf-pick-hint-body">
            <div className="lf-pick-hint-title">지도에서 위치를 찍어주세요</div>
            <div className="lf-pick-hint-sub">
              검색으로 위치를 찾거나, 지도를 드래그해 움직인 뒤<br />
              <b>우클릭</b>으로 분석할 지점을 선택하면 돼요.
            </div>
          </div>
        </div>
      ) : (
        <div className="lf-pick-summary">
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">선택 위치</span>
            <span className="lf-pick-summary-val">{area.roadAddress}</span>
          </div>
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">행정동</span>
            <span className="lf-pick-summary-val">{area.dong}</span>
          </div>
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">분석 반경</span>
            <span className="lf-pick-summary-val">{FIXED_RADIUS}m</span>
          </div>
          <button className="lf-pick-clear" onClick={onClearArea}>
            <Icon name="close" size={11} /> 마커 다시 찍기
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#9AA3BD', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.5 }}>
        <Icon name="info" size={11} />
        도로명 주소·실좌표로 거리 계산 → 반경 {FIXED_RADIUS}m 내 공실매물만 분석해요
      </div>
    </>
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
  area: Area | null;
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

// =============================================================================
//  KakaoCanvas — wraps <Map> with our pick + Top3 overlay markers
// =============================================================================
type KakaoCanvasProps = {
  center: { lat: number; lng: number };
  area: Area | null;
  properties: AnalyzeProperty[];
  competitors: { lat: number; lng: number }[];
  showMarkers: boolean;
  selected: number;
  setSelected: (n: number) => void;
  phase: Phase;
  step: 1 | 2;
  bizTypeReady: boolean;
  onPickLatLng: (lat: number, lng: number) => void;
};

function KakaoCanvas({
  center, area, properties, competitors, showMarkers, selected, setSelected,
  phase, step, bizTypeReady, onPickLatLng,
}: KakaoCanvasProps) {
  const pickEnabled = phase === 'idle' && step === 2 && bizTypeReady;
  return (
    <div className="kakao-map">
      <KakaoMapView
        center={center}
        isPanto
        style={{ width: '100%', height: '100%' }}
        level={4}
        draggable={phase !== 'analyzing'}
        zoomable={phase !== 'analyzing'}
        onRightClick={(_, mouseEvent) => {
          if (!pickEnabled) return;
          const ll = mouseEvent.latLng;
          onPickLatLng(ll.getLat(), ll.getLng());
        }}
      >
        {area && (
          <>
            <Circle
              center={{ lat: area.lat, lng: area.lng }}
              radius={area.radius}
              strokeWeight={2}
              strokeColor="#0A7A5B"
              strokeOpacity={0.85}
              strokeStyle="solid"
              fillColor="#0A7A5B"
              fillOpacity={0.12}
            />
            <MapMarker position={{ lat: area.lat, lng: area.lng }} />
          </>
        )}

        {showMarkers && competitors.map((c, i) => (
          <CustomOverlayMap key={`c${i}`} position={c} yAnchor={0.5} xAnchor={0.5}>
            <div className="km-comp-fade" style={{ animationDelay: `${0.6 + i * 0.05}s` }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <rect x="3" y="3" width="12" height="12" rx="3" fill="#8A92A8" stroke="#fff" strokeWidth="1.5" />
                <rect x="7" y="7" width="4" height="4" fill="#fff" />
              </svg>
            </div>
          </CustomOverlayMap>
        ))}

        {showMarkers && properties.map(p => (
          <CustomOverlayMap
            key={p.rank}
            position={{ lat: p.lat, lng: p.lng }}
            yAnchor={1}
            xAnchor={0.5}
          >
            <NumberedPin
              p={p}
              isSel={p.rank === selected}
              onClick={() => setSelected(p.rank)}
            />
          </CustomOverlayMap>
        ))}
      </KakaoMapView>
    </div>
  );
}

function NumberedPin({ p, isSel, onClick }: { p: AnalyzeProperty; isSel: boolean; onClick: () => void }) {
  const colors = ['#F4B431', '#6B7490', '#D4986B'];
  const c = colors[p.rank - 1] || colors[0];
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <svg
        width="44" height="56" viewBox="0 0 44 56"
        style={{ filter: isSel ? 'drop-shadow(0 6px 12px rgba(0,0,0,.35))' : 'drop-shadow(0 3px 6px rgba(0,0,0,.2))' }}
      >
        <path d="M22 54 Q4 32 4 20 A18 18 0 1 1 40 20 Q40 32 22 54 Z"
          fill={c} stroke="#fff" strokeWidth="2.5" />
        <circle cx="22" cy="20" r="10" fill="#fff" />
        <text x="22" y="25" textAnchor="middle" fill={c} fontSize="14" fontWeight="800">{p.rank}</text>
      </svg>
      {isSel && (
        <div style={{
          position: 'absolute', top: -56, left: '50%', transform: 'translateX(-50%)',
          background: '#0A0E1A', color: '#fff', padding: '8px 12px', borderRadius: 10,
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,.2)',
        }}>
          <div style={{ fontSize: 11 }}>{p.addr}</div>
          <div style={{ fontSize: 10, color: c, fontWeight: 700, marginTop: 2 }}>
            생존율 {p.score}% · 월세 {p.rent}만
          </div>
          <div style={{
            position: 'absolute', bottom: -4, left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 8, height: 8, background: '#0A0E1A',
          }} />
        </div>
      )}
    </div>
  );
}
