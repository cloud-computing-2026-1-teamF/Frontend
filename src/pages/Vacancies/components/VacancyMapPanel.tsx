import { useMemo } from 'react';
import {
  CustomOverlayMap,
  Map as KakaoMapView,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Vacancy } from '../../../api';
import { formatManWon, formatScore, scoreClass } from '../model';

type VacancyMapPanelProps = {
  items: Vacancy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VacancyMapPanel({ items, selectedId, onSelect }: VacancyMapPanelProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  const points = useMemo(() => {
    return items
      .filter((item): item is Vacancy & { latitude: number; longitude: number } =>
        typeof item.latitude === 'number' && typeof item.longitude === 'number')
      .map(item => ({
        item,
        score: Number(item.survivalScore ?? 0),
      }));
  }, [items]);

  const center = useMemo(() => {
    if (!points.length) return { lat: 37.5665, lng: 126.9780 };
    const sum = points.reduce((acc, point) => ({
      lat: acc.lat + point.item.latitude,
      lng: acc.lng + point.item.longitude,
    }), { lat: 0, lng: 0 });
    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length,
    };
  }, [points]);

  const level = points.length >= 10 ? 9 : points.length >= 5 ? 7 : 5;

  return (
    <div className="vacancy-map-panel">
      <div className="vacancy-list-head">
        <div>
          <span className="vacancy-panel-eyebrow">Map</span>
          <h2>위치 분포</h2>
        </div>
        <span className="vacancy-map-count">{points.length} pins</span>
      </div>
      <div className="vacancy-map-canvas vacancy-kakao-canvas" aria-label="공실 위치 분포">
        {sdkLoading && (
          <div className="vacancy-map-empty">카카오 지도를 불러오는 중</div>
        )}
        {sdkError && (
          <div className="vacancy-map-empty">카카오 지도를 불러오지 못했어요</div>
        )}
        {points.length === 0 && (
          <div className="vacancy-map-empty">좌표 데이터 없음</div>
        )}
        {!sdkLoading && !sdkError && points.length > 0 && (
          <KakaoMapView
            center={center}
            isPanto
            level={level}
            style={{ width: '100%', height: '100%' }}
            draggable
            zoomable
          >
            {points.map(({ item, score }) => (
              <CustomOverlayMap
                key={item.id}
                position={{ lat: item.latitude, lng: item.longitude }}
                yAnchor={1}
                xAnchor={0.5}
              >
                <VacancyMapPin
                  vacancy={item}
                  score={score}
                  selected={item.id === selectedId}
                  onClick={() => onSelect(item.id)}
                />
              </CustomOverlayMap>
            ))}
          </KakaoMapView>
        )}
      </div>
    </div>
  );
}

function VacancyMapPin({ vacancy, score, selected, onClick }: {
  vacancy: Vacancy;
  score: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`vacancy-kakao-pin ${selected ? 'is-selected' : ''} ${scoreClass(score)}`}
      onClick={onClick}
      title={vacancy.businessSubCategoryName ?? vacancy.id}
    >
      <span className="vacancy-kakao-pin-score">{Math.round(score)}</span>
      {selected && (
        <span className="vacancy-kakao-callout">
          <b>{vacancy.businessSubCategoryName ?? vacancy.id}</b>
          <em>점수 {formatScore(score)} · 월세 {formatManWon(vacancy.monthlyRent)}만</em>
        </span>
      )}
    </button>
  );
}
