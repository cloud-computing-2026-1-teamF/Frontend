import { useMemo } from 'react';
import type { Vacancy } from '../../../api';
import { percent, scoreClass } from '../model';

type VacancyMapPanelProps = {
  items: Vacancy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VacancyMapPanel({ items, selectedId, onSelect }: VacancyMapPanelProps) {
  const points = useMemo(() => {
    return items
      .filter((item): item is Vacancy & { latitude: number; longitude: number } =>
        typeof item.latitude === 'number' && typeof item.longitude === 'number')
      .map(item => ({
        item,
        score: Number(item.survivalScore ?? 0),
      }));
  }, [items]);

  const bounds = useMemo(() => {
    const lats = points.map(point => point.item.latitude);
    const lngs = points.map(point => point.item.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [points]);

  return (
    <div className="vacancy-map-panel">
      <div className="vacancy-list-head">
        <div>
          <span className="vacancy-panel-eyebrow">Map</span>
          <h2>위치 분포</h2>
        </div>
        <span className="vacancy-map-count">{points.length} pins</span>
      </div>
      <div className="vacancy-map-canvas" aria-label="공실 위치 분포">
        <div className="vacancy-map-grid" />
        <div className="vacancy-map-axis x" />
        <div className="vacancy-map-axis y" />
        {points.length === 0 && (
          <div className="vacancy-map-empty">좌표 데이터 없음</div>
        )}
        {points.map(({ item, score }) => {
          const x = percent(item.longitude, bounds.minLng, bounds.maxLng, 8, 92);
          const y = 100 - percent(item.latitude, bounds.minLat, bounds.maxLat, 10, 90);
          return (
            <button
              key={item.id}
              type="button"
              className={`vacancy-map-dot ${item.id === selectedId ? 'is-selected' : ''} ${scoreClass(score)}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => onSelect(item.id)}
              title={item.businessSubCategoryName ?? item.id}
            >
              <span>{Math.round(score)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

