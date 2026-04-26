// Analyze page — fullscreen map + step widget + Top 3 results
//
// Migrated from the v1 single-file Analyze.jsx. Behaviour is identical:
//  - Step 1 picks a 업종, Step 2 lets the user search a place / pan the map
//    and right-click to drop a marker (radius fixed at 500m).
//  - Pressing 분석 starts a fake 1.6s spinner, then reveals Top 3 properties.
//  - Selecting a property opens the right-side detail panel with the four
//    factor visualisations from <FactorCard/>.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import './analyze.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { readSavedAnalyses, writeSavedAnalyses, type SavedAnalysis, type Top3Item } from '../../lib/savedAnalyses';

const FIXED_RADIUS = 500;

type BizKey = 'korean' | 'cafe' | 'chicken' | 'bunsik' | 'bakery' | 'japanese' | 'bar' | 'western' | 'chinese' | 'fastfood';
type BizType = { key: BizKey; label: string; emoji: string };

const BIZ_TYPES: BizType[] = [
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
  mx: number; my: number;
  lat: number; lng: number;
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
  x: number;
  y: number;
};

// ---- Mock geo helpers (same as v1, ready to swap for the Kakao SDK) ---------
const MAP_ORIGIN = { lat: 37.5520, lng: 126.9205 };
const SCREEN_DEG_PER_PCT = { lat: -0.0006, lng: 0.0010 };

const screenToLatLng = (mx: number, my: number) => ({
  lat: +(MAP_ORIGIN.lat + (my - 50) * SCREEN_DEG_PER_PCT.lat).toFixed(6),
  lng: +(MAP_ORIGIN.lng + (mx - 50) * SCREEN_DEG_PER_PCT.lng).toFixed(6),
});

type DongRef = { name: string; gu: string; mx: number; my: number };
const DONG_REF: DongRef[] = [
  { name: '역삼1동',  gu: '강남구', mx: 50, my: 40 },
  { name: '역삼2동',  gu: '강남구', mx: 30, my: 70 },
  { name: '대치동',   gu: '강남구', mx: 75, my: 70 },
  { name: '논현1동',  gu: '강남구', mx: 20, my: 25 },
];

const METERS_PER_VW_PCT = 16;

const nearestDong = (mx: number, my: number): DongRef => {
  let best = DONG_REF[0];
  let bestDist = Infinity;
  for (const d of DONG_REF) {
    const dist = Math.hypot(d.mx - mx, d.my - my);
    if (dist < bestDist) { best = d; bestDist = dist; }
  }
  return best;
};

const mockRoadAddress = (mx: number, my: number, dong: DongRef): string => {
  const block = Math.max(1, Math.round(((mx + my) % 100)));
  return `서울 ${dong.gu} ${dong.name} ${block}-${(block * 3) % 30 || 1}`;
};

const buildAreaFromPick = ({ mx, my, bizLabel }: { mx: number; my: number; bizLabel: string }): Area => {
  const dong = nearestDong(mx, my);
  const { lat, lng } = screenToLatLng(mx, my);
  return {
    mx, my, lat, lng,
    radius: FIXED_RADIUS,
    roadAddress: mockRoadAddress(mx, my, dong),
    dong: dong.name,
    gu: dong.gu,
    displayName: bizLabel ? `${dong.name} ${bizLabel} 입지 분석` : `${dong.name} 일대`,
    regionLabel: dong.name,
  };
};

// ---- Saved-analysis helpers (writes to localStorage; History reads from same key) ---
const buildSavedAnalysis = ({
  selectedBiz, area, properties,
}: {
  selectedBiz?: BizType;
  area: Area | null;
  properties: AnalyzeProperty[];
}): SavedAnalysis => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const makeHourly = (peakFoot: number) => {
    const base = [0.15, 0.10, 0.07, 0.06, 0.10, 0.20, 0.35, 0.55, 0.65, 0.70, 0.75, 0.85, 0.95, 1.00, 0.92, 0.86, 0.90, 0.98, 0.92, 0.78, 0.60, 0.46, 0.34, 0.22];
    return base.map(r => Math.round(peakFoot * r));
  };

  const top3: Top3Item[] = properties.map(p => ({
    addr: p.addr, score: p.score, rent: p.rent, deposit: p.deposit, mgmt: p.mgmt,
    area: p.area, floor: p.floor,
    foot: p.foot, comp: p.comp, rev: p.rev, growth: p.growth,
    footHourly: makeHourly(p.foot),
    nearby: { subway: '연동 시 표시', bus: '연동 시 표시', parking: '연동 시 표시' },
  }));

  return {
    id: Date.now(),
    date, time,
    region: area?.dong || area?.regionLabel || '지정되지 않은 지역',
    regionDetail: area?.roadAddress || '',
    radius: FIXED_RADIUS,
    centerLat: area?.lat,
    centerLng: area?.lng,
    displayName: area?.displayName || '',
    category: selectedBiz?.label || '미지정',
    categoryEmoji: selectedBiz?.emoji || '📍',
    budget: '예산 조건 없음',
    topScore: properties[0].score,
    count: properties.length * 40 + 28,
    saved: true,
    top3,
  };
};

// =============================================================================
//  AnalyzeApp
// =============================================================================
export function Analyze() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [bizType, setBizType] = useState<BizKey | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState(1);
  const [mapCenter, setMapCenter] = useState({ x: 0.5, y: 0.5 });
  const [showMarkers, setShowMarkers] = useState(false);

  const handleBizSelect = (key: BizKey) => {
    setBizType(key);
    setStep(2);
  };

  const handlePickMarker = (mx: number, my: number) => {
    const bizLabel = BIZ_TYPES.find(b => b.key === bizType)?.label || '';
    setArea(buildAreaFromPick({ mx, my, bizLabel }));
  };

  const handleSearchPan = (place: { mx: number; my: number }) => {
    setMapCenter({ x: place.mx / 100, y: place.my / 100 });
  };

  // Re-label area when biz type changes after a marker is dropped
  useEffect(() => {
    if (!area) return;
    const bizLabel = BIZ_TYPES.find(b => b.key === bizType)?.label || '';
    setArea(buildAreaFromPick({ mx: area.mx, my: area.my, bizLabel }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizType]);

  const runAnalysis = () => {
    setPhase('analyzing');
    setShowMarkers(false);
    if (area) {
      setTimeout(() => setMapCenter({ x: area.mx / 100, y: area.my / 100 }), 100);
    }
    setTimeout(() => {
      setPhase('done');
      setShowMarkers(true);
    }, 1600);
  };

  const reset = () => {
    setPhase('idle');
    setBizType(null);
    setArea(null);
    setStep(1);
    setShowMarkers(false);
    setMapCenter({ x: 0.5, y: 0.5 });
  };

  const selectedBiz = BIZ_TYPES.find(b => b.key === bizType);

  const properties: AnalyzeProperty[] = [
    { rank: 1, addr: '서교동 367-12', floor: '1F', area: 33.5, rent: 280, deposit: 3000, mgmt: 15, score: 92, foot: 9200, comp: 3, rev: 1850, growth: 12, x: 52, y: 42 },
    { rank: 2, addr: '동교동 154-8',  floor: '1F', area: 28.0, rent: 245, deposit: 2500, mgmt: 12, score: 86, foot: 7800, comp: 5, rev: 1640, growth: 9,  x: 38, y: 55 },
    { rank: 3, addr: '서교동 401-3',  floor: 'B1', area: 42.0, rent: 210, deposit: 2000, mgmt: 10, score: 79, foot: 6400, comp: 4, rev: 1380, growth: 11, x: 64, y: 58 },
  ];

  const competitors = [
    { x: 30, y: 35 }, { x: 44, y: 46 }, { x: 58, y: 38 }, { x: 68, y: 48 },
    { x: 28, y: 60 }, { x: 48, y: 62 }, { x: 72, y: 65 }, { x: 36, y: 70 },
    { x: 60, y: 30 }, { x: 22, y: 48 }, { x: 78, y: 42 }, { x: 50, y: 72 },
  ];

  return (
    <div className="analyze-shell">
      <KakaoMap
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
        onPickMarker={handlePickMarker}
      />

      <LeftWidget
        phase={phase}
        step={step}
        setStep={setStep}
        bizType={bizType}
        selectedBiz={selectedBiz}
        onBizSelect={handleBizSelect}
        area={area}
        onClearArea={() => setArea(null)}
        onSearchPan={handleSearchPan}
        onRun={runAnalysis}
        onReset={reset}
      />

      {phase === 'done' && (
        <RightResults
          properties={properties}
          selected={selected}
          setSelected={setSelected}
          selectedBiz={selectedBiz}
          area={area}
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
  onBizSelect: (k: BizKey) => void;
  area: Area | null;
  onClearArea: () => void;
  onSearchPan: (place: { mx: number; my: number }) => void;
  onRun: () => void;
  onReset: () => void;
};

function LeftWidget({ phase, step, setStep, bizType, selectedBiz, onBizSelect, area, onClearArea, onSearchPan, onRun, onReset }: LeftWidgetProps) {
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
                {BIZ_TYPES.map(t => (
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
              <MapPickPanel area={area} onClearArea={onClearArea} onSearchPan={onSearchPan} />
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
//  MapPickPanel — search box + pick summary
// =============================================================================
type SearchPlace = { name: string; address: string; category: string; mx: number; my: number };

const SEARCH_PLACES: SearchPlace[] = [
  { name: '역삼역',                          address: '서울 강남구 역삼동 825',  category: '지하철역', mx: 50, my: 42 },
  { name: '강남역',                          address: '서울 강남구 역삼동',      category: '지하철역', mx: 12, my: 45 },
  { name: '선릉역',                          address: '서울 강남구 역삼동 678',  category: '지하철역', mx: 88, my: 36 },
  { name: 'AC호텔 바이 메리어트 서울 강남',  address: '서울 강남구 역삼동',      category: '호텔',     mx: 35, my: 32 },
  { name: 'GS강남타워',                      address: '서울 강남구 역삼동',      category: '빌딩',     mx: 60, my: 16 },
  { name: '강남세브란스 셔틀버스 승강장',    address: '서울 강남구 역삼동',      category: '버스',     mx: 76, my: 36 },
  { name: '카페413 프로젝트',                address: '서울 강남구 역삼동',      category: '카페',     mx: 18, my: 8  },
  { name: '스타벅스 역삼점',                 address: '서울 강남구 역삼동',      category: '카페',     mx: 22, my: 67 },
  { name: '국기원',                          address: '서울 강남구 역삼동',      category: '관광',     mx: 50, my: 50 },
  { name: '서교동',                          address: '서울 마포구 서교동',      category: '동네',     mx: 31, my: 62 },
  { name: '연남동',                          address: '서울 마포구 연남동',      category: '동네',     mx: 26, my: 31 },
  { name: '홍대입구역',                      address: '서울 마포구 양화로 지하 160', category: '지하철역', mx: 49, my: 51 },
];

function MapPickPanel({ area, onClearArea, onSearchPan }: {
  area: Area | null;
  onClearArea: () => void;
  onSearchPan: (place: { mx: number; my: number }) => void;
}) {
  const [q, setQ] = useState('');
  const trimmed = q.trim();
  const matches = trimmed.length === 0 ? [] :
    SEARCH_PLACES.filter(p =>
      p.name.includes(trimmed) || p.address.includes(trimmed) || p.category.includes(trimmed)
    ).slice(0, 6);

  const handleSearchClick = (p: SearchPlace) => {
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
                  <div className="lf-mapsearch-meta">{p.category} · {p.address}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {trimmed.length > 0 && matches.length === 0 && (
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
        도로명 주소·X/Y 좌표로 거리 계산 → 반경 {FIXED_RADIUS}m 내 공실매물만 분석해요
      </div>
    </>
  );
}

// =============================================================================
//  RightResults — list pane + expandable detail pane
// =============================================================================
type SaveState = 'idle' | 'saving' | 'saved';

function RightResults({ properties, selected, setSelected, selectedBiz, area, onClose }: {
  properties: AnalyzeProperty[];
  selected: number;
  setSelected: (n: number) => void;
  selectedBiz?: BizType;
  area: Area | null;
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

  const handleSave = () => {
    if (saveState !== 'idle') return;
    setSaveState('saving');
    const item = buildSavedAnalysis({ selectedBiz, area, properties });
    const existing = readSavedAnalyses();
    writeSavedAnalyses([item, ...existing]);
    setTimeout(() => setSaveState('saved'), 250);
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
//  KakaoMap — drag-to-pan, right-click marker, radius circle, top-3 markers
// =============================================================================
type KakaoMapProps = {
  center: { x: number; y: number };
  area: Area | null;
  properties: AnalyzeProperty[];
  competitors: { x: number; y: number }[];
  showMarkers: boolean;
  selected: number;
  setSelected: (n: number) => void;
  phase: Phase;
  step: 1 | 2;
  bizTypeReady: boolean;
  onPickMarker: (mx: number, my: number) => void;
};

function KakaoMap({ center, area, properties, competitors, showMarkers, selected, setSelected, phase, step, bizTypeReady, onPickMarker }: KakaoMapProps) {
  const [zoom, setZoom] = useState(15);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });

  const autoPanX = (0.5 - center.x) * 100;
  const autoPanY = (0.5 - center.y) * 100;
  const panX = autoPanX + drag.x;
  const panY = autoPanY + drag.y;

  const evToPct = (e: MouseEvent) => {
    const rect = mapRef.current!.getBoundingClientRect();
    return {
      mx: ((e.clientX - rect.left) / rect.width) * 100,
      my: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (phase !== 'idle' || step !== 2 || !bizTypeReady) return;
    const { mx, my } = evToPct(e);
    onPickMarker(mx, my);
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || phase !== 'idle') return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: drag.x, baseY: drag.y };
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    setDrag({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };
  const handleMouseUp = () => { dragRef.current = null; };

  const radiusPct = area ? (FIXED_RADIUS / METERS_PER_VW_PCT) : 0;

  return (
    <div className="kakao-map"
      ref={mapRef}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: phase === 'idle' ? (dragRef.current ? 'grabbing' : 'grab') : 'default' }}>
      <div className="kakao-map-inner" style={{ transform: `translate(${panX}px, ${panY}px) scale(${1 + (zoom - 15) * 0.05})` }}>
        <MapBackground />
      </div>

      {area && (
        <>
          <div className="km-radius"
            style={{
              left: `${area.mx}%`, top: `${area.my}%`,
              width: `${radiusPct * 2}%`, height: `${radiusPct * 2}%`,
            }}>
            <span className="km-radius-lab">반경 {FIXED_RADIUS}m</span>
          </div>
          <div className="km-pin" style={{ left: `${area.mx}%`, top: `${area.my}%` }}>
            <svg width="36" height="46" viewBox="0 0 36 46">
              <path d="M18 44 Q3 26 3 16 A15 15 0 1 1 33 16 Q33 26 18 44 Z"
                fill="#0A7A5B" stroke="#fff" strokeWidth="2.5" />
              <circle cx="18" cy="16" r="6" fill="#fff" />
            </svg>
          </div>
        </>
      )}

      {showMarkers && (
        <>
          {competitors.map((c, i) => (
            <div key={`c${i}`}
              className="km-comp-fade"
              style={{
                position: 'absolute',
                left: `${c.x}%`, top: `${c.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                animationDelay: `${0.6 + i * 0.05}s`,
              }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <rect x="3" y="3" width="12" height="12" rx="3" fill="#8A92A8" stroke="#fff" strokeWidth="1.5" />
                <rect x="7" y="7" width="4" height="4" fill="#fff" />
              </svg>
            </div>
          ))}
          {properties.map(p => {
            const colors = ['#F4B431', '#6B7490', '#D4986B'];
            const isSel = p.rank === selected;
            return (
              <div key={p.rank}
                className={`km-marker km-marker-drop d${p.rank}`}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`, top: `${p.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: isSel ? 6 : 4,
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(p.rank)}>
                {isSel && (
                  <div style={{
                    position: 'absolute', left: '50%', bottom: '-6px',
                    transform: 'translate(-50%, 50%)',
                    width: 50, height: 50, borderRadius: '50%',
                    background: colors[p.rank - 1], opacity: 0.15,
                    animation: 'pulse 1.4s infinite',
                  }} />
                )}
                <svg width="44" height="56" viewBox="0 0 44 56" style={{ filter: isSel ? 'drop-shadow(0 6px 12px rgba(0,0,0,.35))' : 'drop-shadow(0 3px 6px rgba(0,0,0,.2))' }}>
                  <path d="M22 54 Q4 32 4 20 A18 18 0 1 1 40 20 Q40 32 22 54 Z"
                    fill={colors[p.rank - 1]} stroke="#fff" strokeWidth="2.5" />
                  <circle cx="22" cy="20" r="10" fill="#fff" />
                  <text x="22" y="25" textAnchor="middle" fill={colors[p.rank - 1]} fontSize="14" fontWeight="800">{p.rank}</text>
                </svg>
                <div style={{
                  position: 'absolute',
                  top: -56, left: '50%', transform: 'translateX(-50%)',
                  background: '#0A0E1A', color: '#fff',
                  padding: '8px 12px', borderRadius: 10,
                  fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                  display: isSel ? 'block' : 'none',
                }}>
                  <div style={{ fontSize: 11 }}>{p.addr}</div>
                  <div style={{ fontSize: 10, color: colors[p.rank - 1], fontWeight: 700, marginTop: 2 }}>
                    생존율 {p.score}% · 월세 {p.rent}만
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 8, height: 8, background: '#0A0E1A',
                  }} />
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="km-zoom">
        <button onClick={() => setZoom(z => Math.min(z + 1, 20))}>+</button>
        <button onClick={() => setZoom(z => Math.max(z - 1, 10))}>−</button>
      </div>
      <div className="km-attribution">© Kakao Corp. · 지도 제공 Kakao</div>
    </div>
  );
}

// Basemap: prefer the user-supplied capture, fall back to the stylised SVG.
function MapBackground() {
  const [imgFailed, setImgFailed] = useState(false);
  if (imgFailed) return <KakaoMapSVG />;
  return (
    <img
      src="/uploads/map-base.png"
      alt=""
      draggable={false}
      onError={() => setImgFailed(true)}
      style={{
        width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center',
        display: 'block',
        userSelect: 'none', pointerEvents: 'none',
      }}
    />
  );
}

function KakaoMapSVG() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
      <defs>
        <pattern id="kmgrid" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M120 0H0v120" fill="none" stroke="#E8E2D3" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="#F4EEE3" />
      <rect width="1600" height="900" fill="url(#kmgrid)" opacity="0.5" />
      <path d="M0 820 Q300 790 600 810 T1200 800 T1600 790 L1600 900 L0 900 Z" fill="#BFD8EA" />
      <text x="700" y="870" fontSize="20" fill="#3B6FE8" fontStyle="italic" fontWeight="600">한강</text>
      <ellipse cx="200" cy="180" rx="140" ry="90" fill="#D9EAD0" stroke="#C0DCB0" strokeWidth="1.5" />
      <text x="150" y="185" fontSize="14" fill="#5E8345" fontWeight="600">경의선숲길</text>
      <circle cx="1380" cy="720" r="110" fill="#D9EAD0" stroke="#C0DCB0" strokeWidth="1.5" />
      <text x="1320" y="725" fontSize="13" fill="#5E8345" fontWeight="600">망원한강공원</text>
      <ellipse cx="1100" cy="150" rx="90" ry="60" fill="#D9EAD0" stroke="#C0DCB0" strokeWidth="1.5" />
      <text x="1060" y="155" fontSize="12" fill="#5E8345" fontWeight="600">월드컵공원</text>
      <path d="M0 450 Q500 440 800 460 T1600 440" stroke="#FFDD5E" strokeWidth="24" fill="none" />
      <path d="M0 450 Q500 440 800 460 T1600 440" stroke="#F4C842" strokeWidth="1" fill="none" />
      <path d="M680 0 Q720 350 780 500 T900 900" stroke="#FFDD5E" strokeWidth="20" fill="none" />
      <path d="M1100 0 Q1120 300 1150 550 T1200 900" stroke="#FFDD5E" strokeWidth="18" fill="none" />
      <path d="M0 250 L1600 280" stroke="#fff" strokeWidth="10" fill="none" />
      <path d="M0 640 L1600 620" stroke="#fff" strokeWidth="8" fill="none" />
      <path d="M300 0 L320 900" stroke="#fff" strokeWidth="8" fill="none" />
      <path d="M500 0 L520 900" stroke="#fff" strokeWidth="7" fill="none" />
      <path d="M900 0 L920 900" stroke="#fff" strokeWidth="7" fill="none" />
      <path d="M1400 0 L1420 900" stroke="#fff" strokeWidth="6" fill="none" />
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (i % 8) * 200 + 40;
        const y = Math.floor(i / 8) * 180 + 60;
        const w = 80 + (i % 3) * 30;
        const h = 60 + (i % 4) * 20;
        return (
          <g key={i} opacity="0.7">
            <rect x={x} y={y} width={w} height={h} rx="3" fill="#EDE5D4" stroke="#D8CFB8" strokeWidth="0.8" />
          </g>
        );
      })}
      <g fill="#4A5472" fontSize="16" fontWeight="600" opacity="0.7">
        <text x="180" y="560">합정동</text>
        <text x="500" y="560">서교동</text>
        <text x="780" y="560">동교동</text>
        <text x="420" y="280">연남동</text>
        <text x="1080" y="560">신촌동</text>
        <text x="1280" y="340">아현동</text>
      </g>
      <path d="M0 460 Q500 450 800 470 T1600 450" stroke="#2DB400" strokeWidth="5" fill="none" opacity="0.9" />
      <g>
        <rect x="762" y="448" width="22" height="22" rx="4" fill="#2DB400" />
        <text x="773" y="464" fontSize="13" fill="#fff" fontWeight="700" textAnchor="middle">2</text>
        <rect x="792" y="480" width="120" height="22" rx="4" fill="#fff" stroke="#D0D5E0" strokeWidth="1" />
        <text x="800" y="496" fontSize="13" fill="#0A0E1A" fontWeight="700">홍대입구</text>
      </g>
      <g>
        <circle cx="220" cy="459" r="10" fill="#fff" stroke="#2DB400" strokeWidth="3" />
        <text x="190" y="488" fontSize="13" fill="#0A0E1A" fontWeight="700">합정</text>
      </g>
      <g>
        <circle cx="1200" cy="455" r="10" fill="#fff" stroke="#2DB400" strokeWidth="3" />
        <text x="1180" y="484" fontSize="13" fill="#0A0E1A" fontWeight="700">신촌</text>
      </g>
      <g>
        <circle cx="1460" cy="448" r="10" fill="#fff" stroke="#2DB400" strokeWidth="3" />
        <text x="1440" y="477" fontSize="13" fill="#0A0E1A" fontWeight="700">이대</text>
      </g>
    </svg>
  );
}
