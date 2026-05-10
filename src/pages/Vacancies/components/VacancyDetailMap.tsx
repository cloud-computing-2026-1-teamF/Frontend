import { useMemo } from 'react';
import {
  CustomOverlayMap,
  Map as KakaoMapView,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Vacancy } from '../../../api';
import { formatManWon, formatScore, scoreClass } from '../model';

type VacancyDetailMapProps = {
  vacancies: Vacancy[];
  selectedId?: string | null;
  height?: number;
  onSelect?: (id: string) => void;
};

export function VacancyDetailMap({ vacancies, selectedId, height = 360, onSelect }: VacancyDetailMapProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  const points = useMemo(() => vacancies.filter(hasCoordinate), [vacancies]);
  const center = useMemo(() => {
    const selected = points.find(point => point.id === selectedId);
    if (selected) return { lat: selected.latitude, lng: selected.longitude };
    if (!points.length) return { lat: 37.5665, lng: 126.9780 };
    const sum = points.reduce((acc, point) => ({
      lat: acc.lat + point.latitude,
      lng: acc.lng + point.longitude,
    }), { lat: 0, lng: 0 });
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
  }, [points, selectedId]);

  const level = points.length >= 2 ? 9 : 4;

  return (
    <div className="vf-map" style={{ height }}>
      {sdkLoading && <div className="vf-map-state">카카오 지도를 불러오는 중</div>}
      {sdkError && <div className="vf-map-state">카카오 지도를 불러오지 못했어요</div>}
      {!sdkLoading && !sdkError && points.length === 0 && (
        <div className="vf-map-state">좌표 데이터 없음</div>
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
          {points.map(vacancy => (
            <CustomOverlayMap
              key={vacancy.id}
              position={{ lat: vacancy.latitude, lng: vacancy.longitude }}
              yAnchor={1}
              xAnchor={0.5}
            >
              <button
                type="button"
                className={`vf-map-pin ${vacancy.id === selectedId ? 'is-selected' : ''} ${scoreClass(vacancy.survivalScore)}`}
                onClick={() => onSelect?.(vacancy.id)}
                title={vacancy.businessSubCategoryName ?? vacancy.id}
              >
                <span>{Math.round(Number(vacancy.survivalScore ?? 0))}</span>
                {vacancy.id === selectedId && (
                  <em>
                    <b>{vacancy.businessSubCategoryName ?? vacancy.id}</b>
                    점수 {formatScore(vacancy.survivalScore)} · 월세 {formatManWon(vacancy.monthlyRent)}만
                  </em>
                )}
              </button>
            </CustomOverlayMap>
          ))}
        </KakaoMapView>
      )}
    </div>
  );
}

type VacancyWithCoordinate = Vacancy & { latitude: number; longitude: number };

function hasCoordinate(vacancy: Vacancy): vacancy is VacancyWithCoordinate {
  return typeof vacancy.latitude === 'number' && typeof vacancy.longitude === 'number';
}
