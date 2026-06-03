import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CustomOverlayMap,
  Map as KakaoMapView,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { Vacancy } from '../../../api';
import { Icon } from '../../../shared/Icon';
import { compactText, vacancyPrimaryPrice, vacancyTitle } from '../model';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const DISTRICT_CLUSTER_LEVEL = 8;
const AREA_CLUSTER_LEVEL = 6;
const OVERVIEW_LEVEL = 9;
const EXPANDED_OVERVIEW_LEVEL = 8;
const AREA_LEVEL = 5;

type VacancyMapPanelProps = {
  items: Vacancy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
};

type VacancyWithCoordinate = Vacancy & { latitude: number; longitude: number };

type VacancyPoint = {
  item: VacancyWithCoordinate;
  score: number;
};

type AreaCluster = {
  areaId: string;
  label: string;
  districtLabel: string;
  count: number;
  averageScore: number;
  center: { lat: number; lng: number };
  topVacancy: VacancyWithCoordinate;
};

type DistrictCluster = {
  districtKey: string;
  label: string;
  count: number;
  areaCount: number;
  averageScore: number;
  center: { lat: number; lng: number };
  topVacancy: VacancyWithCoordinate;
};

type MapViewport = {
  center: { lat: number; lng: number };
  level: number;
};

export function VacancyMapPanel({ items, selectedId, onSelect, loading = false }: VacancyMapPanelProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });
  const [focusedAreaId, setFocusedAreaId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const pendingViewportRef = useRef<MapViewport | null>(null);
  const [, refreshOverlayPortal] = useState(0);

  const points = useMemo(() => {
    return items
      .filter(hasCoordinate)
      .map(item => ({
        item,
        score: Number(item.survivalScore ?? 0),
      }));
  }, [items]);
  const resultSetKey = useMemo(() => {
    return points
      .map(point => `${point.item.id}:${point.item.latitude.toFixed(6)},${point.item.longitude.toFixed(6)}`)
      .join('|');
  }, [points]);

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
  const districtClusters = useMemo(() => buildDistrictClusters(areaClusters), [areaClusters]);
  const overviewCenter = areaClusters.length > 1 ? SEOUL_CENTER : center;
  const overviewLevel = areaClusters.length === 1 ? AREA_LEVEL : OVERVIEW_LEVEL;
  const [mapCenter, setMapCenter] = useState(overviewCenter);
  const [mapLevel, setMapLevel] = useState(overviewLevel);

  useEffect(() => {
    pendingViewportRef.current = null;
    setFocusedAreaId(null);
    setMapCenter(overviewCenter);
    setMapLevel(overviewLevel);

    const map = mapRef.current;
    if (!map || !points.length) return;

    const applyOverview = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      currentMap.relayout();
      currentMap.setLevel(overviewLevel);
      currentMap.setCenter(new kakao.maps.LatLng(overviewCenter.lat, overviewCenter.lng));
      refreshOverlayPortal(version => version + 1);
    };

    const frame = window.requestAnimationFrame(applyOverview);
    const timer = window.setTimeout(applyOverview, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [overviewCenter, overviewLevel, points.length, resultSetKey]);

  const focusedCluster = areaClusters.find(cluster => cluster.areaId === focusedAreaId) ?? null;
  const visiblePoints = focusedCluster
    ? points.filter(point => point.item.areaId === focusedCluster.areaId)
    : points;
  const showDistrictClusters = !focusedCluster && districtClusters.length > 1 && mapLevel >= DISTRICT_CLUSTER_LEVEL;
  const showAreaClusters = !focusedCluster
    && !showDistrictClusters
    && areaClusters.length > 1
    && (mapLevel >= AREA_CLUSTER_LEVEL || points.length > 140);

  useEffect(() => {
    const firstTick = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      refreshOverlayPortal(version => version + 1);
    }, 0);
    const secondTick = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      refreshOverlayPortal(version => version + 1);
    }, 80);
    return () => {
      window.clearTimeout(firstTick);
      window.clearTimeout(secondTick);
    };
  }, [areaClusters.length, districtClusters.length, expanded, focusedCluster?.areaId, showAreaClusters, showDistrictClusters, visiblePoints.length]);

  const selectDistrict = (cluster: DistrictCluster) => {
    setFocusedAreaId(null);
    setMapCenter(cluster.center);
    setMapLevel(AREA_CLUSTER_LEVEL);
    onSelect(cluster.topVacancy.id);
  };

  const selectCluster = (cluster: AreaCluster) => {
    setFocusedAreaId(cluster.areaId);
    setMapCenter(cluster.center);
    setMapLevel(AREA_LEVEL);
    onSelect(cluster.topVacancy.id);
  };

  const resetOverview = () => {
    setFocusedAreaId(null);
    setMapCenter(overviewCenter);
    setMapLevel(overviewLevel);
  };

  const handleZoomChanged = (map: kakao.maps.Map) => {
    syncViewport(map);
    const nextLevel = map.getLevel();
    setMapLevel(currentLevel => currentLevel === nextLevel ? currentLevel : nextLevel);
    if (focusedAreaId && nextLevel >= AREA_CLUSTER_LEVEL + 1) {
      setFocusedAreaId(null);
    }
  };

  const syncViewport = useCallback((map: kakao.maps.Map) => {
    const currentCenter = map.getCenter();
    const nextCenter = {
      lat: currentCenter.getLat(),
      lng: currentCenter.getLng(),
    };
    const nextLevel = map.getLevel();
    setMapCenter(current =>
      nearlySameCoordinate(current, nextCenter) ? current : nextCenter,
    );
    setMapLevel(current => current === nextLevel ? current : nextLevel);
  }, []);

  const handleMapCreate = useCallback((map: kakao.maps.Map) => {
    mapRef.current = map;
  }, []);

  const setExpandedWithPersistedFocus = useCallback((nextExpanded: boolean) => {
    const currentViewport = mapRef.current
      ? readMapViewport(mapRef.current)
      : { center: mapCenter, level: mapLevel };
    const nextViewport = {
      center: currentViewport.center,
      level: currentViewport.level,
    };

    if (!expanded && nextExpanded && areaClusters.length > 1 && !focusedAreaId && currentViewport.level >= OVERVIEW_LEVEL) {
      nextViewport.level = EXPANDED_OVERVIEW_LEVEL;
    }
    if (expanded && !nextExpanded && areaClusters.length > 1 && !focusedAreaId && currentViewport.level === EXPANDED_OVERVIEW_LEVEL) {
      nextViewport.level = OVERVIEW_LEVEL;
    }

    pendingViewportRef.current = nextViewport;
    setMapCenter(nextViewport.center);
    setMapLevel(nextViewport.level);
    setExpanded(nextExpanded);
  }, [areaClusters.length, expanded, focusedAreaId, mapCenter, mapLevel]);

  const toggleExpanded = () => {
    setExpandedWithPersistedFocus(!expanded);
  };

  useEffect(() => {
    const viewport = pendingViewportRef.current;
    const map = mapRef.current;
    if (!viewport || !map) return;

    const restore = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      restoreMapViewport(currentMap, viewport);
      setMapCenter(viewport.center);
      setMapLevel(viewport.level);
      refreshOverlayPortal(version => version + 1);
    };

    const frame = window.requestAnimationFrame(restore);
    const timer = window.setTimeout(() => {
      restore();
      pendingViewportRef.current = null;
    }, 90);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setExpandedWithPersistedFocus(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, setExpandedWithPersistedFocus]);

  return (
    <div className={`vacancy-map-panel ${expanded ? 'is-expanded' : ''}`}>
      <div className="vacancy-list-head">
        <div>
          <span className="vacancy-panel-eyebrow">Map</span>
          <h2>{focusedCluster ? `${focusedCluster.label} 공실` : '서울 공실 분포'}</h2>
        </div>
        <span className="vacancy-map-count">
          {loading && points.length === 0 ? '지도 데이터 로딩 중' : `${districtClusters.length}개 구 · ${areaClusters.length}개 지역 · ${points.length}개 핀`}
        </span>
      </div>
      <div className="vacancy-map-toolbar">
        <div>
          <b>{showDistrictClusters ? '구 클러스터' : showAreaClusters ? '행정동 클러스터' : focusedCluster ? `${focusedCluster.label} 확대` : '개별 공실'}</b>
          <span>{showDistrictClusters ? '확대하면 행정동 단위로 나뉩니다' : '확대하면 개별 공실로 나뉩니다'}</span>
        </div>
        <div className="vacancy-map-toolbar-actions">
          {focusedCluster && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetOverview}>
              서울 전체
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm vacancy-map-expand-btn"
            onClick={toggleExpanded}
            title={expanded ? '지도 축소' : '지도 확대'}
          >
            <Icon name={expanded ? 'minimize' : 'maximize'} size={13} />
            {expanded ? '축소' : '확대'}
          </button>
        </div>
      </div>
      <div className="vacancy-map-canvas vacancy-kakao-canvas" aria-label="공실 위치 분포">
        {loading && points.length === 0 && (
          <div className="vacancy-map-empty vacancy-map-loading">
            <span className="vacancy-map-spinner" />
            <b>공실 위치를 불러오는 중</b>
          </div>
        )}
        {sdkLoading && (
          <div className="vacancy-map-empty">카카오 지도를 불러오는 중</div>
        )}
        {sdkError && (
          <div className="vacancy-map-empty">카카오 지도를 불러오지 못했어요</div>
        )}
        {!loading && !sdkLoading && !sdkError && points.length === 0 && (
          <div className="vacancy-map-empty">좌표 데이터 없음</div>
        )}
        {!sdkLoading && !sdkError && points.length > 0 && (
          <KakaoMapView
            key={`${resultSetKey}:${showDistrictClusters ? 'district-clusters' : showAreaClusters ? 'area-clusters' : `area-vacancies-${focusedCluster?.areaId ?? 'all'}`}`}
            center={mapCenter}
            isPanto
            level={mapLevel}
            style={{ width: '100%', height: '100%' }}
            draggable
            zoomable
            onCreate={handleMapCreate}
            onDragEnd={syncViewport}
            onIdle={syncViewport}
            onZoomChanged={handleZoomChanged}
          >
            {showDistrictClusters
              ? districtClusters.map(cluster => (
                <CustomOverlayMap
                  key={cluster.districtKey}
                  position={cluster.center}
                  yAnchor={0.5}
                  xAnchor={0.5}
                >
                  <DistrictClusterMarker
                    cluster={cluster}
                    selected={visiblePoints.some(point => point.item.id === selectedId && districtKeyForVacancy(point.item) === cluster.districtKey)}
                    onClick={() => selectDistrict(cluster)}
                  />
                </CustomOverlayMap>
              ))
              : showAreaClusters
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
              : visiblePoints.map(({ item }) => (
                <CustomOverlayMap
                  key={item.id}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  yAnchor={1}
                  xAnchor={0.5}
                >
                  <VacancyMapPin
                    vacancy={item}
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

function DistrictClusterMarker({ cluster, selected, onClick }: {
  cluster: DistrictCluster;
  selected: boolean;
  onClick: () => void;
}) {
  const sizeClass = cluster.count >= 40 ? 'size-lg' : cluster.count >= 18 ? 'size-md' : 'size-sm';
  return (
    <button
      type="button"
      className={`vacancy-area-cluster vacancy-district-cluster ${sizeClass} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      title={`${cluster.label} 공실 ${cluster.count}개`}
    >
      <span className="vacancy-area-cluster-count">{cluster.count}</span>
      <span className="vacancy-area-cluster-label">{cluster.label}</span>
      <em>{cluster.areaCount}개 행정동</em>
    </button>
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
      className={`vacancy-area-cluster ${sizeClass} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      title={`${cluster.label} 공실 ${cluster.count}개`}
    >
      <span className="vacancy-area-cluster-count">{cluster.count}</span>
      <span className="vacancy-area-cluster-label">{cluster.label}</span>
    </button>
  );
}

function priceLabel(vacancy: VacancyWithCoordinate): string {
  const price = vacancyPrimaryPrice(vacancy);
  return `${price.label} ${price.value}${price.unit}`;
}

function VacancyMapPin({ vacancy, selected, onClick }: {
  vacancy: VacancyWithCoordinate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`vacancy-kakao-pin ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      title={vacancyTitle(vacancy)}
    >
      <span className="vacancy-kakao-pin-dot" />
      {selected && (
        <span className="vacancy-kakao-callout">
          <b>{vacancyTitle(vacancy)}</b>
          <em>{priceLabel(vacancy)}</em>
        </span>
      )}
    </button>
  );
}

function buildDistrictClusters(areaClusters: AreaCluster[]): DistrictCluster[] {
  const byDistrict = new Map<string, AreaCluster[]>();
  areaClusters.forEach(cluster => {
    const key = compactText(cluster.districtLabel) || cluster.areaId.slice(0, 5) || cluster.areaId;
    const list = byDistrict.get(key) ?? [];
    list.push(cluster);
    byDistrict.set(key, list);
  });

  return Array.from(byDistrict.entries())
    .map(([districtKey, clusters]) => {
      const topCluster = clusters.reduce((best, cluster) => cluster.averageScore > best.averageScore ? cluster : best, clusters[0]);
      const sum = clusters.reduce((acc, cluster) => ({
        lat: acc.lat + cluster.center.lat * cluster.count,
        lng: acc.lng + cluster.center.lng * cluster.count,
        score: acc.score + cluster.averageScore * cluster.count,
        count: acc.count + cluster.count,
      }), { lat: 0, lng: 0, score: 0, count: 0 });

      return {
        districtKey,
        label: topCluster.districtLabel,
        count: sum.count,
        areaCount: clusters.length,
        averageScore: sum.score / sum.count,
        center: {
          lat: sum.lat / sum.count,
          lng: sum.lng / sum.count,
        },
        topVacancy: topCluster.topVacancy,
      };
    })
    .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore);
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
        districtLabel: inferDistrictLabel(areaId, areaPoints.map(point => point.item)),
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

function districtKeyForVacancy(vacancy: Vacancy): string {
  return compactText(vacancy.district)
    || compactText(vacancy.areaName)?.split(' ').find(part => part.endsWith('구'))
    || vacancy.areaId.slice(0, 5)
    || vacancy.areaId;
}

function inferDistrictLabel(areaId: string, vacancies: Vacancy[]): string {
  for (const vacancy of vacancies) {
    const label = compactText(vacancy.district)
      || compactText(vacancy.areaName)?.split(' ').find(part => part.endsWith('구'));
    if (label) return label;
  }
  return `지역 ${areaId.slice(0, 5)}`;
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

function nearlySameCoordinate(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

function readMapViewport(map: kakao.maps.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: {
      lat: center.getLat(),
      lng: center.getLng(),
    },
    level: map.getLevel(),
  };
}

function restoreMapViewport(map: kakao.maps.Map, viewport: MapViewport): void {
  map.relayout();
  map.setLevel(viewport.level);
  map.setCenter(new kakao.maps.LatLng(viewport.center.lat, viewport.center.lng));
}

function hasCoordinate(item: Vacancy): item is VacancyWithCoordinate {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
}
