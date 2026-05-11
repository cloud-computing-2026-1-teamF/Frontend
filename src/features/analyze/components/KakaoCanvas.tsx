import {
  Circle,
  CustomOverlayMap,
  Map as KakaoMapView,
  MapMarker,
} from 'react-kakao-maps-sdk';
import type { AnalyzeArea, AnalyzePhase, AnalyzeProperty } from '../model';

type KakaoCanvasProps = {
  center: { lat: number; lng: number };
  area: AnalyzeArea | null;
  properties: AnalyzeProperty[];
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
            {/* Hide the default Kakao pin once the recommendation markers are up — the
                blue marker otherwise sits on top of the numbered pins (different render
                layer than CustomOverlayMap) and obscures whichever rank shares the
                center coordinate. */}
            {!showMarkers && <MapMarker position={{ lat: area.lat, lng: area.lng }} />}
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
  // Selected pin grows ~25% and gets a high-contrast white halo + black ring
  // so it pops even when the other two pins share a nearby coordinate.
  const dim = isSel ? { w: 56, h: 72 } : { w: 44, h: 56 };
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        position: 'relative',
        transform: isSel ? 'translateY(-4px)' : 'none',
        transition: 'transform 160ms ease',
        zIndex: isSel ? 2 : 1,
      }}
    >
      <svg
        width={dim.w} height={dim.h} viewBox="0 0 44 56"
        style={{ filter: isSel ? 'drop-shadow(0 8px 16px rgba(0,0,0,.4))' : 'drop-shadow(0 3px 6px rgba(0,0,0,.2))' }}
      >
        {isSel && (
          <path
            d="M22 54 Q4 32 4 20 A18 18 0 1 1 40 20 Q40 32 22 54 Z"
            fill="none"
            stroke="#0A0E1A"
            strokeWidth="5"
          />
        )}
        <path
          d="M22 54 Q4 32 4 20 A18 18 0 1 1 40 20 Q40 32 22 54 Z"
          fill={c}
          stroke="#fff"
          strokeWidth={isSel ? '3' : '2.5'}
        />
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
