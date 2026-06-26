/// <reference types="kakao.maps.d.ts" />
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CustomOverlayMap,
  Map as KakaoMapView,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import { Icon } from '../../../shared/Icon';
import '../../../shared/roadview.css';

export type Top3Point = {
  id: string;
  rank: number;
  score: number;
  title: string;
  lat?: number | null;
  lng?: number | null;
  /** lat/lng가 없을 때 주소→좌표 변환에 쓸 검색어 */
  geocodeQuery: string;
};

export type LatLng = { lat: number; lng: number };

type Top3LocationMapProps = {
  points: Top3Point[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** 해석된 좌표(좌표 그대로 또는 지오코딩 결과)를 부모에 전달 — 로드뷰 모달이 사용 */
  onResolved: (coords: Array<LatLng | null>) => void;
  onOpenRoadview: () => void;
};

const SEOUL_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };

export function Top3LocationMap({
  points,
  selectedIndex,
  onSelect,
  onResolved,
  onOpenRoadview,
}: Top3LocationMapProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  // 좌표가 이미 있으면 그대로, 없으면 null로 시작 → 지오코딩으로 채운다.
  const [coords, setCoords] = useState<Array<LatLng | null>>(() =>
    points.map(p =>
      typeof p.lat === 'number' && typeof p.lng === 'number'
        ? { lat: p.lat, lng: p.lng }
        : null,
    ),
  );

  // points가 바뀌면 좌표 상태를 다시 시드한다.
  const pointsKey = points.map(p => `${p.id}:${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    setCoords(
      points.map(p =>
        typeof p.lat === 'number' && typeof p.lng === 'number'
          ? { lat: p.lat, lng: p.lng }
          : null,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  // 좌표가 비어 있는 항목을 주소로 지오코딩한다.
  useEffect(() => {
    if (sdkLoading || sdkError) return;
    const kakao = window.kakao;
    if (!kakao?.maps?.services) return;
    const geocoder = new kakao.maps.services.Geocoder();
    points.forEach((p, index) => {
      if (coords[index]) return;
      if (!p.geocodeQuery) return;
      geocoder.addressSearch(p.geocodeQuery, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const lat = Number(result[0].y);
          const lng = Number(result[0].x);
          setCoords(prev => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = { lat, lng };
            return next;
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkLoading, sdkError, pointsKey, coords]);

  // 해석된 좌표를 부모로 올린다(로드뷰 모달이 선택 항목 좌표를 사용).
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;
  useEffect(() => {
    onResolvedRef.current(coords);
  }, [coords]);

  const resolved = coords.filter((c): c is LatLng => c !== null);
  const center = useMemo<LatLng>(() => {
    const sel = coords[selectedIndex];
    if (sel) return sel;
    if (resolved.length) return resolved[0];
    return SEOUL_CENTER;
  }, [coords, selectedIndex, resolved]);

  const selectedHasCoord = !!coords[selectedIndex];

  return (
    <div className="t3-rv">
      <div className="t3-rv-map">
        {sdkLoading && <div className="t3-rv-state">카카오 지도를 불러오는 중…</div>}
        {sdkError && (
          <div className="t3-rv-state">카카오 지도를 불러오지 못했어요. VITE_KAKAO_MAP_KEY 를 확인해주세요.</div>
        )}
        {!sdkLoading && !sdkError && resolved.length === 0 && (
          <div className="t3-rv-state">매물 위치를 찾는 중…</div>
        )}
        {!sdkLoading && !sdkError && resolved.length > 0 && (
          <KakaoMapView center={center} isPanto level={5} style={{ width: '100%', height: '100%' }} draggable zoomable>
            {points.map((p, index) => {
              const c = coords[index];
              if (!c) return null;
              const isSel = index === selectedIndex;
              return (
                <CustomOverlayMap key={p.id} position={c} yAnchor={1} xAnchor={0.5} zIndex={isSel ? 6 : 3}>
                  <button
                    type="button"
                    className={`t3-rv-marker r${p.rank} ${isSel ? 'is-sel' : ''}`}
                    onClick={() => onSelect(index)}
                    title={p.title}
                  >
                    <span className="t3-rv-bubble">
                      <span className="t3-rv-rank">{p.rank}</span>
                      {Math.round(p.score)}점
                    </span>
                    <span className="t3-rv-tail" aria-hidden="true" />
                    <span className="t3-rv-dot" aria-hidden="true" />
                  </button>
                </CustomOverlayMap>
              );
            })}
          </KakaoMapView>
        )}
      </div>
      <div className="t3-rv-actions">
        <span className="t3-rv-hint">지도의 핀을 눌러 매물을 고르고, 로드뷰로 외부 전경을 확인하세요.</span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenRoadview}
          disabled={!selectedHasCoord}
          title={selectedHasCoord ? '카카오 로드뷰로 외부 전경 보기' : '좌표를 찾지 못했어요'}
        >
          <Icon name="map-pin" size={15} />
          로드뷰 보기
        </button>
      </div>
    </div>
  );
}
