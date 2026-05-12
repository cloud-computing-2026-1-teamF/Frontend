import { useEffect, useMemo, useState } from 'react';
import {
  CustomOverlayMap,
  Map as KakaoMapView,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Vacancy } from '../../../api';
import { compactText, formatManWon, formatScore, scoreClass, vacancyTitle } from '../model';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const CLUSTER_LEVEL = 7;
const OVERVIEW_LEVEL = 9;
const AREA_LEVEL = 5;

type VacancyMapPanelProps = {
  items: Vacancy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type VacancyWithCoordinate = Vacancy & { latitude: number; longitude: number };

type VacancyPoint = {
  item: VacancyWithCoordinate;
  score: number;
};

type AreaCluster = {
  areaId: string;
  label: string;
  count: number;
  averageScore: number;
  center: { lat: number; lng: number };
  topVacancy: VacancyWithCoordinate;
};

export function VacancyMapPanel({ items, selectedId, onSelect }: VacancyMapPanelProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });
  const [focusedAreaId, setFocusedAreaId] = useState<string | null>(null);
  const [, refreshOverlayPortal] = useState(0);

  const points = useMemo(() => {
    return items
      .filter(hasCoordinate)
      .map(item => ({
        item,
        score: Number(item.survivalScore ?? 0),
      }));
  }, [items]);

  const center = useMemo(() => {
    if (!points.length) return SEOUL_CENTER;
    const sum = points.reduce((acc, point) => ({
      lat: acc.lat + point.item.latitude,
      lng: acc.lng + point.item.longitude,
    }), { lat: 0, lng: 0 });
    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length,
    };
  }, [points]);

  const areaClusters = useMemo(() => buildAreaClusters(points), [points]);
  const overviewLevel = areaClusters.length > 1 ? OVERVIEW_LEVEL : AREA_LEVEL;
  const [mapCenter, setMapCenter] = useState(center);
  const [mapLevel, setMapLevel] = useState(overviewLevel);

  useEffect(() => {
    setFocusedAreaId(null);
    setMapCenter(center);
    setMapLevel(overviewLevel);
  }, [center, overviewLevel]);

  const focusedCluster = areaClusters.find(cluster => cluster.areaId === focusedAreaId) ?? null;
  const visiblePoints = focusedCluster
    ? points.filter(point => point.item.areaId === focusedCluster.areaId)
    : points;
  const showAreaClusters = !focusedCluster && areaClusters.length > 1 && (mapLevel >= CLUSTER_LEVEL || points.length > 140);

  useEffect(() => {
    const firstTick = window.setTimeout(() => {
      refreshOverlayPortal(version => version + 1);
    }, 0);
    const secondTick = window.setTimeout(() => {
      refreshOverlayPortal(version => version + 1);
    }, 80);
    return () => {
      window.clearTimeout(firstTick);
      window.clearTimeout(secondTick);
    };
  }, [areaClusters.length, focusedCluster?.areaId, showAreaClusters, visiblePoints.length]);

  const selectCluster = (cluster: AreaCluster) => {
    setFocusedAreaId(cluster.areaId);
    setMapCenter(cluster.center);
    setMapLevel(AREA_LEVEL);
    onSelect(cluster.topVacancy.id);
  };

  const resetOverview = () => {
    setFocusedAreaId(null);
    setMapCenter(center);
    setMapLevel(overviewLevel);
  };

  const handleZoomChanged = (map: kakao.maps.Map) => {
    const nextLevel = map.getLevel();
    setMapLevel(currentLevel => currentLevel === nextLevel ? currentLevel : nextLevel);
    if (focusedAreaId && nextLevel >= CLUSTER_LEVEL + 1) {
      setFocusedAreaId(null);
    }
  };

  return (
    <div className="vacancy-map-panel">
      <div className="vacancy-list-head">
        <div>
          <span className="vacancy-panel-eyebrow">Map</span>
          <h2>{focusedCluster ? `${focusedCluster.label} 공실` : '서울 공실 분포'}</h2>
        </div>
        <span className="vacancy-map-count">{areaClusters.length} areas · {points.length} pins</span>
      </div>
      {areaClusters.length > 1 && (
        <div className="vacancy-map-toolbar">
          <div>
            <b>{showAreaClusters ? '행정동 클러스터' : focusedCluster ? `${focusedCluster.label} 확대` : '개별 공실'}</b>
            <span>평균 점수 기준으로 색상이 구분됩니다</span>
          </div>
          {focusedCluster && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetOverview}>
              서울 전체
            </button>
          )}
        </div>
      )}
      <div className="vacancy-map-canvas vacancy-kakao-canvas" aria-label="공실 위치 분포">
        {sdkLoading && (
          <div className="vacancy-map-empty">카카오 지도를 불러오는 중</div>
        )}
        {sdkError && (
          <div className="vacancy-map-empty">카카오 지도를 불러오지 못했어요</div>
        )}
        {!sdkLoading && !sdkError && points.length === 0 && (
          <div className="vacancy-map-empty">좌표 데이터 없음</div>
        )}
        {!sdkLoading && !sdkError && points.length > 0 && (
          <KakaoMapView
            key={showAreaClusters ? 'area-clusters' : `area-vacancies-${focusedCluster?.areaId ?? 'all'}`}
            center={mapCenter}
            isPanto
            level={mapLevel}
            style={{ width: '100%', height: '100%' }}
            draggable
            zoomable
            onZoomChanged={handleZoomChanged}
          >
            {showAreaClusters
              ? areaClusters.map(cluster => (
                <CustomOverlayMap
                  key={cluster.areaId}
                  position={cluster.center}
                  yAnchor={0.5}
                  xAnchor={0.5}
                >
                  <AreaClusterMarker
                    cluster={cluster}
                    selected={visiblePoints.some(point => point.item.id === selectedId && point.item.areaId === cluster.areaId)}
                    onClick={() => selectCluster(cluster)}
                  />
                </CustomOverlayMap>
              ))
              : visiblePoints.map(({ item, score }) => (
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

function AreaClusterMarker({ cluster, selected, onClick }: {
  cluster: AreaCluster;
  selected: boolean;
  onClick: () => void;
}) {
  const sizeClass = cluster.count >= 8 ? 'size-lg' : cluster.count >= 4 ? 'size-md' : 'size-sm';
  return (
    <button
      type="button"
      className={`vacancy-area-cluster ${sizeClass} ${selected ? 'is-selected' : ''} ${scoreClass(cluster.averageScore)}`}
      onClick={onClick}
      title={`${cluster.label} 공실 ${cluster.count}개`}
    >
      <span className="vacancy-area-cluster-count">{cluster.count}</span>
      <span className="vacancy-area-cluster-label">{cluster.label}</span>
      <em>평균 {formatScore(cluster.averageScore)}</em>
    </button>
  );
}

function VacancyMapPin({ vacancy, score, selected, onClick }: {
  vacancy: VacancyWithCoordinate;
  score: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`vacancy-kakao-pin ${selected ? 'is-selected' : ''} ${scoreClass(score)}`}
      onClick={onClick}
      title={vacancyTitle(vacancy)}
    >
      <span className="vacancy-kakao-pin-score">{Math.round(score)}</span>
      {selected && (
        <span className="vacancy-kakao-callout">
          <b>{vacancyTitle(vacancy)}</b>
          <em>점수 {formatScore(score)} · 월세 {formatManWon(vacancy.monthlyRent)}만</em>
        </span>
      )}
    </button>
  );
}

function buildAreaClusters(points: VacancyPoint[]): AreaCluster[] {
  const byArea = new Map<string, VacancyPoint[]>();
  points.forEach(point => {
    const list = byArea.get(point.item.areaId) ?? [];
    list.push(point);
    byArea.set(point.item.areaId, list);
  });

  return Array.from(byArea.entries())
    .map(([areaId, areaPoints]) => {
      const topPoint = areaPoints.reduce((best, point) => point.score > best.score ? point : best, areaPoints[0]);
      const sum = areaPoints.reduce((acc, point) => ({
        lat: acc.lat + point.item.latitude,
        lng: acc.lng + point.item.longitude,
        score: acc.score + point.score,
      }), { lat: 0, lng: 0, score: 0 });

      return {
        areaId,
        label: inferAreaLabel(areaId, areaPoints.map(point => point.item)),
        count: areaPoints.length,
        averageScore: sum.score / areaPoints.length,
        center: {
          lat: sum.lat / areaPoints.length,
          lng: sum.lng / areaPoints.length,
        },
        topVacancy: topPoint.item,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);
}

function inferAreaLabel(areaId: string, vacancies: Vacancy[]): string {
  for (const vacancy of vacancies) {
    const areaNameParts = compactText(vacancy.areaName)?.split(' ') ?? [];
    const label = compactText(vacancy.dong)
      || areaNameParts[areaNameParts.length - 1]
      || compactText(vacancy.district);
    if (label) return label;
    const match = vacancy.businessSubCategoryName?.match(/^([가-힣0-9]+동)/);
    if (match?.[1]) return match[1];
  }
  return `행정동 ${areaId}`;
}

function hasCoordinate(item: Vacancy): item is VacancyWithCoordinate {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
}
