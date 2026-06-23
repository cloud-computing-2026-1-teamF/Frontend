import {
  Circle,
  CustomOverlayMap,
  Map as KakaoMapView,
  MapMarker,
} from 'react-kakao-maps-sdk';
import type { AnalyzeArea, AnalyzePhase, AnalyzeProperty, CandidateStatus } from '../model';

type KakaoCanvasProps = {
  center: { lat: number; lng: number };
  area: AnalyzeArea | null;
  properties: AnalyzeProperty[];
  candidateProperties: AnalyzeProperty[];
  candidateStatus: CandidateStatus;
  competitors: { lat: number; lng: number }[];
  showMarkers: boolean;
  selected: number;
  setSelected: (n: number) => void;
  phase: AnalyzePhase;
  step: 1 | 2;
  bizTypeReady: boolean;
  onPickLatLng: (lat: number, lng: number) => void;
};

export function KakaoCanvas({
  center, area, properties, candidateProperties, candidateStatus, competitors, showMarkers, selected, setSelected,
  phase, step, bizTypeReady, onPickLatLng,
}: KakaoCanvasProps) {
  const pickEnabled = phase === 'idle' && step === 2 && bizTypeReady;
  const showCandidateMarkers = phase === 'idle' && candidateStatus === 'ok' && candidateProperties.length > 0;
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
            {/* Hide the default Kakao pin once the recommendation markers are up — the
                blue marker otherwise sits on top of the numbered pins (different render
                layer than CustomOverlayMap) and obscures whichever rank shares the
                center coordinate. */}
            {!showMarkers && <MapMarker position={{ lat: area.lat, lng: area.lng }} />}
          </>
        )}

        {showCandidateMarkers && candidateProperties.map((p) => (
          <CustomOverlayMap
            key={p.vacancyId ?? `candidate-${p.rank}`}
            position={{ lat: p.lat, lng: p.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            <CandidateDot property={p} dense={candidateProperties.length > 60} />
          </CustomOverlayMap>
        ))}

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

        {showMarkers && spreadDuplicates(properties).map(({ p, lat, lng }) => (
          <CustomOverlayMap
            key={p.rank}
            position={{ lat, lng }}
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

function CandidateDot({ property, dense }: { property: AnalyzeProperty; dense: boolean }) {
  const recommended = property.recommended !== false;
  const size = dense ? 9 : 12;
  const title = `${property.addr} · 3년 생존율 ${property.score}%`;
  return (
    <div
      className={`km-candidate-dot ${recommended ? 'is-recommended' : 'is-caution'}`}
      title={title}
      style={{ width: size, height: size }}
    />
  );
}

function NumberedPin({ p, isSel, onClick }: { p: AnalyzeProperty; isSel: boolean; onClick: () => void }) {
  const colors = ['#F4B431', '#6B7490', '#D4986B'];
  const recommended = p.recommended !== false;
  const c = recommended ? (colors[p.rank - 1] || colors[0]) : '#6B7490';
  // Rewritten as a plain styled div instead of an SVG teardrop. The previous
  // SVG version rendered fine in dev but consistently disappeared for
  // unselected pins in the deployed Kakao Maps overlay layer (likely due to a
  // viewBox/clipping interaction with CustomOverlayMap). A simple sized div
  // with a colored circular badge is reliably visible at every zoom level.
  const size = isSel ? 52 : 40;
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: c,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isSel ? 22 : 17,
        fontWeight: 800,
        border: isSel ? '4px solid #0A0E1A' : '3px solid #fff',
        boxShadow: isSel
          ? '0 8px 18px rgba(0,0,0,0.45), 0 0 0 4px rgba(255,255,255,0.95)'
          : '0 4px 10px rgba(0,0,0,0.3)',
        transform: isSel ? 'translateY(-4px)' : 'none',
        transition: 'all 160ms ease',
        zIndex: isSel ? 10 : 4,
        userSelect: 'none',
      }}
    >
      {p.rank}
      {isSel && (
        <div style={{
          position: 'absolute', top: -56, left: '50%', transform: 'translateX(-50%)',
          background: '#0A0E1A', color: '#fff', padding: '8px 12px', borderRadius: 10,
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,.2)',
        }}>
          <div style={{ fontSize: 11 }}>{p.addr}</div>
          <div style={{ fontSize: 10, color: c, fontWeight: 700, marginTop: 2 }}>
            {recommended ? '추천' : '비추천'} · 3년 생존율 {p.score}% · 월세 {p.rent}만
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

// Backend recommendations can share lat/lng (multiple vacancies inside the
// same building) or sit within a couple meters of each other. Without
// spreading them out they read as a single marker on the map even though the
// side panel shows three results.
//
// We bucket near-duplicates at ~25m precision (≈ rounded to 4 decimals at
// Seoul's latitude) and push the duplicates onto a triangle whose vertices
// are ~40-55m off the base point. That keeps the pins inside the same block
// while making each rank visually distinct at the analyze page's zoom 4
// (~5 m / pixel — 50m is ~10 pixels of gap, more than enough).
const COORD_KEY_PRECISION = 4;
const SPREAD_OFFSETS: ReadonlyArray<{ dLat: number; dLng: number }> = [
  { dLat: 0, dLng: 0 },
  { dLat: 0.00045, dLng: 0.00045 },
  { dLat: -0.00045, dLng: 0.00045 },
  { dLat: 0.00045, dLng: -0.00045 },
];

function spreadDuplicates(properties: AnalyzeProperty[]): Array<{
  p: AnalyzeProperty;
  lat: number;
  lng: number;
}> {
  const seen = new Map<string, number>();
  return properties.map(p => {
    const key = `${p.lat.toFixed(COORD_KEY_PRECISION)},${p.lng.toFixed(COORD_KEY_PRECISION)}`;
    const dupIndex = seen.get(key) ?? 0;
    seen.set(key, dupIndex + 1);
    const offset = SPREAD_OFFSETS[dupIndex] ?? SPREAD_OFFSETS[SPREAD_OFFSETS.length - 1];
    return { p, lat: p.lat + offset.dLat, lng: p.lng + offset.dLng };
  });
}
